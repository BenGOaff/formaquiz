// middleware.ts
// Protection auth de L'Atelier du Quiz. Rafraîchit la session Supabase et garde
// les routes membre + admin. Mono-langue, donc pas de logique de locale
// (contrairement à Tiquiz).

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdminEmail } from "@/lib/adminEmails";
import { salesSlugForHost } from "@/lib/sales/salesHosts";
import { readSa, SA_COOKIE, SA_MAX_AGE_SECONDS, SA_PARAM } from "@/lib/affiliate/sa";

// Routes accessibles sans être connecté.
const PUBLIC_PREFIXES = [
  "/login",
  "/auth",
  "/bienvenue",
  "/nouveau-mot-de-passe",
  "/mot-de-passe-oublie",
  "/api/systeme-io",
  "/api/auth",
  "/api/cron",
  // Tracking affilié : webhooks Systeme.io + tracker JS, appelés sans session.
  "/api/affiliate",
  // Pages de vente servies par nous. Elles sont PUBLIQUES par nature :
  // un visiteur qui découvre l'Atelier n'a évidemment pas de session.
  // Sans cette ligne, le middleware le renverrait vers /login, ce qui
  // transformerait une page de vente en cul-de-sac.
  // La porte de l'aperçu n'est pas ici : c'est la clé SALES_PREVIEW_TOKEN
  // dans l'URL, vérifiée par la route elle-même.
  "/apercu",
  "/v",
  // Le bon de commande et son retour de paiement. Publics par la même
  // évidence : quelqu'un qui achète l'Atelier n'a pas encore de compte,
  // c'est justement l'achat qui le lui crée. Sans cette ligne, le
  // middleware l'enverrait se connecter avant de pouvoir payer.
  // Ils restent fermés par la clé SALES_PREVIEW_TOKEN tant que le
  // chantier n'est pas ouvert, et la page elle-même répond 404 sans elle.
  "/commande",
  "/api/commande",
];

// Routes réservées à l'élève connecté (enrollment vérifié plus loin
// dans les pages elles-mêmes / la RLS).
const PROTECTED_PREFIXES = ["/dashboard", "/jour", "/carnet", "/profil", "/diagnostic", "/funnel", "/affiliation", "/api/me", "/api/days", "/api/integrations"];

// Routes réservées à l'admin.
const ADMIN_PREFIXES = ["/admin", "/api/admin"];

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── LE `?sa=` D'UNE AFFILIÉE, RANGÉ DÈS LA PREMIÈRE PAGE ──
  //
  // Sur un tunnel Systeme.io, c'était leur page qui le captait. Sur notre
  // domaine, personne ne le fait : sans cette ligne, une affiliée qui
  // envoie du monde sur atelierduquiz.fr n'est payée sur RIEN, et le
  // symptôme est le pire qui soit puisqu'il n'y en a aucun. Tout marche,
  // l'argent rentre, et la commission n'existe pas.
  //
  // On le pose sur TOUTES les réponses, y compris la réécriture de la
  // page de vente : c'est justement la page où le lien atterrit.
  const sa = readSa(req.nextUrl.searchParams.get(SA_PARAM));
  const poseSa = (res: NextResponse): NextResponse => {
    if (sa) {
      res.cookies.set(SA_COOKIE, sa, {
        maxAge: SA_MAX_AGE_SECONDS,
        path: "/",
        sameSite: "lax",
        // Lisible par le bon de commande : c'est LUI qui doit le
        // transmettre à Stripe. `httpOnly` le rendrait invisible au
        // navigateur, donc inutile.
        httpOnly: false,
        secure: req.nextUrl.protocol === "https:",
      });
    }
    return res;
  };

  // Laisse passer les assets et les routes publiques.
  // NOS DOMAINES DE VENTE (atelierduquiz.fr) : la racine sert la page de
  // vente. On REECRIT au lieu de rediriger, pour que l'adresse vue par le
  // visiteur reste atelierduquiz.fr et qu'un lien partage ne fasse pas
  // apparaitre un chemin technique.
  const slugDeVente = salesSlugForHost(req.headers.get("host"));
  if (slugDeVente && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = `/apercu/vente/${slugDeVente}`;
    return poseSa(NextResponse.rewrite(url));
  }

  if (startsWithAny(pathname, PUBLIC_PREFIXES)) {
    return poseSa(NextResponse.next());
  }

  const needsAuth = startsWithAny(pathname, PROTECTED_PREFIXES);
  const needsAdmin = startsWithAny(pathname, ADMIN_PREFIXES);
  if (!needsAuth && !needsAdmin) {
    return poseSa(NextResponse.next());
  }

  // Prépare une réponse mutable pour que Supabase puisse rafraîchir les
  // cookies de session.
  let res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: { headers: req.headers } });
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return poseSa(NextResponse.redirect(loginUrl));
  }

  if (needsAdmin && !isAdminEmail(user.email)) {
    // Un élève ne voit jamais l'admin : on le renvoie à son tableau de bord.
    return poseSa(NextResponse.redirect(new URL("/dashboard", req.url)));
  }

  return poseSa(res);
}

export const config = {
  // On exclut les assets statiques de Next et le favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
