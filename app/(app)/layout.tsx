import { AppHeader } from "@/components/AppHeader";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { isAdminEmail } from "@/lib/adminEmails";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Statut admin calculé côté serveur (jamais déduit du seul front).
  // Sert uniquement à afficher l'onglet Admin dans le menu ; l'accès
  // réel reste protégé par le middleware et requireAdmin.
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <AppHeader isAdmin={isAdmin} />
      <main className="container flex-1 py-8">{children}</main>
    </div>
  );
}
