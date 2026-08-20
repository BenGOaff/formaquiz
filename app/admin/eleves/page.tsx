import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildSales, type EventRow } from "@/lib/checkout/sales";
import { readOwnerPaypal } from "@/lib/checkout/ownerAccount";
import { getOwnerPaypalOrder } from "@/lib/checkout/paypalOwner";
import { VentesOrphelines } from "./VentesOrphelines";
import { StudentsTable, type StudentRow } from "@/components/admin/StudentsTable";

export const dynamic = "force-dynamic";

export default async function AdminElevesPage() {
  // Comptes auth (page 1, jusqu'à 1000 ; pagination à ajouter si besoin).
  // On récupère aussi last_sign_in_at (dernière connexion) pour le suivi.
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = (usersData?.users ?? []) as Array<{
    id: string;
    email?: string | null;
    created_at: string;
    last_sign_in_at?: string | null;
  }>;

  const [
    { data: enrollments },
    { data: progress },
    { data: profiles },
    { count: totalDays },
    { data: conversions },
    { data: evenementsPaiement },
  ] = await Promise.all([
    supabaseAdmin.from("enrollments").select("user_id, status, granted_at"),
    supabaseAdmin.from("progress").select("user_id, status"),
    supabaseAdmin.from("profiles").select("id, full_name, sio_affiliate_id"),
    // Nombre de jours publiés = dénominateur de la progression.
    supabaseAdmin.from("days").select("id", { count: "exact", head: true }).eq("status", "published"),
    // Personnes amenées via le lien affilié de chaque élève (conversions).
    supabaseAdmin.from("affiliate_conversions").select("sa, email"),
    // LES VENTES ENCAISSEES PAR NOUS, pour les poser sur la fiche de la
    // personne. Bene, 20 aout : "tu peux pas centraliser ? Je vois les
    // eleves, leurs infos + le bouton rembourser ?" Elle ne pense pas en
    // "ventes", elle pense en PERSONNES.
    supabaseAdmin
      .from("webhook_logs")
      .select("source, event_type, payload, created_at")
      .in("source", ["stripe", "paypal"])
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const enrollByUser = new Map((enrollments ?? []).map((e) => [e.user_id as string, e]));
  const nameByUser = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string | null]));
  const saByUser = new Map(
    (profiles ?? [])
      .filter((p) => (p.sio_affiliate_id as string | null)?.trim())
      .map((p) => [p.id as string, (p.sio_affiliate_id as string).trim()]),
  );
  const completedByUser = new Map<string, number>();
  for (const p of progress ?? []) {
    if (p.status === "completed") {
      completedByUser.set(p.user_id as string, (completedByUser.get(p.user_id as string) ?? 0) + 1);
    }
  }

  // Compte d'invités affiliés par sa : personnes DISTINCTES (email) amenées.
  const invitedBySa = new Map<string, Set<string>>();
  for (const c of conversions ?? []) {
    const sa = String((c as { sa?: string | null }).sa ?? "").trim();
    const email = String((c as { email?: string | null }).email ?? "").trim().toLowerCase();
    if (!sa || !email) continue;
    if (!invitedBySa.has(sa)) invitedBySa.set(sa, new Set());
    invitedBySa.get(sa)!.add(email);
  }

  // ── LES VENTES, RAPPROCHEES DES PERSONNES ──
  //
  // La cle du rapprochement est l'EMAIL, en minuscules : c'est la seule
  // chose que Stripe, PayPal et notre base ont en commun.
  //
  // On complete les ventes PayPal au passage : leur evenement ne porte
  // pas l'adresse de l'acheteur, elle vit sur la COMMANDE. Sans ca, une
  // vente PayPal ne se rattacherait a personne et tomberait a tort dans
  // le bloc des ventes sans eleve.
  const ventes = buildSales((evenementsPaiement ?? []) as EventRow[]);
  const comptePaypal = readOwnerPaypal(process.env);
  if (comptePaypal) {
    await Promise.all(
      ventes
        .filter((v) => v.provider === "paypal" && !v.email)
        .slice(0, 25)
        .map(async (v) => {
          const commande = await getOwnerPaypalOrder({ compte: comptePaypal, orderId: v.ref });
          if (commande?.email) v.email = commande.email;
        }),
    );
  }

  // La vente la PLUS RECENTE gagne : quelqu'un qui rachete apres un
  // remboursement doit voir son achat en cours, pas l'ancien. `buildSales`
  // rend deja la liste du plus recent au plus ancien.
  const venteParEmail = new Map<string, (typeof ventes)[number]>();
  for (const v of ventes) {
    const cle = (v.email ?? "").trim().toLowerCase();
    if (cle && !venteParEmail.has(cle)) venteParEmail.set(cle, v);
  }

  const rows: StudentRow[] = users
    .map((u) => {
      const sa = saByUser.get(u.id) ?? null;
      return {
        userId: u.id,
        email: u.email ?? "(sans email)",
        fullName: nameByUser.get(u.id) ?? null,
        status: (enrollByUser.get(u.id)?.status as "active" | "revoked" | undefined) ?? null,
        completedDays: completedByUser.get(u.id) ?? 0,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        isAffiliate: !!sa,
        invitedCount: sa ? invitedBySa.get(sa)?.size ?? 0 : 0,
        payment: venteParEmail.get((u.email ?? "").trim().toLowerCase()) ?? null,
      };
    })
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  // ── L'ARGENT ENTRE SANS QUE PERSONNE N'APPARAISSE : ON LE CRIE ──
  //
  // Une vente qui ne se rattache a aucun compte, c'est quelqu'un qui a
  // paye et qui n'a peut-etre pas ses acces. C'est le drame Ivan, et le
  // pire serait de l'ecarter en silence pour garder un tableau propre.
  // Le bloc n'apparait QUE s'il y a quelque chose dedans.
  const emailsConnus = new Set(
    users.map((u) => (u.email ?? "").trim().toLowerCase()).filter(Boolean),
  );
  const orphelines = ventes.filter(
    (v) => !v.email || !emailsConnus.has(v.email.trim().toLowerCase()),
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Tes élèves</h1>
        <p className="text-sm text-muted-foreground">
          Dernière connexion, progression, accès et affiliation, en un clin d'oeil.
          Gestion manuelle (remboursement, offre directe) à droite. Ces données restent privées.
        </p>
      </header>
      <VentesOrphelines ventes={orphelines} />
      <StudentsTable initialRows={rows} totalDays={totalDays ?? 7} />
    </div>
  );
}
