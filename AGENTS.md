# L'Atelier du Quiz : conventions de code (à lire avant de coder)

Espace membre Next.js + Supabase, petit frère de Tiquiz. App séparée,
sur le VPS de Béné. On ne modifie JAMAIS le code de Tiquiz ni Tipote.

> **Vision produit et roadmap V2 : lire `VISION_ET_ROADMAP.md`.** Source de
> vérité des intentions Béné (étoile polaire, 5 chantiers A à E, ordre,
> statut). À relire au début de toute session qui touche au produit.

## Règles non négociables

- **Tutoiement** partout dans l'interface et le contenu.
- **Accents français obligatoires** dans tout contenu user-visible (UI,
  seed, schémas). On écrit "déjà", "accès", "réponse", pas "deja",
  "acces", "reponse". La seule contrainte typographique, c'est le tiret
  long interdit, JAMAIS les accents. Ne jamais retirer un accent "par
  sécurité".
- **Zéro tiret long** (`—` / `–`) dans tout contenu user-visible. Avant
  un commit qui touche au contenu :
  ```bash
  grep -rn "—\|–" app components supabase/seed
  ```
  Doit retourner ZÉRO ligne. Les commentaires de code peuvent en
  contenir (jamais vus par l'élève).
- **Pas de promesse de chiffre**, promesse de système.
- **Ne jamais inventer** d'URL ni de prix : demander à Béné.

## Stack

- Next.js 16.2.3 (App Router, standalone) + React 19. Mono-langue (FR),
  donc PAS de next-intl (contrairement à Tiquiz).
- Supabase (Auth + Postgres + RLS). Nouveau projet, séparé.
- Tailwind 3.4 + shadcn/ui (primitives maison dans `components/ui`).
- Design system répliqué de Tiquiz : indigo `#5D6CDB`, centralisé dans
  `--primary` / `--ring` de `app/globals.css`. Une seule couleur à
  changer pour différencier L'Atelier du Quiz.

## Sécurité

- RLS sur TOUTES les tables. Un élève ne voit que ses données.
- Contenu des jours protégé : lisible seulement avec un enrollment
  actif (`fq_has_active_enrollment`).
- Admin : `lib/adminEmails.ts`, vérifié côté serveur (middleware +
  routes), jamais déduit du seul front.
- Webhook Systeme.io : signé (HMAC) ou secret partagé, et idempotent
  (index unique `webhook_logs(source, event_id)`).
- Le coach IA répond UNIQUEMENT à partir du contenu fourni. S'il ne
  sait pas, il le dit. Jamais d'invention de méthode ou de chiffre.

## Migrations SQL

- `IF NOT EXISTS` partout, `notify pgrst, 'reload schema';` en fin.
- 🚨 Toute migration doit être APPLIQUÉE sur Supabase (Studio > SQL
  Editor). Le rappeler dans le message final (cf. drame Tiquiz : une
  migration jamais appliquée = stats perdues en silence).

## Git

- Développer sur la branche dédiée (cf. consigne de session), JAMAIS sur
  `main`. Béné est seule maître de `main`.

## Pipeline vidéo

- Réutilise l'infra popquiz auto-hébergée du VPS (serveur tus + nginx),
  namespace applicatif `quizing`. Voir `SETUP.md` section vidéo.

## Kit affilié : DEUX repos, UNE seule vérité (1er août 2026)

L'espace Contenu de l'affilié existe en double, volontairement :

| Où | Chemin |
|---|---|
| Atelier (ici) | `/affiliation/contenu` |
| Tipote | `affiliate.tipote.com/contenus/atelier` |

Un affilié peut promouvoir l'Atelier depuis l'un ou l'autre. S'il trouve
deux versions différentes du même email, il conclut que l'une est
périmée et n'utilise plus ni l'une ni l'autre. Donc :

**Les contenus sont des jumeaux, à garder identiques.**

| Ici (formaquiz) | Là-bas (tipote-app) |
|---|---|
| `lib/affiliateContent/posts.ts` | `app/affiliate/promouvoir/content/atelier-posts-fr.ts` |
| `lib/affiliateSwipe.ts` (`SWIPE_EMAILS`) | `app/affiliate/promouvoir/content/atelier-emails-fr.ts` |
| `lib/affiliateGeneratorBrief.ts` | `lib/affiliate/generatorBrief.ts` |
| `lib/markdownLite.ts` | `lib/affiliate/markdownLite.ts` |
| `public/affiliate-assets/atelier/posts/` | idem, MÊME chemin public |

Les visuels sont servis au **même chemin public** dans les deux apps :
c'est ce qui permet de copier le fichier de contenu sans réécrire une
seule URL. Ne pas "ranger" ces images ailleurs.

Toute correction d'un fait produit (prix, garantie, contenu du
programme, chiffre sourcé) doit être portée **dans les deux briefs de
génération**, sinon deux affiliés du même programme reçoivent deux
versions des faits.

**Carrousels : jamais en double.** Le kit contient le PDF ET les images
du même carrousel. On affiche le carrousel qui défile, et on met les
deux formats en téléchargement dessous (`CarouselViewer`). Les afficher
côte à côte donnait l'impression de deux visuels différents.

**Frontière serveur / client.** `ContentNav.tsx` (fil d'Ariane + carte de
dossier) n'est PAS marqué `"use client"`, et ce n'est pas un oubli : les
pages lui passent une icône, donc une référence de composant React, qui
ne traverse pas la frontière serveur vers client. Marqué côté client, le
même composant faisait planter la page en production chez Tipote sur
"An error occurred in the Server Components render", sans message utile
et sans que le typecheck ne voie quoi que ce soit.

**Le générateur rend du markdown léger, pas du texte brut.** `toHtml()`
doit gérer les TITRES (`#`, `##`) et les LISTES (`- `), pas seulement le
gras : un article demandé sort avec des sous-titres, et sans ça l'affilié
voit littéralement `## Mon sous-titre` à l'écran et le copie tel quel.
Le résultat s'affiche MIS EN FORME par défaut ; l'édition du markdown
brut est un geste volontaire, jamais l'état par défaut, et il n'y a pas
d'aperçu séparé en dessous (doublon inutile).

**Le format demandé se place EN DERNIER dans le prompt système**, et se
rappelle en tête du message utilisateur. Coincé au milieu, entre les
faits produits et les règles de style, il se faisait oublier : un article
revenait en post. `looksLikeFormat()` sert de garde-fou serveur et fait
refaire UNE fois un article sans titre ni sous-titres.

## Piège JSX : une expression en fin de ligne mange l'espace

```jsx
Ce rédacteur ne connaît que {PRODUCT_NAME}
et ne sait parler que de lui.        {/* -> "L'Atelier du Quizet ne sait" */}
```

JSX supprime le saut de ligne ET l'espace qui le borde quand la ligne se
termine par une expression. Vu en prod le 1er août 2026. Écrire
`{VALEUR} et ...` sur la même ligne, ou terminer par `{" "}`. Ni le
typecheck ni le lint ne le voient : ça ne se remarque qu'à l'écran.
