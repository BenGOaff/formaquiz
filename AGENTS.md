# L'Atelier du Quiz : conventions de code (à lire avant de coder)

Espace membre Next.js + Supabase, petit frère de Tiquiz. App séparée,
sur le VPS de Béné. On ne modifie JAMAIS le code de Tiquiz ni Tipote.

> **Vision produit et roadmap V2 : lire `VISION_ET_ROADMAP.md`.** Source de
> vérité des intentions Béné (étoile polaire, 5 chantiers A à E, ordre,
> statut). À relire au début de toute session qui touche au produit.

## ÉTAT DU SYSTÈME au 30 août 2026 (à lire en premier)

### Les trois applications, et les six domaines

| Domaine | Sert | Dépôt | Port |
|---|---|---|---|
| `atelierduquiz.fr` | **la page de vente et le bon de commande** | formaquiz | 3002 |
| `quizing.tipote.com` | **l'application** : la formation, le coach | formaquiz | 3002 |
| `tiquiz.fr` | vente Tiquiz, bon de commande, blog | tiquiz | 3001 |
| `quiz.tipote.com` | l'app Tiquiz | tiquiz | 3001 |
| `app.tipote.com`, `affiliate.tipote.com` | Tipote et l'espace affilié | tipote-app | 3000 |

**Les deux noms de ce dépôt ne font PAS le même métier**, et Caddy les
sert par deux blocs distincts. `quizing.tipote.com` est tombé le
30 août parce que son bloc n'avait jamais été rapatrié dans
`infra/caddy/Caddyfile` (dépôt tiquiz) : sans bloc nommé, Caddy n'a
aucun certificat pour ce nom et coupe la poignée de main. PM2 reste
vert, l'app tourne, aucun journal ne dit rien.

### L'affiliation : ce dépôt ne paie PAS, il remonte

- **Le registre est celui de Tipote depuis le 26 août.**
  `commissionnerVente` (`lib/affiliate/ownerSale.ts`) appelle
  `POST /api/affiliate/attribute-sale` chez Tipote avec
  `source_app: "atelier"` : c'est CE champ qui fixe les **70 %**.
- **Le registre local (`profiles.sio_affiliate_id`) n'est plus qu'un
  REPLI**, et il ne s'exécute que sur un refus franc, jamais sur une
  erreur réseau : les deux bases ne partagent aucune contrainte
  d'unicité, donc appeler les deux paierait deux fois.
- **Le lien porte `?ref=`**, lu par le middleware d'ici. L'ancien `?sa=`
  reste accepté.

### Avant CHAQUE push, sans qu'on le demande

```bash
npm run test:logic
npx tsc --noEmit       # exit 0 obligatoire
```

### Où chercher le reste

| Question | Fichier |
|---|---|
| ce que la formation promet | `PRODUCT_BRIEF.md` |
| ce qui est prévu | `VISION_ET_ROADMAP.md` |
| poser l'environnement | `SETUP.md` |
| ce qui reste à reprendre à Systeme.io | `ROADMAP_SORTIE_SIO.md` (dépôt tiquiz) |
| le programme d'affiliation en détail | `PLAN_AFFILIATION.md` (dépôt tipote-app) |

**Béné ne lit pas les dossiers.** Tout ce qu'elle doit faire ou copier
se met dans le message final, jamais dans un fichier qu'on lui demande
d'ouvrir. Une commande à la fois, aucun paramètre à remplacer.

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

## Le champ affiché DÉCIDE la colonne écrite (drame Maurice 2 août 2026)

Maurice : "quand je clique sur la question 5 du jour 7, ça me dit :
impossible de valider le jour, réessaie dans un instant. Ça dure depuis
hier soir, je pensais que ça se serait résolu le lendemain."

Ça ne pouvait pas se résoudre. DEUX définitions de "question à choix"
coexistaient et ne disaient pas la même chose :

- l'admin (`QuestionsManager`) : `type !== "action"` ;
- le viewer (`QuizRunner`) : `type !== "action" && options.length > 0`.

Une question `recall` / `decision` / `self_eval` SANS option tombe entre
les deux. L'écran de l'élève affiche une zone de texte, il écrit, et
l'envoi mettait `value_text` à `null` parce que le type n'était pas
`action`. La réponse partait VIDE en base. Question obligatoire ->
`/complete` répond `incomplete` pour toujours, et l'élève boucle : il
retape, ça repart vide, ça re-refuse.

**Règle :** `lib/questionInput.ts` décide, et TOUT l'appelle.
- `questionInputKind(q)` -> `"choice"` (des options à proposer) ou
  `"text"` ;
- `answerPayload(q, draft)` -> la colonne remplie, l'autre à `null` ;
- `draftIsFilled(q, draft)` -> le bouton Continuer.

Le champ affiché et la colonne écrite ne peuvent plus diverger, quelle
que soit la façon dont la question a été créée. `tests/logic/
day-completion.test.mts` le vérifie sur les 4 types x avec/sans options.

**Corollaire côté admin :** une question à choix sans option affiche
maintenant un avertissement ("l'élève verra une zone de texte libre").
Créer la question dans un état ambigu sans le savoir, c'est l'origine.

**Deuxième faute, aussi grave :** `/api/days/[day]/complete` refuse pour
SIX raisons (`bad_day`, `unauth`, `no_day`, `locked`, `incomplete`,
`db`) et l'écran les affichait TOUTES en "Réessaie dans un instant".
Maurice a attendu une nuit pour rien. Un refus doit dire ce qui bloque ;
`incomplete` renvoie la liste des questions manquantes et l'écran
ramène l'élève sur la première. "Réessaie" est réservé au vrai incident
réseau.

## Filet de tests logique (2 août 2026)

```bash
npm run test:logic     # runner natif Node, aucune dependance
npx tsc --noEmit       # exit 0
```

Même filet que Tiquiz et Tipote, et pour la même raison : le typecheck
ne voit rien de ces bugs. Toute règle métier sort dans `lib/` en
fonction pure, le composant se contente de l'appeler. Les tests portent
le nom de l'élève et ce qu'il a vu.

## Brief d'écriture persistant (demande Christelle 2 août 2026)

"Je voudrais que les infos complétées pour générer un contenu soient
persistantes, pour ne pas avoir à tout réécrire quand je veux rédiger un
mail, un post et un article sur le même thème."

Le FORMAT change, le contexte non. On retient le contexte (audience,
angle, ton), jamais le format : c'est justement ce qui change.

Stockage : table `generator_briefs (user_id, scope, brief jsonb)`, une
ligne par générateur. Le scope est une union typée
(`lib/generatorBrief.ts`), pas une chaîne libre : deux écrans qui
écriraient "affiliate" et "affiliation" ne partageraient rien, et
personne ne s'en apercevrait avant un retour client.

**Deux garde-fous, non négociables.** Un contexte périmé appliqué en
silence produit un texte à côté de la plaque sans que personne ne le
voie, c'est la famille de bugs qui nous a déjà coûté cher :
1. un brief repris est ANNONCÉ à l'écran ("Brief repris de ta dernière
   génération") ;
2. il se vide en un clic.

**Le brief s'enregistre APRÈS une génération réussie**, pas à la frappe :
ce qu'on reprend est ce qui a produit un texte, jamais un brouillon
abandonné.

Toute la chaîne est fail-open (table absente en prod, RLS, réseau) : le
générateur marche comme avant, sans brief. Un confort ne doit jamais
empêcher de générer.

Le même mécanisme vit dans Tipote (scopes `content`, `affiliate:tiquiz`,
`affiliate:atelier`), avec en plus `retargetPromptType()` : le brief du
générateur de contenu porte la ligne "Génère un contenu de type X", qui
doit être recalée sur le type courant, sinon un brief gardé après un
email annonce "email" pendant qu'on écrit un post.

## Le coach commun : UN cerveau, ici (demande Béné 2 août 2026)

"Un coach commun qui peut lire partout et la conversation suit d'une app
à l'autre. Et si t'as pas l'Atelier, t'as le coach qui te guide quand
même, avec toutes ses connaissances."

**Le coach vit dans l'Atelier, et nulle part ailleurs.** Tiquiz (et
demain Tipote) n'ont qu'un widget qui parle à
`/api/partner/coach`, authentifié par `PARTNER_SHARED_SECRET`. Dupliquer
le coach dans chaque app donnerait trois bases de connaissances à
maintenir et trois coachs qui se contredisent. On a déjà donné avec les
modules jumeaux.

**Deux populations, deux stockages :**
- ÉLÈVE : ses messages venus de Tiquiz sont écrits dans SON fil
  (`coach_threads` / `coach_messages`, clé = son user_id Atelier). C'est
  ce qui fait que la conversation suit vraiment. Pas de quota : le coach
  fait partie de ce qu'il a payé.
- NON-ÉLÈVE : pas de compte Atelier, donc fil indexé par email dans
  `coach_guest_messages` (table interne, RLS sans policy = service_role
  uniquement). **2 questions par jour.**

**L'orientation quand le quota tombe** vit dans
`lib/coach/needRouting.ts`, en fonctions pures testées :
- `classifyCoachNeed(message)` -> `technique` (elle sait quoi faire, elle
  bute sur l'outil ou une limite de plan -> plan payant Tiquiz) ou
  `strategie` (elle ne sait pas encore quoi faire -> l'Atelier). **En cas
  de doute : stratégie.** Vendre un abonnement à quelqu'un qui cherche de
  la méthode, c'est lui vendre la mauvaise chose ; il revient déçu.
- `buildCoachUpsell(need, sa)` -> le lien, **avec l'identifiant affilié
  quand on le connaît** ("je ne veux jamais les léser"). Un `sa` illisible
  ou absent donne un lien NU : une attribution fausse vole la commission
  d'un autre affilié.
- `guestQuota(askedToday)` -> la 2e question reçoit sa réponse ET la
  proposition. On ne coupe jamais quelqu'un au milieu d'une phrase pour
  lui vendre quelque chose.

**Le coach ne fait jamais l'article lui-même** : son prompt lui interdit
de proposer un achat. La proposition est ajoutée par le code, après la
réponse, une seule fois. Un coach qui vend perd la confiance qu'on lui
demande d'installer.

## Campagne pub : les deux paliers de l'Atelier (3 août 2026)

Tunnel en deux temps, avec deux bons de commande :

|  | 7 € "atelier simple" | 47 € "atelier augmenté" |
|---|---|---|
| Formation, jours du parcours | oui | oui |
| Coach, Quiz Doctor, carnet, avancées, certificat, affiliation | oui | oui |
| Bonus (jours `is_bonus`) | **visibles, verrouillés** | oui |
| Campagne `/funnel` (templates + générateur d'email) | **visible, verrouillée** | oui |
| 15 jours de Tiquiz Plus | non | oui |

**Les URL à coller dans Systeme.io** (`<domaine>` = l'Atelier) :

```
7 €    achat   : /api/systeme-io/webhook/atelier?secret=<SECRET>
7 €    annulé  : /api/systeme-io/webhook/atelier?secret=<SECRET>&event=cancel
47 €   achat   : /api/systeme-io/webhook/atelier-plus?secret=<SECRET>
47 €   annulé  : /api/systeme-io/webhook/atelier-plus?secret=<SECRET>&event=cancel
```

`/api/systeme-io/webhook` (sans suffixe) reste la route HISTORIQUE, avec
exactement ses réglages d'avant : les tunnels déjà en production ne
bougent pas.

**Règle : `lib/access/tiers.ts` décide, personne d'autre.** Trois principes,
tous les trois motivés par le fait que ce code tourne pendant une campagne
payante :

1. **Le palier ne redescend jamais tout seul** (`mergeTier`). Systeme.io
   réessaie et réordonne : si l'upsell arrive AVANT l'achat d'entrée, ou
   si un webhook double, un écrasement naïf rétrograderait un client qui
   vient de payer le prix fort.
2. **L'inconnu donne le palier COMPLET** (`resolveTier`). Colonne absente,
   migration pas passée, valeur illisible : on ouvre tout. Le défaut SQL
   vaut `'plus'` pour la même raison. Les élèves d'avant ont payé
   l'Atelier complet et ne doivent RIEN perdre.
3. **Ce qui est verrouillé tient en une constante** (`PLUS_ONLY_SECTIONS`
   pour les sections, `canAccessBonusDays` pour les bonus).

**Les bonus ne sont pas une section d'URL** : ce sont les jours `is_bonus`.
Un verrou par chemin ne peut pas les couvrir, et verrouiller `/jour` en
bloc couperait la formation, c'est à dire le produit vendu 7 €.

**Le remboursement de l'upsell RÉTROGRADE, il ne révoque pas.** Rembourser
47 € ne rembourse pas les 7 € : le client garde l'Atelier et perd les
bonus. Tout révoquer lui retirerait un produit qu'il n'a pas fait
rembourser. Le remboursement du 7 €, lui, révoque tout.

**Le flou est une vitrine, jamais une serrure.** `LockedSection` montre le
contenu réservé (demande Béné : "tu montres bien que c'est là, ça existe"),
mais un `blur` CSS se retire dans l'inspecteur. La vraie protection est
dans `/api/me/funnel` et `/api/me/funnel/intentions`, qui refusent le
palier `standard` en 403. **Ne jamais ajouter une capacité réservée sans
sa garde côté serveur.**

**L'URL du bon de commande vit dans `ATELIER_UPSELL_URL`**, lue au RUNTIME
(`lib/access/upsell.ts`), jamais en `NEXT_PUBLIC_*` : celles-ci sont
inlinées au build, ce qui avait gravé un `localhost:3002` dans les liens
d'accès en prod. Non renseignée -> flou + cadenas + texte, **et aucun
bouton** : un bouton mort le jour du lancement coûte plus cher que pas de
bouton.

**Le repli si la migration n'est pas encore passée est obligatoire.**
PostgREST rejette l'écriture entière sur une colonne inconnue : sans
repli, déployer avant la migration couperait l'octroi d'accès de TOUS les
acheteurs. `grantAccessByEmail` tente avec le palier puis retombe sans ;
`getViewer` fait `select("*")` et pas `select("status, tier")`. Exception
assumée : la RÉTROGRADATION ne se replie pas en silence, elle renvoie une
erreur (un remboursement ignoré laisserait un client remboursé avec le
produit).

## La campagne email : des dossiers, jamais du JSON (retour Béné 3 août 2026)

"La campagne email générée dans l'Atelier du quiz sort en json .. l'enfer !!"

**La cause n'était pas le format de sortie, c'était une TRONCATURE.**
`max_tokens: 4096` pour 3 emails de bienvenue + 1 par profil + 3 emails
de vente + 4 posts + un DM + un email partenaire, en français : la
réponse était coupée en plein JSON, `JSON.parse` échouait, et le code
retombait sur une branche `raw` qui affichait le JSON BRUT à l'écran.
Elle voyait notre panne, pas sa campagne.

Trois corrections, dans cet ordre d'importance :

1. **On n'affiche JAMAIS de JSON à une créatrice.** La branche `raw` est
   supprimée. Quand l'analyse échoue, l'écran dit que la génération n'a
   pas abouti et propose de relancer ; le texte brut part dans les logs
   serveur. Montrer un livrable illisible et laisser l'utilisatrice le
   démêler coûte plus cher que d'admettre l'échec.
2. **`max_tokens` passe à 16000.** C'était la cause réelle.
3. **`tryRepairTruncatedJson`** referme les délimiteurs restés ouverts
   quand le modèle a quand même été coupé : trois emails sur six valent
   mieux qu'un écran vide. Ce n'est pas un parseur, c'est un filet.

**La présentation, telle qu'elle l'a demandée :** un dossier repliable
par séquence, **un dossier par profil de résultat**, des emails
**numérotés** ("Jour 1", "Jour 2"), repliés par défaut, qu'un clic
développe. Le bouton Copier est dans l'en-tête de chaque email, donc
accessible SANS déplier : quand on colle sa séquence dans Systeme.io on
enchaîne les copies, on n'ouvre pas puis referme chaque email.

Seule la première séquence est ouverte au chargement : tout ouvrir
redonnerait le mur de texte qu'elle voulait éviter.

## Ton process de déploiement, et ce qu'il implique pour moi (4 août 2026)

Béné : "c'est mon process, et je ne le changerai pas."

**Ce que TU fais, pour chaque app :**

```bash
# sur ta machine
cd C:\Users\hello\Desktop\formaquiz
git fetch origin
git pull origin main
git status
git add .
git commit -m "claude todo 4 aout 4"
git push origin main

# sur le serveur
cd /home/tipote/formaquiz
git stash
git pull origin main
npm ci
npm run build && pm2 restart formaquiz-prod --update-env
```

Tu prends ma branche, tu copies le code dans ton dossier local, tu pousses
sur `main`, puis le serveur tire `main`. `main` est donc la branche de
PROD, et je n'y touche jamais : je pousse sur ma branche, tu fais le
reste.

**Ce que ça implique pour moi, et c'est le point à ne pas oublier :**

- **Les fichiers SUPPRIMÉS, et EUX SEULS, se signalent** (correction
  Béné, 22 août 2026 : "bien sûr qu'il le voit ! C'est les fichiers à
  supprimer qu'il faut me signaler"). Son copier-coller emporte très bien
  les fichiers nouveaux ; ce qu'il ne fait pas, c'est retirer ce qui a
  disparu, donc un fichier supprimé survit en prod et continue d'y
  tourner. Lister les nouveaux fichiers à chaque envoi, c'est du bruit
  qu'elle doit trier pour rien.
  -> Message final : la liste des SUPPRESSIONS, avec leur chemin, et
  rien si la liste est vide.
- Sur le serveur, un `git pull` peut afficher **"Already up to date"**
  alors que le fetch vient de télécharger des commits : c'est normal,
  `main` est à jour même quand `origin/claude/...` bouge. Ce n'est PAS un
  signe que le déploiement a raté.
- `npm ci` réinstalle depuis `package-lock.json` : toute nouvelle
  dépendance doit être committée AVEC son lock, sinon le build casse en
  prod et pas chez toi.

## Voir l'écran d'une cliente au lieu de la déranger (4 août 2026)

Jocelyne signalait un problème qu'aucun écran ne reproduisait de notre
côté. On a diagnostiqué à l'aveugle, on lui a fait faire une manip qui
n'a rien donné, et il a fallu quatre allers-retours pour comprendre que
son Atelier était relié au mauvais compte. Voir SON écran aurait tranché
en dix secondes.

```bash
cd /home/tipote/formaquiz
node scripts/login-link.mjs adresse@de-la-cliente.fr
```

Le script affiche un lien de connexion à usage unique dans le terminal.
Il **n'envoie aucun email** (c'est l'app qui poste le message dans le flux
normal, pas la génération du lien), et il ne touche ni au mot de passe ni
à la session en cours. Il existe dans les TROIS repos.

**Trois règles, réimprimées à chaque exécution :** fenêtre privée (sinon
on remplace sa propre session par la sienne sans s'en rendre compte), on
regarde sans rien modifier, on ferme en partant.

**Deux choix techniques à ne pas défaire.** Le script n'a AUCUNE
dépendance (`createClient` de supabase-js monte un client temps réel qui
exige un WebSocket natif, absent de Node 20 : ça plantait avant de rien
faire). Et il lit le `.env` lui-même, en ne cherchant QUE les deux clés
dont il a besoin : `set -a; . .env; set +a` demande à bash d'interpréter
tout le fichier, et une clé d'API sans rapport contenant des caractères
spéciaux faisait échouer le chargement entier.

## Un profil qui n'a qu'un seul email (drame Fabienne, 7 août 2026)

"J'ai lancé la création des 5 mails pour mes 3 profils. A chaque fois deux
des profils en ont bien 5 mais il y a toujours un profil qui n'en a qu'un."

Trois causes empilées, et la troisième explique pourquoi elle l'a
découvert toute seule, en lisant.

**1. Le gabarit du prompt montrait UN email.** Sous le titre "Format
exact", juste au dessus de "EXACTEMENT 5 emails" :

```
{"emails": [{"step": 1, "subject": "...", "body": "..."}]}
```

Un tableau complet, fermé, à une seule entrée. Un modèle qui suit la
FORME plutôt que la phrase s'arrête à un, et il n'a pas tort : c'est ce
qu'on lui a montré. **Même défaut que le prompt quiz de Tiquiz le 3 août,
où l'exemple contredisait sa propre règle. Un prompt est du code : son
exemple ne doit jamais contredire sa consigne.** Le gabarit est
maintenant DÉRIVÉ de `RESULT_SEQUENCE` (`sequenceSkeleton()`), donc
ajouter un temps le met à jour tout seul.

**2. La réparation d'une réponse coupée amputait la séquence.**
`tryRepairTruncatedJson` remontait à la dernière virgule hors chaîne. Or
cette virgule est À L'INTÉRIEUR du dernier email conservé (celle qui
sépare `subject` de `body`) : elle sacrifiait donc un email complet de
plus et fabriquait un email sans corps. **Mesuré avant correction : une
coupure au quart de la réponse ne laissait qu'UN email, vide.** La coupe
se fait maintenant à la dernière FIN D'OBJET COMPLET. Les deux fonctions
sont sorties dans `lib/generate/aiJson.ts` : privées, elles n'étaient pas
testables, donc pas testées.

**3. Rien ne vérifiait le COMPTE.** `emails.length > 0` suffisait à
déclarer la séquence réussie, et le bandeau qui nomme les profils ratés
ne repérait que les profils à ZÉRO email. Un profil revenu avec un seul
email sur cinq passait donc pour une réussite complète. Désormais :
`missingSequenceSteps()` nomme les temps manquants, le serveur REDEMANDE
une fois en les citant, la réponse porte `complete`, et l'écran affiche
`2 / 5` avec une pastille "à compléter".

**Un rang en double ne comble pas un trou** : cinq emails dont deux au
même `step`, ce n'est pas une séquence complète. Compter les emails
aurait dit oui.

**Et le libellé d'un email suit son RANG, jamais sa place dans la
liste.** L'écran et le `.md` numérotaient par l'index : tant que la
séquence est complète ça ne se voit pas, mais dès qu'un temps manque,
tout ce qui suit porte le nom du temps précédent. C'est le défaut
d'Adeline sous un autre visage, une POSITION qui sert d'identité. Règle
unique : `sequenceRank(email, index)`.

## Le premier email n'est pas la copie de la page de résultat (Fabienne, 7 août 2026)

"Lorsque j'ai fait le test du quiz, j'ai bien eu mon profil et la
définition avec la vignette à partager. Donc ça va faire doublon avec le
premier mail des 5 créés ?"

Oui, et ce n'était pas une impression : le temps 1 disait "tu lui renvoies
son profil et ce qu'il veut dire", c'est à dire exactement ce que la page
de résultat vient d'afficher. On demandait la redite.

Le premier email a un autre travail : il est la trace DURABLE du résultat
(la page, elle, se ferme), il confirme que l'adresse marche, et il annonce
la suite. Il nomme donc le profil en une phrase pour que le lecteur se
retrouve, puis apporte ce que la page ne disait pas. `RESULT_SEQUENCE[0]`
le dit maintenant explicitement.

## La deuxième chance : commander les bonus hors de son tunnel (7 août 2026)

Béné : "je suis en train de créer l'upsell atelier augmenté pour mon tunnel
meta, enfin la deuxième chance, pour qu'ils puissent commander les bonus en
dehors du tunnel par lequel ils sont arrivés."

Page de vente : `https://www.tipote.fr/atelier-du-quiz-bonus`, à mettre
dans `ATELIER_UPSELL_URL` (c'est le bouton que voient les élèves à 7 € sur
les bonus verrouillés, la Campagne et le tableau de bord).

**Webhook, sur l'automatisation "Vente confirmée" :**
`https://quizing.tipote.com/api/systeme-io/webhook/atelier-bonus?secret=<SYSTEME_IO_WEBHOOK_SECRET>`
et sur "Vente annulée" du MÊME produit, la même URL + `&event=cancel`.

**Pourquoi une route à elle et pas `atelier-plus`.** Le produit vendu est
le même, les réglages métier aussi. Une seule chose diffère, et elle
change tout : à QUI ce bon de commande s'adresse.

`atelier-plus` est l'upsell du tunnel pub, il vend à quelqu'un qui vient
d'acheter l'Atelier trente secondes plus tôt ; le compte peut ne pas
exister encore, puisque les deux automatisations Systeme.io arrivent dans
un ordre non garanti. La deuxième chance, elle, vend à quelqu'un qui a
DÉJÀ l'Atelier. **Le même signal ("aucun compte pour cette adresse") veut
donc dire "tout va bien" sur l'une et "quelque chose cloche" sur l'autre.**

C'est le défaut d'Adeline et de Véronique dans une autre famille : une
logique écrite pour un cas, appliquée telle quelle à un autre. D'où
`expectsExistingAccount` en PARAMÈTRE, et `isOrphanBonusOrder(mode, état)`
dans `lib/access/bonusOrder.ts`, qu'on ne peut pas appeler sans avoir dit
de quel bon de commande on parle.

**Deux façons d'être orphelin**, et la seconde compte autant : le compte a
dû être créé, OU il existait sans le moindre enrollment. Ne regarder que
`created` laisse passer le second cas en silence.

**Ce qu'on fait de ce cas : on ouvre l'accès QUAND MÊME**, sur l'adresse
de la commande. Il a payé. L'email qu'il reçoit nomme l'adresse en toutes
lettres (c'est le seul moyen pour lui de voir l'erreur) et lui propose de
répondre avec l'adresse de son compte habituel. Béné reçoit une alerte.

**Et l'email de montée de palier n'est plus l'email de bienvenue.** Un
élève qui achetait l'upsell recevait exactement le même message que le
jour de son inscription : on souhaitait la bienvenue à quelqu'un qui a
déjà le produit, sans jamais lui confirmer que sa commande avait ouvert ce
qu'il venait de payer. `bonusUnlockedEmail` nomme les quatre choses qui
s'ouvrent.

**Au passage, `server-only` ne bloque plus les tests.** Le paquet n'est
pas installé (Next le résout en interne), donc tout module marqué
`import "server-only"` était intestable, c'est à dire l'essentiel de la
logique métier : accès, emails, webhooks. Les hooks du runner le
remplacent par un module vide.


## Un export SingleFile n'a PAS les scripts (19 août 2026)

Béné, sur la page de vente de l'Atelier répliquée chez nous : "je vois
bien la page mais pas les popups comment ça marche et résumé en 5 points
ni le curseur étoile."

Ses trois blocs perso (étincelles au curseur, carrousel 5 écrans, mini
test) étaient bien écrits dans sa page Systeme.io. Dans notre copie, le
CSS était là et le JS avait disparu : **un seul `<script>` survivait dans
tout le document**, contre 11 sur la vraie page.

La cause n'est pas notre extracteur (il ne retire que Google Tag Manager
et Facebook) : **SingleFile retire les scripts par défaut**. L'export
qu'on nous avait donné n'en contenait aucun. Le CSS qui reste donne
l'illusion d'une page complète, et c'est ce qui rend le piège coûteux :
rien ne manque à l'oeil, seuls les comportements manquent.

**Règle : une page de vente se capture depuis son URL EN LIGNE**
(`scripts/fetch-sales-page.mjs`), jamais depuis un export fait à la
main. C'est d'ailleurs pour ça que Tiquiz marchait du premier coup et
pas l'Atelier : deux pages jumelles, deux méthodes de capture, une seule
panne. Même famille que les deux versions divergentes de `pdf-parse` du
7 août.

**Et une capture se VÉRIFIE dans un navigateur, pas à l'oeil.** On ouvre
la page servie par nous, on clique les boutons qui déclenchent quelque
chose, et on lit la console. C'est ce qui a montré, en plus, que deux des
quatre ids de son `TRIGGER_IDS` n'existent plus sur sa page (elle avait
recréé les boutons dans l'éditeur Systeme.io, ce qui leur a donné de
nouveaux ids) : son propre garde-fou le signalait déjà, sur la page en
ligne comme sur la copie, et personne ne lisait la console.

## Trois causes, un seul message : le 404 muet (19 août 2026)

La page de vente de l'Atelier répondait `Not found`. Trois branches de la
route rendaient exactement ce texte : clé absente, slug inconnu, fichier
non déployé. Impossible de savoir laquelle, donc impossible d'avancer
autrement qu'en devinant.

**Règle : une fois la porte franchie, le serveur DIT ce qui cloche.**
Sans la bonne clé, on ne dit rien (un refus explicite annoncerait qu'il y
a quelque chose derrière). Avec la bonne clé, on nomme la cause et on
donne la donnée qui manque toujours : le dossier depuis lequel on a
cherché. C'est la même règle que la suppression d'un quiz (3 août) et que
l'import PDF (7 août), appliquée à un endroit qui l'avait oubliée.

La cause réelle ce jour là : `SALES_PREVIEW_TOKEN` posée sur le serveur
de Tiquiz et pas sur celui de l'Atelier. **Deux apps, deux `.env`,** et
une variable posée une seule fois. `grep -l NOM_DE_LA_VAR /home/tipote/*/.env`
répond en une seconde à "je l'ai pourtant mise quelque part".

## Un shell qui garde le `.env` de l'autre app (panne 22 août 2026)

Les deux apps ont servi la base Supabase de l'AUTRE, deux fois dans la
même journée, pour deux raisons différentes. Une journée entière perdue.

### Le matin : le BUILD gravait les valeurs du terminal

Tiquiz affichait les quiz de Tipote et répondait `column
profiles.user_id does not exist` ; Tipote répondait `Could not find the
table 'public.content_item' in the schema cache`. Les liens de connexion
envoyés depuis `quiz.tipote.com` renvoyaient sur `app.tipote.com`.

Les quatre faits qui ont tranché, et c'est le bon réflexe de diagnostic
(comparer le FICHIER et le BUILD, jamais le fichier seul) :

```
== tiquiz-app ==  .env: ottpciabnrclwgdlwjdt   build: mmwyfqfbfkvcnrkyvagv
== tipote-app ==  .env: mmwyfqfbfkvcnrkyvagv   build: ottpciabnrclwgdlwjdt
```

**Les deux `.env` étaient justes. Les deux builds étaient croisés.**

Un `set -a; . .env; set +a` avait été lancé dans le terminal, pour les
DEUX apps, dans la même session, juste pour lire une variable. `set -a`
exporte tout le fichier dans le shell. Or Next lit `process.env` **avant**
`.env` (`node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`
: "stopping once the variable is found"), et un `NEXT_PUBLIC_*` est gravé
dans le code au moment du `next build`, avec "the value from the
environment in which you run `next build`".

Les bases n'ont jamais été fusionnées : chacune est restée intacte, ce
sont les pointeurs qui étaient croisés.

### Le soir : la même panne, par une autre porte

Béné : "pourquoi j'ai tous mes contenus mais pas mes clients dans
Tipote ?" La question contenait le diagnostic.

Le garde-fou du matin a bien REFUSÉ de construire. Mais la ligne suivante
du déploiement, `pm2 restart --update-env`, a poussé ce terminal pollué
DANS le processus. Et comme `server.js` fait `process.chdir(__dirname)`,
le serveur standalone cherche ses fichiers d'environnement dans
`.next/standalone/`, où personne ne copiait rien : l'app ne vivait donc
QUE sur ce que PM2 gardait en mémoire, insensible à tous les rebuilds.

Le partage des symptômes disait exactement où regarder :
- les CONTENUS s'affichaient (clé anon, GRAVÉE dans le build, donc juste) ;
- les CLIENTS avaient disparu (clé de service, lue dans le PROCESSUS,
  donc celle de l'autre app).

**Un garde-fou qui protège le build ne protège pas le redémarrage.**

### Les garde-fous, et pourquoi il en faut plusieurs

Chacun couvre un MOMENT différent. En zapper un rouvre la porte par
laquelle la panne est déjà passée.

| Quand | Quoi | Ce qu'il attrape |
|---|---|---|
| avant le build | `prebuild` -> `scripts/check-build-env.mjs` | le terminal contredit le `.env` du repo : le build est REFUSÉ |
| après le build | **rien à copier ici**, et c'est vérifié | `formaquiz-prod` tourne en `npm start` donc en `next start`, PAS sur `.next/standalone/server.js` (mesuré le 23 août : `script args = start`, `exec cwd = /home/tipote/formaquiz`). Next lit donc le `.env` du dossier du repo, il n'y a rien à copier. Le jour où le lancement passerait à `node .next/standalone/server.js`, porter le postbuild des deux autres repos : sans lui l'app ne vivrait plus que sur la mémoire de PM2. |
| au démarrage | `instrumentation.ts` -> `lib/env/supabaseProject.ts` | la clé ne parle pas du même projet que l'URL : ça CRIE dans `pm2 logs`, à chaque démarrage |
| à la demande | `npm run check:supabase-keys` | compare le FICHIER, le TERMINAL, le BUILD et le PROCESSUS (`/proc/<pid>/environ`) |

**Le postbuild ne dispense JAMAIS d'`instrumentation.ts`** : `process.env`
passe toujours devant les fichiers, donc une valeur fausse héritée de PM2
gagne encore. Ce qui change, c'est qu'une variable ABSENTE du processus a
désormais une source fiable, versionnée avec le déploiement, au lieu de
dépendre de la mémoire de PM2.

Aucun de ces contrôles n'imprime la valeur d'une clé qui ressemble à un
secret (`estSecret`) : ces rapports finissent dans un terminal, un
historique, parfois un copier-coller. Ils disent "les deux valeurs
diffèrent" et s'arrêtent là. Les URL et les `NEXT_PUBLIC_*` restent
lisibles, ce sont elles qui rendent le diagnostic évident.

### Un journal se LIT, il ne se déduit pas

L'agent a mis une heure à trouver, en théorisant. Deux sources donnaient
la réponse en une commande : le corps de la réponse HTTP (onglet Réseau)
et `/proc/<pid>/environ`. Il a lancé quatre hypothèses avant d'aller les
regarder, et fait accuser une clé anon parfaitement bonne pendant trois
échanges parce que son test tapait sur un point d'entrée que cette clé
n'a pas le droit de lire.

**Un test qui ne distingue pas ce qu'il est censé distinguer est pire
qu'un test absent.** `/rest/v1/` répond 200 à n'importe quelle clé valide
du projet, quel que soit son rôle, et 401 à une clé anon valide.

| Ce qu'on veut savoir | Où taper |
|---|---|
| une clé anon est-elle bonne | `/auth/v1/settings` |
| une clé de service est-elle bonne | `/auth/v1/admin/users?page=1&per_page=1` |
| ce qu'une clé EST | décoder son `role` (`lireCleSupabase`) |

Et **un 401 peut vouloir dire "clé vide"** : mesurer la longueur de ce
qu'on a extrait avant de conclure quoi que ce soit.

### Un garde-fou non fusionné ne protège personne (23 août 2026)

Les trois derniers garde-fous ont été écrits le 22 au soir sur une branche
de travail, et ne sont jamais arrivés dans `main`. Pendant 24 heures, cette
page les décrivait comme actifs et le serveur ne les avait pas : la cause
exacte de la panne du soir était toujours là, derrière une doc qui disait
le contraire.

**Règle : quand une session écrit un garde-fou, la dernière étape n'est
pas de l'écrire, c'est de vérifier qu'il est arrivé.**

```bash
git log origin/main -1 --oneline -- instrumentation.ts scripts/check-supabase-keys.mjs
```

Aucune ligne = il n'est pas déployé, quoi qu'en dise la doc.

### Et la leçon qui dépasse cette panne

Une commande donnée à Béné doit être sûre même mal replacée.

- `( set -a; . .env; set +a; ... )` : la parenthèse est un sous-shell,
  tout meurt avec elle. **INTERDIT sans les parenthèses.** Une variable
  exportée dans un terminal survit à tout ce qu'on y tapera ensuite.
- `npm run build && pm2 restart <app> --update-env` : le `&&` n'est pas
  cosmétique. Sans lui, un build REFUSÉ se déployait quand même, et c'est
  exactement ce qui a mis Tipote par terre. Ne jamais donner ces deux
  commandes sur deux lignes séparées.

## Le support de l'Atelier passe par le centre d'aide commun (23 août 2026)

Béné : "je veux un service de ticketing dans le centre d'aide commun à
toutes les app, essentiellement pour Tiquiz et L'Atelier qui sont vendus
en ce moment, avec ticket relié à la fiche client si elle existe."

Le menu "Besoin d'aide ?" était un `mailto:`. Un email dans une boîte ne
se retrouve jamais sur la fiche de l'élève, et personne ne sait si on y a
répondu.

**Règle : il mène à `app.tipote.com/support?lang=fr&produit=atelier`.**
Le centre d'aide porte les articles ET le formulaire ; le ticket part
dans la file unique (celle de Tiquiz), rattaché à l'adresse de l'élève,
et s'affiche sur sa fiche à côté de ses accès et de ses paiements.

`produit=atelier` évite qu'il ait à préciser de quoi il parle : sans lui,
Béné lit "je n'ai pas reçu mes accès" sans savoir s'il s'agit de Tiquiz
ou de l'Atelier, et répond à côté.

**L'Atelier n'a pas de table de tickets, et n'en aura pas.** Une
troisième file rejouerait exactement le problème qu'on vient de régler :
il y en avait deux, dans deux bases, et une demande pouvait attendre dans
celle qu'on ne regardait pas.

## Sortir de Systeme.io : l'état des lieux vit dans le dépôt Tiquiz

Béné, 24 août 2026 : "note où on s'arrête et ce qu'il reste à faire pour
qu'à terme mon système remplace complètement Systeme io pour les ventes
et l'affiliation sauf pour les emails."

C'est **`ROADMAP_SORTIE_SIO.md`, à la racine du dépôt TIQUIZ**, et il n'y
en a qu'un exemplaire : trois copies d'un état des lieux divergeraient en
une semaine.

## L'Atelier facture, depuis le 25 août 2026

PayPal n'émet pas de facture. Ce qu'il envoie à l'acheteur est un avis de
paiement : ni numérotation, ni identité complète du vendeur, ni adresse
de l'acheteur, ni ventilation de TVA. Un client professionnel ne peut
rien en faire. Le module vient de Tiquiz (24 août), avec **trois
différences de fond qu'il ne faut pas gommer** :

**1. Un ACHAT UNIQUE, donc une vente = une facture.** Le déclencheur est
la CAPTURE (`PAYMENT.CAPTURE.COMPLETED`), jamais l'approbation de la
commande : une commande approuvée peut ne jamais être capturée.

**2. La série est `AQ-<année>`, jamais `TQ`.** Les deux apps ont leur
propre base et leur propre compteur : avec le même préfixe, elles
émettraient chacune un `TQ-2026-0001` pour deux ventes différentes. Une
société peut tenir plusieurs séries, à condition que chacune soit
continue.

**3. Le payload n'a NI les mêmes champs NI la même forme de montant.**

| | vente v1 (Tiquiz) | capture v2 (ici) |
|---|---|---|
| montant | `amount.total` | `amount.value` |
| devise | `amount.currency` | `amount.currency_code` |
| vente d'origine d'un remboursement | `sale_id` | dans `links[].href` |

Recopier l'un sur l'autre donnerait une facture à zéro euro, sans erreur
nulle part. `lib/facture/paypalVente.ts` n'est donc PAS le jumeau de
celui de Tiquiz, et le test le fige.

**L'adresse email saisie sur le bon de commande GAGNE** sur celle du
compte PayPal, et voyage dans le `custom_id` (3e champ, AJOUTÉ EN FIN
pour qu'une commande en cours se relise à l'identique). Quelqu'un qui
paie avec le compte de son conjoint recevait ses accès sur une adresse
qui n'est pas la sienne : c'est le compte orphelin rencontré le 7 août
sur les commandes de bonus.

**`lib/legal/company.ts` est une RECOPIE** de celui des deux autres
dépôts : il n'y a pas de paquet partagé, donc ça diverge. Le test fige
les valeurs, pour qu'un changement d'adresse ou de RCS soit voulu et pas
subi, et il rougira dans les trois dépôts.

Le reste (les 4 régimes de TVA, la numérotation continue par fonction
SQL, l'identité recopiée dans la facture, "on émet toujours, on ne
retient jamais") est décrit dans l'AGENTS.md de Tiquiz et vaut ici mot
pour mot.

🚨 Migration à appliquer : `supabase/migrations/20260825_facturation.sql`.

## Les litiges Stripe n'arrivaient jamais (31 août 2026)

Le webhook de ce dépôt écoute `charge.dispute.created` et
`charge.dispute.funds_withdrawn` depuis l'audit du 26 août. **Stripe ne
les envoyait pas** : l'endpoint `quizing.tipote.com/api/commande/webhook`
n'y était pas abonné.

Relevé avec `npm run check:stripe` (dépôt TIQUIZ, il lit tout le compte
Stripe d'un coup), pas déduit. Un impayé laissait donc l'accès ouvert et
la commission en route vers le lot du mois, exactement le trou qu'on
croyait avoir fermé.

**La leçon dépasse Stripe :** on avait écrit le code, écrit le test, mis
à jour cette page, et personne n'avait vérifié que le fournisseur ÉMET
l'événement. Un `if` qui attend un événement jamais envoyé est
indiscernable d'un `if` qui marche. C'est la version « configuration »
du garde-fou non fusionné du 23 août : **écrire un garde-fou n'est pas
la dernière étape, vérifier qu'il reçoit quelque chose l'est.**

**Ce dépôt n'a besoin QUE de cinq événements**, et c'est important pour
ne pas se faire réclamer le reste : il vend un ACHAT UNIQUE
(`interval: null`), donc `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, `charge.refunded` et les
deux `charge.dispute.*`. Aucun `invoice.*`, aucun
`customer.subscription.*` : ce sont les abonnements de Tiquiz. Le
contrôle le sait par un tableau d'hôtes, il ne le devine pas.

**Et la version d'API du compte est `2020-08-27`** (mesurée le 31 août).
Ce dépôt ne lit ni facture d'abonnement ni période d'abonnement, donc
les champs que Stripe a déplacés dans ses versions récentes ne le
concernent pas. Le jour où l'Atelier vendra un abonnement, il faudra
porter `lib/checkout/formeStripe.ts` depuis le dépôt Tiquiz.

## L'audit du 26 août : la fonction existait, elle n'était pas branchée

Béné : "tu peux auditer tout le parcours de vente tiquiz et l'atelier,
paypal et stripe plus tout le système d'affiliation ?"

**La trouvaille la plus instructive de tout l'audit est ici.**
`refundCommissionByOrder` vit dans ce dépôt depuis des mois, et elle
faisait exactement ce qu'il fallait : marquer `refunded` les commissions
d'une vente remboursée. Elle n'était branchée que sur le remboursement
SYSTEME.IO (`lib/webhooks/sioAtelier.ts`).

Le jour où l'Atelier a eu son propre bon de commande, personne ne l'a
rebranchée. Une vente remboursée par carte ou par PayPal continuait donc
de payer son affilié, alors que la même vente remboursée chez Systeme.io
ne le payait pas. **Ce n'est pas un oubli d'écriture, c'est le défaut
signature de ces dépôts : une logique écrite pour un cas, jamais portée
sur l'autre.**

Les deux webhooks l'appellent maintenant, avec la clé de la CRÉATION
(`<moyen>:<reference>`). Sur PayPal, la capture d'origine n'est PAS dans
un champ : la v2 ne porte pas de `sale_id`, le seul fil vers la vente est
`links[].href`. Quand on ne la retrouve pas, on le DIT.

**`charge.dispute.*` n'était écouté nulle part** : ajouté, avec la même
règle que côté Tiquiz (on ferme sur `funds_withdrawn`, jamais sur
`created`).

**L'anti-auto-affiliation comparait les adresses brutes** : acheter avec
`moi+1@gmail.com` suffisait à se payer 70 % de son propre achat. La règle
vit maintenant dans `lib/affiliate/memeAdresse.ts`, le même fichier dans
les trois dépôts.

### Deux choses que l'audit laisse ouvertes

1. **Les commissions du REGISTRE LOCAL ne sont dans aucun lot de
   versement.** À nuancer depuis le 26 août au soir, sinon la phrase
   fait peur pour rien : `commissionnerVente` interroge maintenant le
   registre CENTRAL de Tipote EN PREMIER (`source_app: "atelier"`), donc
   **la vente d'un affilié inscrit chez Tipote entre normalement dans
   les lots de versement**. Ce qui reste dehors, c'est le seul cas du
   REPLI : un élève affilié ici (`profiles.sio_affiliate_id`) et pas
   chez Tipote. Sa commission est écrite dans NOTRE base, que
   `preparerLot` ne lit pas. L'admin de Tiquiz les AFFICHE (il interroge
   les deux bases), ce qui rend la dette visible sans la solder. Elle
   disparaîtra le jour où les deux registres seront fusionnés.
2. **`/api/affiliate/sio-sale` accepte les produits TIQUIZ** et les écrit
   dans la base de l'Atelier, pendant que le webhook Systeme.io de Tiquiz
   remonte les mêmes ventes chez Tipote. Deux tables, deux contraintes
   d'unicité, aucune ne voit l'autre, et l'admin ADDITIONNE les deux
   sources. On ne change pas le routage à l'aveugle (il dépend des
   automatisations Systeme.io, invisibles depuis le code) : le cas est
   journalisé en clair, et si la ligne apparaît dans `pm2 logs` il faut
   débrancher l'une des deux.

Test : `tests/logic/audit-26-aout.test.mts`.

## Le coach envoyait les élèves sur un lien qui ne paie plus (31 août 2026)

Audit demandé par Béné : "audit atelier + coach ia [sur le nouveau
système d'affiliation]."

`lib/coach/knowledge.ts` portait encore, daté du 26 août :

> "SEULE EXCEPTION : l'inscription gratuite reste chez eux, parce que
> son formulaire crée le contact et pose le tag qui déclenche les
> séquences email."

**C'était vrai un jour, et faux depuis le 27 août.** `tiquiz_free` est
revenu chez nous ce jour là (`lib/affiliate/linkDestinations.ts` chez
Tipote : `https://tiquiz.fr/signup`), parce que `/signup` fait
maintenant les trois choses d'un coup, le compte, le rattachement à vie,
et le contact chez Systeme.io avec son tag.

Ce que ça coûtait : un élève qui demandait au coach quel lien utiliser
pour l'inscription gratuite s'entendait répondre "celui de Systeme.io".
Or **depuis que nos liens portent `?ref=`, un lien qui atterrit chez eux
ne paie plus personne** : leur page ignore le paramètre, notre
middleware ne voit jamais la requête, et leur webhook ne sait lire qu'un
`sa`. Le coach recommandait donc, en toute confiance, le seul lien qui
ne rapporte rien.

**Règle : une connaissance de coach est du CODE PÉRIMABLE.** Elle est
écrite en prose, personne ne la relit quand une destination bouge, et
rien ne la contredit avant qu'un élève ne se plaigne de ne pas être
payé. Toute modification de `linkDestinations.ts` chez Tipote se reporte
dans ce fichier, le même jour.

Corrigé au passage : le coach ne connaissait pas la MONTÉE DU TAUX (45 %
au premier filleul, jusqu'à 70 % à 51) ni la remise d'abonnement, ni
qu'elles sont EXCLUSIVES l'une de l'autre. Béné démarche de gros
affiliés : c'est la première question qu'ils poseront.

**Le barème n'est PAS recopié dans `lib/affiliate.ts`** (les arguments
de vente de l'onglet Affiliation), et c'est délibéré : il vit déjà en
double, chez Tipote et sur `tiquiz.fr/affiliation`, figé des deux côtés
par un test qui nomme l'autre. Une TROISIÈME copie dans une phrase de
vente que personne ne relira finirait par annoncer un taux qui n'est
plus versé (drame du 19 août : 32,90 € annoncés, 27,42 € payés). La
phrase dit que le taux monte, et renvoie à l'espace affilié pour le
barème. Le fichier du coach, lui, DOIT porter les chiffres pour pouvoir
répondre : il porte donc aussi le nom du fichier source.


## Un backtick dans la connaissance du coach a cassé le build (31 août 2026)

Béné, en collant la sortie de son déploiement :

```
Build error occurred
./lib/coach/knowledge.ts:353:54  Expected a semicolon
```

J'avais écrit un nom de fichier entre backticks DANS une chaîne de
connaissance du coach. Ces chaînes sont des template literals : le
backtick l'a refermée, et tout ce qui suivait est devenu du code.

**Deux fautes, et la deuxième est la mienne, pas celle du code.**

1. `lib/coach/knowledge.ts` porte `import "server-only"` : aucun test ne
   peut le charger, donc `npm run test:logic` est passé au vert sur un
   fichier qui ne compile pas.
2. **Je n'ai pas relancé `npx tsc --noEmit` après la DERNIÈRE
   modification.** Je l'avais lancé avant, sur l'édition précédente, et
   j'ai poussé sur ce vert là. `tsc` voyait la faute : il l'a dit dès
   que je l'ai relancé. La consigne dit "avant CHAQUE push", pas "une
   fois dans la session".

**Garde-fou : `tests/logic/fichiers-server-only.test.mts`.** Il liste
tous les fichiers du dépôt qui portent `import "server-only"` (ceux
qu'aucun test ne pourra jamais importer, par construction) et les PARSE
avec le compilateur TypeScript. Un fichier qui ne se parse plus fait
rougir le filet logique au lieu de casser le build sur le serveur de
prod.

Ça ne remplace pas `tsc`, qui voit infiniment plus. Ça le double sur le
seul point qui a coûté quelque chose : une faute de frappe dans un gros
bloc de prose, dans un fichier que le filet logique ne touche jamais.

**Et dans ces blocs de prose : PAS DE BACKTICK.** Un nom de fichier s'y
écrit nu (`lib/affiliate/recompense.ts`, sans rien autour). Le test le
rattrape, mais autant ne pas l'écrire.

## Une vente PayPal paie sur le HT, comme une vente carte (Béné, 31 août 2026)

"Pour l'affiliation on fait uniquement 40 % etc. sur le HT. Débrouille
toi pour que sur PayPal ça marche aussi, il y a forcément un moyen de
calculer chez nous la TVA si concerné ou pas et le montant de la
commission, de manière fiable et stable."

**Le moyen existait déjà, il n'était pas branché.**

Le webhook PayPal envoyait `amountTaxCents: 0` et, juste à côté,
`base: "ht"` à Tipote. **Le champ disait "hors taxes", le nombre était
TTC.** Un paramètre obligatoire ne protège de rien quand on lui ment.

L'Atelier paie 70 %, donc c'est ici que l'écart est le plus gros : sur
une vente à 47 € TTC, **32,90 € versés au lieu de 27,42 €**. Ce sont
mot pour mot les deux chiffres du drame du 19 août, où l'app annonçait
32,90 € et payait 27,42 €. On avait corrigé ce que l'app ANNONCE ; le
chemin PayPal, lui, versait encore les 32,90 €.

**La TVA vient de la facture qu'on émet déjà.** Depuis le 25 août, c'est
nous qui facturons une vente PayPal, donc `construireFacture` résout
déjà le régime de l'acheteur (pays, numéro de TVA) et décompose le TTC.
`facturerVente` REND maintenant la facture qu'elle vient de construire,
et la commission lit son `tvaCents` (`lib/facture/taxeVentePaypal.ts`,
jumeau de celui de Tiquiz). Montant facturé et montant commissionné
sortent du MÊME calcul, par construction.

**On ne devine JAMAIS un taux.** Un acheteur belge, un professionnel en
autoliquidation et un acheteur hors UE n'ont pas la même taxe : un
`0.2` posé quelque part les paierait tous les trois faux. Le test
l'interdit.

**Sans facture, on retient et on crie.** Zéro voudrait dire "vente sans
TVA", ce qui serait faux neuf fois sur dix. On retient le taux du pays
du vendeur, et le journal le dit. Le sens du repli compte : il
SOUS-paie, ce qui se corrige au lot suivant, au lieu de SUR-payer, ce
qu'un virement parti ne rattrape jamais. Une taxe légitimement à zéro
(autoliquidation, hors UE) n'est PAS un repli : les confondre
sous-paierait de 20 % chaque vente professionnelle.

**Au passage :** la commission utilisait `commande.amountTotalCents`
(enregistré à la création de la commande) pendant que la facture
utilisait le montant de la CAPTURE (ce qui a vraiment été payé, une
remise comprise). Décomposer une TVA calculée sur un total et la
retirer d'un AUTRE donne une base fausse qui a l'air juste.
L'encaissement passe maintenant devant.

Test : `tests/logic/commission-ht-paypal.test.mts`, ici et chez Tiquiz.

## L'audit de l'Atelier (31 août 2026)

Béné : "reprends l'Atelier. Tipote pour le moment il passe au second
plan sauf pour tout ce qui est portage des améliorations Tiquiz."

Trois trous, et les trois avaient la même forme : **une correction faite
chez Tiquiz et jamais portée ici.** L'Atelier vend le panier le plus gros
avec la commission la plus forte, donc c'est ici que chacune coûtait le
plus.

### 1. UN RÉESSAI DE WEBHOOK NE POUVAIT PAS REPASSER

Le bug corrigé chez Tiquiz le 24 août, encore ouvert ici une semaine
plus tard.

Les deux webhooks de paiement écrivaient une ligne `received` AVANT de
travailler, et TOUT conflit sur l'index valait "déjà traité". Dès que le
traitement ÉCHOUAIT (Supabase indisponible une seconde, Stripe
injoignable, `grantAccessByEmail` qui rate), la route répondait 502 pour
demander un réessai, et **ce réessai était refusé par notre propre
journal** : ligne existante -> doublon -> 200 -> le fournisseur arrête.

**Une vente encaissée dont le premier traitement rate n'ouvrait donc
JAMAIS l'accès.** La page s'affiche, la carte passe, l'argent arrive, et
l'acheteur n'a rien. Quatre chemins répondaient 502 en comptant sur un
réessai impossible, dont le plus probable en pratique : `grant_failed`.

Le statut fait maintenant partie du verrou (`prendreLeVerrou` +
`marquerTraite`, décision pure dans `verrouRegles.ts`) : une ligne
`error` en SORT, donc le réessai suivant reprend.

**DEUX PIÈGES DANS LE PORTAGE, et les deux auraient cassé quelque
chose :**

1. **La colonne ne porte pas le même nom.** `created_at` ici,
   `received_at` chez Tiquiz. Recopié tel quel, le `select` échouait, la
   relecture du verrou répondait "je ne sais pas", donc 409, donc
   l'événement ne repassait PLUS JAMAIS. **Un fichier jumeau se relit
   contre le schéma d'arrivée, il ne se recopie pas.**
2. **L'index est PARTAGÉ avec le webhook Systeme.io**, qui écrit
   `received` et ne le change jamais. Lui appliquer le filtre de statut
   aurait SUPPRIMÉ sa protection anti-doublon : une relance de
   Systeme.io rouvrirait un accès et REPAIERAIT une commission. Les deux
   index sont donc séparés, et `logWebhookEvent` reste pour lui seul.

🚨 Migration : `supabase/migrations/20260831_webhook_lock.sql`
(Supabase de L'ATELIER).

Test : `tests/logic/verrou-webhook.test.mts`, qui vérifie AUSSI qu'il
attrape les deux régressions.

### 2. LES NUMÉROS DE TVA N'ÉTAIENT PAS VÉRIFIÉS

Corrigé chez Tiquiz le 27 août, jamais porté. `BE0123456789` est
parfaitement bien formé et n'appartient peut-être à personne : l'Atelier
lui accordait l'autoliquidation sur sa seule FORME.

**La même erreur passe deux fois à la caisse.** Sur une vente à 47 € :
7,83 € de TVA à la charge de Béné, découverts au contrôle des années
plus tard ; et, depuis le 31 août, la commission se calcule sur le HT de
cette facture, donc une TVA fautivement à zéro commissionne sur le TTC,
soit 5,48 € de trop à 70 %.

`vies` est un PARAMÈTRE OBLIGATOIRE de `resoudreTva` et de
`construireFacture` : le compilateur refuse un appelant muet. VIES ne
lève jamais et rend `injoignable` au bout de six secondes, donc **une
facture n'attend jamais après la Commission européenne** (règle du
7 août appliquée à la pièce comptable). Un avoir ne rejuge PAS la TVA de
la facture qu'il annule : `non-verifie` reproduit le calcul d'origine,
sinon les deux pièces ne se compenseraient plus.

**VIES N'EST PAS UNE BRIQUE D'AFFILIATION**, et la confusion est facile
parce que les deux sont arrivées le même jour. C'est la TVA des factures
que l'Atelier émet pour SES ventes PayPal (PayPal n'en émet aucune). Le
lien avec l'affiliation est indirect : la commission se calcule sur le HT
de cette facture.

Test : `tests/logic/vies-atelier.test.mts`.

### 3. L'ATELIER MONTRE, L'ESPACE AFFILIÉ GÈRE

Béné, le même jour : "attention : affiliation sur atelier montre les
données de affiliate mais les élèves de l'atelier doivent aller sur
affiliate pour tout gérer. **On gère tout sur affiliate et le reste
montre seulement.**"

Deux choses ne respectaient pas la règle.

**Un champ pour enregistrer son identifiant Systeme.io.** Il écrivait
dans le registre HISTORIQUE de l'Atelier (`profiles.sio_affiliate_id`),
pendant que l'espace affilié écrit dans le registre CENTRAL. Deux
endroits pour régler la même chose, avec deux effets différents. Le
champ est parti, et sa route `PATCH /api/me/affiliate` avec lui : une
porte sans appelant est une porte que le prochain passage rebranche en
croyant réparer. Ce qui est DÉJÀ enregistré reste lu (c'est le repli des
ventes des anciens tunnels) et s'affiche en lecture seule.

**Un relevé qui avait l'air complet et ne l'était pas.**
`getAffiliateGains` lit `affiliate_commissions` D'ICI, alimenté par le
webhook Systeme.io : il ne voit RIEN de ce qui passe par un lien `?ref=`
d'aujourd'hui. Or les libellés disaient "Total gagné (net)", "Versé
(estimé)", "Prochain versement estimé". Un élève qui vend par son lien
actuel lisait un relevé qui ne compte que ses vieilles ventes.

C'est la même famille que le tableau de bord affilié corrigé chez Tipote
le 31 août : **un chiffre qui a l'air d'être le total et qui ne l'est pas
coûte la confiance, et ça se découvre au premier versement.** L'écran le
dit maintenant en haut, en gras, et chaque libellé nomme Systeme.io.

Test : `tests/logic/atelier-montre-affiliate-gere.test.mts`.

## Les pages légales vivent sur NOTRE domaine (Béné, 31 août 2026)

"Il faut ajouter les pages légales de l'atelier sur le domaine de
l'atelier et renvoyer vers elles. On ne veut plus rien qui soit lié à
Systemeio tant qu'on peut l'éviter."

Les six liens du pied de page du bon de commande menaient à
`www.tipote.fr`, c'est à dire chez Systeme.io. Trois problèmes dans un :
un texte qu'on ne maîtrise pas, un domaine appelé à disparaître, et des
conditions qui parlaient de **Tipote** alors que l'acheteur commande
**l'Atelier**.

### Ce ne sont PAS les CGV de Tiquiz, et c'est le coeur du fichier

Recopier celles de Tiquiz aurait promis l'inverse de ce que la page de
vente annonce :

| | Tiquiz | l'Atelier |
|---|---|---|
| ce qui est vendu | un ABONNEMENT | un ACHAT UNIQUE, 47 € TTC, à vie |
| remboursement | "aucun remboursement" | **garantie 30 jours** |
| reconduction | automatique | aucune |

**RÈGLE : les CGV ne sont JAMAIS plus restrictives que la page de
vente.** Le bon de commande dit "Garantie 30 jours, sans poser de
questions" : l'article 7 dit donc exactement ça, sans condition de
résultat et sans justificatif. Le test compare les deux.

### LE TROU QUI EST FERMÉ AU PASSAGE

Nos CGV disent à l'article 6 "cette renonciation est recueillie sur le
bon de commande, avant le paiement". **Le bon de commande ne recueillait
rien du tout** : ni CGV, ni renonciation. C'est mot pour mot le drame du
22 août côté Tiquiz, un texte qui promet ce que l'écran ne fait pas.

La mention est rendue dans les **TROIS branches** du composant, pas
seulement la principale : la branche d'erreur carte et la branche sans
clé Stripe laissent toutes les deux payer par PayPal. Une règle recopiée
dans une seule branche finit toujours par en oublier une (leçon des 3
branches de `ConsentText`, 24 août). Le test compte les trois rendus, et
il a été vérifié qu'il rougit quand on en retire un.

Les liens sont des `<a target="_blank">`, jamais `<Link>` : un paiement
est en cours, et faire quitter la page fait tout reprendre.

### Ce qui n'est PAS recopié ici

**Les conditions du programme d'affiliation.** Elles sont maintenues à
UN seul endroit, l'espace affilié : "on gère tout sur affiliate et le
reste montre seulement". Une copie ici divergerait en une semaine, et
c'est celle qu'on ne maintient pas que l'affilié lirait. Le test exige
que la RAISON de cette exception reste écrite à côté.

### Monolingue, et c'est assumé

`getLegalPage(slug)` ne prend PAS de locale, contrairement à Tiquiz.
L'Atelier n'a ni `messages/` ni `next-intl` : une signature avec locale
laisserait croire à des traductions qui n'existent pas.

### Les sous-traitants ont été RELEVÉS DANS LE CODE

Supabase, Hostinger (Paris), Stripe, PayPal, Resend, Systeme.io,
Anthropic pour l'assistant, Google Analytics sur les pages de vente
(derrière le consentement, mode Consentement réglé sur refus par
défaut). Une politique qui nomme un sous-traitant qu'on n'utilise pas,
ou qui en oublie un qu'on utilise, est pire qu'une politique absente :
elle affirme.

### Et une faute trouvée sur la page où l'on sort sa carte

"Un email suffit : tu es **remboursée** dans la semaine." Un accord au
féminin sur le bon de commande, c'est un message qui dit "ce produit
n'est pas pour toi" trente secondes avant le paiement. La phrase est
TOURNÉE ("le remboursement part dans la semaine"), sa promesse est
inchangée, et le test la surveille sur les deux écrans d'achat.

Aucun aplat de couleur sous du texte sur ces pages : fond blanc, texte à
l'encre, un filet HORIZONTAL à la couleur de marque (règle du 31 août).

Test : `tests/logic/pages-legales.test.mts`.

## L'audit du 31 août : deux trous, dont un garde-fou écrit et jamais branché

### 1. LE DRAME VÉRONIQUE ÉTAIT VIVANT ICI

Le 2 août, une cliente de Tiquiz a demandé un nouveau mot de passe et
est tombée sur "localhost n'autorise pas la connexion". La cause :
`process.env.X ?? "https://..."`, avec la variable PRÉSENTE et absurde.
**Un `??` ne protège que du MANQUANT, jamais du FAUX.**

`lib/appUrl.ts` existe dans CE dépôt, il raconte ce drame dans son
en-tête, et il VALIDE ce qu'il trouve (il refuse localhost, 127.x, ::1,
.local, et retombe sur l'origine de la requête puis sur le domaine
canonique).

**Il n'était appelé par aucun des six fichiers qui fabriquent une
adresse vue par un humain :**

| Fichier | Ce qu'il produit |
|---|---|
| `app/api/auth/forgot/route.ts` | **le lien de réinitialisation de mot de passe** |
| `app/api/auth/magic-link/route.ts` | le lien de connexion sans mot de passe |
| `lib/access/grantAccess.ts` | les liens d'accès envoyés après un achat |
| `lib/email/templates.ts` | tous les emails |
| `app/api/plus-trial/widget/route.ts` | un widget INJECTÉ dans une page de vente |
| `app/api/integrations/tiquiz/callback/route.ts` | le retour du consentement Tiquiz |

Les six portaient leur propre cascade `APP_URL ?? NEXT_PUBLIC_APP_URL ??
"https://..."`, recopiée à l'identique. Le premier est mot pour mot le
cas de Véronique, sur le seul chemin dont dispose quelqu'un qui ne peut
plus se connecter.

Le retour OAuth était pire : il faisait `env || origine`, donc une
variable présente et fausse gagnait CONTRE l'origine réelle de la
requête.

**La leçon est celle du matin même, transposée :** écrire un garde-fou
n'est pas la dernière étape, vérifier qu'il est APPELÉ l'est. Il vivait
là, documenté, testé, et six fichiers passaient à côté.

### 2. UNE ADRESSE EMAIL CHERCHÉE AVEC UN JOKER

`maybeGrantPlusTrial` vérifiait l'idempotence du mois offert avec
`.ilike("sio_email", email)`. **Dans un LIKE Postgres, `_` est un
JOKER**, et `_` est parfaitement légal dans une adresse :
`jean_dupont@gmail.com` matchait donc `jeanXdupont@gmail.com`.

Sur un contrôle d'idempotence, un faux positif **REFUSE le cadeau à
quelqu'un qui ne l'a jamais reçu**, en silence, et personne ne le
découvre : l'acheteur ne sait pas qu'il devait recevoir deux mois de
Plus.

`.eq` est sûr ici parce que les trois écritures de `sio_email` passent
par la même variable, déjà `.trim().toLowerCase()`. **Cette condition
est ce qui rend la correction valable, donc elle est testée elle
aussi** : une future écriture non normalisée fait rougir le test.

**Règle générale : une adresse email se compare, elle ne se filtre
jamais par motif.** `ilike` sur une donnée reçue de l'extérieur mélange
comparaison et recherche.

Test : `tests/logic/audit-atelier-31-aout.test.mts`. Les deux
assertions ont été vérifiées en rejouant la version d'avant : elles
rougissent.

## Le bonus et le certificat : deux identités qu'on pouvait perdre (31 août 2026)

Béné : "tu as fini tous les audits ? Je peux envoyer des clients et des
affiliés sans risque sur chaque page ? Tout le monde reçoit ce qu'il
paye ?"

Deux trous, et les deux ont la forme habituelle : une logique écrite
pour un cas, appliquée telle quelle à un autre.

### 1. ÊTRE CONNECTÉ N'EST PAS ÊTRE INSCRIT

Quatre points d'entrée regardent `viewer.enrolled` : le parcours, le
coach, l'audit de quiz, le certificat. **Le générateur de bonus, le
plus long et le plus cher de tous, ne le regardait pas.**

Ça ne se voyait pas parce que l'Atelier n'a **aucune inscription
publique** (vérifié : pas de route `signup`, et `generateLink` de type
`magiclink` ne crée pas de compte). Tout compte a donc payé. Mais un
REMBOURSEMENT pose `enrollments.status = 'revoked'` et **ne supprime
pas le compte** (`revokeAccessByEmail`) : la session reste valide.
Quelqu'un qui s'est fait rembourser gardait donc la génération de
bonus, sans aucune limite journalière, quand tout le reste s'était
fermé pour lui.

`/api/me/affiliate-generate` reste ouvert aux connectés, et c'est
VOULU : on peut être affilié sans être élève, et cette route porte
déjà une limite de 30 générations par jour et par personne. Un
remboursement de la formation ne retire pas le statut d'affilié.

### 2. UNE LECTURE QUI ÉCHOUE N'EST PAS UN CERTIFICAT QUI N'EXISTE PAS

`/api/certificat/claim` lisait le certificat existant en ignorant
l'erreur du `select`. Une panne d'une seconde rendait donc `existing`
à `null`, donc on fabriquait un NOUVEAU jeton de partage et on allouait
un DEUXIÈME numéro, puis l'upsert écrasait les anciens.

**Un certificat s'imprime et se partage.** Son lien `/cert/<jeton>`
répondait alors 404 pour tous ceux qui l'avaient déjà reçu, et son
numéro changeait sous les yeux de l'élève. C'est la règle du 23 août :
"je n'ai pas pu regarder" et "il n'y a rien" sont deux réponses
différentes, et ici la confondre coûte une identité.

Le jeton est passé en `const` : rien ne doit pouvoir le réassigner.

Test : `tests/logic/audit-atelier-bonus-certificat.test.mts`.

### Ce que l'audit a vérifié sans rien trouver

À écrire, parce qu'une zone auditée et muette ressemble à une zone
oubliée :

- **le QR du certificat** porte bien `?ref=` vers `atelierduquiz.fr`
  (`lienAffilieDeLEleve`), plus aucun `?sa=` ni tunnel Systeme.io ;
- **la page publique `/cert/<jeton>`** ne lit que `full_name` et
  `cert_number` : elle tourne en service_role, un `select("*")` y
  sortirait le `user_id` et le lien affilié à n'importe quel visiteur ;
- **la connexion Tiquiz** (`/api/integrations/tiquiz/*`) : `state`
  anti-CSRF en cookie `httpOnly`, échangé auprès du MÊME domaine que
  celui qui l'a émis, retour construit par `resolveAppUrl`, et le
  garde-fou du drame Jocelyne (un compte SANS le moindre quiz n'est
  jamais relié en silence) toujours en place ;
- **les 4 portes partenaires** de ce dépôt comparent leur secret avec
  `safeEqual`, jamais avec `!==` ;
- **plus aucun `.ilike`** dans le code de ce dépôt.


## La date d'une vente ne bouge pas parce qu'un webhook a été réessayé (31 août 2026)

Trouvé en relisant le verrou de webhook posé le matin même, dans le
même audit.

Quand un traitement mourait en route, la reprise repoussait
`webhook_logs.created_at` pour que la reprise suivante ne passe pas par
dessus la nôtre. C'était le bon geste sur la MAUVAISE COLONNE :

> `created_at` EST LA DATE DE LA VENTE partout ailleurs.
> `buildSales` (`lib/checkout/sales.ts`) en fait le `paidAt`, et l'écran
> de pilotage de Béné trie dessus.

Un réessai déplaçait donc une vente d'août au jour de la reprise, en
silence, et la faisait remonter en tête de sa liste. Le chiffre du mois
devenait faux sans qu'aucune ligne ne le dise.

**Règle : le battement de coeur du verrou a sa propre colonne**
(`webhook_logs.locked_at`). `lireVerrou` la préfère et retombe sur
`created_at` pour les lignes écrites avant elle, donc rien de ce qui
existe ne bouge.

**Les deux écritures se replient sur l'ancienne forme** quand la colonne
n'est pas encore en prod (`colonneInconnue`, `PGRST204`) : PostgREST
rejette l'écriture ENTIÈRE sur une colonne inconnue, donc sans repli un
déploiement en avance sur la migration ferait échouer la PRISE DU VERROU
de tous les paiements. Et la relecture fait `select("*")` : nommer
`locked_at` ferait échouer toute la requête, donc rendrait le verrou
illisible, donc l'événement ne repasserait plus jamais.

🚨 Migration : `supabase/migrations/20260831_webhook_lock_locked_at.sql`
(Supabase de l'ATELIER). Elle ajoute une colonne nullable et refait un
index : aucune donnée n'est réécrite.

Test : `tests/logic/audit-atelier-bonus-certificat.test.mts`.


## L'acheteur de l'Atelier n'entrait dans aucune séquence email (31 août 2026)

Béné : "du coup c'est bon aussi pour les ventes ? Les bons tags seront
attribués aux bons acheteurs ?"

Pour l'Atelier, la réponse était NON, et pas par accident : **le bon de
commande n'a jamais posé la moindre tag Systeme.io**, ni par
carte ni par PayPal. L'en-tête du webhook le disait lui même, "le tag
Systeme.io n'est pas encore branché".

Les emails restant chez Systeme.io, un acheteur non taggé sort de
toutes les séquences : pas de bienvenue, pas de relance, pas de
segment. Et le symptôme est l'absence de symptôme, puisque son accès et
sa facture, eux, arrivent normalement. C'est le trou que Tiquiz a
bouché le 22 août, resté ouvert ici pendant que l'Atelier vendait.

**Le tag est `atelier-clients`**, choisie par Béné le 31 août :
celle que portent déjà ses clients. Les tags qui commencent par
`ads-` ne nous concernent PAS ("c'est un test en pub qui ne nous
concerne pas"), et il n'y a pas d'upsell sur l'Atelier.

**On DEMANDE à Tiquiz, on ne recopie pas.** Tout ce qui sait parler à
Systeme.io vit là-bas : la clé du compte propriétaire, la création du
contact avec ses champs de facturation, la recherche PAGINÉE
des tags (sans laquelle un tag ancien est introuvable, cf.
la panne de la newsletter du 31 août). Le recopier donnerait deux
implémentations qui divergent, ce que ces dépôts ont déjà payé quatre
fois, et une deuxième clé à maintenir. La porte est
`POST /api/partner/tag` chez Tiquiz, `x-partner-secret`.

**Trois choses à ne pas défaire :**

- **le tag vient APRÈS l'accès ET après la commission.** Une
  tag qui échoue ne doit priver personne de ce qu'il a payé
  (règle du 7 août), ni retarder l'argent d'une affiliée ;
- **le délai maximum de 8 s.** Sans lui, une panne de Tiquiz garderait
  le webhook de paiement ouvert jusqu'à ce que la plateforme le tue
  (leçon de `commissionnerVente`, audit du 24 août) ;
- **le tag est un PARAMÈTRE de `poserTagAcheteur`**, pas une
  constante lue à l'intérieur : le jour où l'Atelier vend autre chose,
  l'appelant devra dire quoi, au lieu qu'une valeur par défaut
  tag silencieusement de travers.

Côté PayPal, l'identité envoyée est celle de la FACTURE qu'on vient
d'émettre, jamais un profil relu à côté : c'est la même donnée que
celle imprimée sur sa pièce comptable.

**`PARTNER_SHARED_SECRET` doit être posée sur CE serveur**, avec la
même valeur que chez Tiquiz. Elle l'est déjà (le pont métriques et le
pilotage s'en servent) ; sans elle, le tag n'est pas posée et ça
crie dans `pm2 logs`.

Test : `tests/logic/tag-acheteur-atelier.test.mts`.

## ON DIT TAG, JAMAIS ÉTIQUETTE (Béné, 1er septembre 2026)

"Ne dis jamais étiquette, nulle part, on parle bien de tag en français
aussi. Supprime tout ce que tu appelles étiquette partout pour dire tag,
et mets tags bordel !"

**La raison est produit, pas stylistique : c'est le mot que Systeme.io
affiche.** Son menu CRM en français dit "Tag". Une consigne qui dit
"étiquette" envoie la créatrice chercher un mot qui n'existe pas sur son
écran, au moment précis où elle suit une marche à suivre clic par clic.

**Et ça vaut par LANGUE, pas dans l'absolu.** Vérifié sur ses captures du
tableau de bord Systeme.io :

| Langue | Ce que Systeme.io affiche | Ce qu'on écrit |
|---|---|---|
| français, italien, portugais, anglais | Tag | **tag** |
| **espagnol** | Etiquetas | **etiqueta** |

L'espagnol est la seule exception, et elle est OBLIGATOIRE : y écrire
"tag" rendrait la consigne fausse, puisque le bouton qu'elle doit
cliquer s'appelle "Etiqueta añadida". L'arabe n'a pas été vérifié.

**La nuance à ne pas rater : "étiquette" au sens LIBELLÉ n'est pas un
tag.** Le libellé min/max d'une échelle, le "conversion label" de Google
Ads, le mot affiché à la place d'un score : ce ne sont pas des tags
Systeme.io. On y écrit **libellé**, pas "tag", sinon on rend le texte
faux dans l'autre sens.

Ça couvre aussi le CODE : un fichier `etiquetteVente.ts` et une fonction
`poserEtiquetteAcheteur` disaient le mot interdit. Renommés en
`tagVente.ts` et `poserTagAcheteur`.

**ET LA FAUTE QUE J'AI FAITE EN L'APPLIQUANT, qui vaut plus que la
règle :** j'ai remplacé le mot partout d'un coup, sans relire les
phrases. "Étiquette" est féminin, "tag" est masculin : le dépôt s'est
retrouvé avec "un tag posée", "le tag exacte", "de le tag", "aucune tag
manquante". Et là où le mot voulait dire LIBELLÉ, le texte est devenu
faux : la largeur d'un axe de graphique "réserve la largeur des tags",
l'orientation EXIF d'une photo devenait "un tag tourne-moi de 90
degrés". Réparé le jour même, mais le geste était mauvais.

**Un remplacement de mot n'est pas une opération mécanique.** Un mot
porte un GENRE (donc des accords à refaire) et un SENS (donc des
endroits où il ne s'applique pas). Le contrôle à faire après, et pas
avant :

```bash
grep -rnE "(une|nouvelle|cette|aucune|toute) tags?|tags? (créée|posée|manquante|exacte|courte|ancienne|inconnue)|de le tag" . --exclude-dir=node_modules
```

Zéro ligne, sinon on a laissé une phrase cassée derrière soi.

## Le SEO d'atelierduquiz.fr : quatre défauts, constatés en ligne (1er septembre 2026)

**1. La page servait DEUX balises `<title>`.** `stripHeadTags` visait
`<title>` NU, alors que Systeme.io publie
`<title data-react-helmet="true">` : le retrait ne mordait pas, et
Google choisissait lui même lequel afficher. **Le dépôt Tiquiz portait
la même regex fautive** : les deux `lib/sales/servePage.ts` sont
jumeaux, toute correction de l'un se porte sur l'autre.

**2. Quatre liens partaient chez `www.tipote.fr`** : sa propre copie,
les mentions légales, la confidentialité et les CGV. Le BOUTON D'ACHAT
était déjà réglé le 21 août (`rewriteOrderButtons`) ; c'est la
NAVIGATION que personne n'avait relue. Depuis la page qui doit
remplacer l'ancienne, un lien vers l'ancienne la désigne comme celle
qui fait autorité. 17 liens réécrits sur la capture.

**LES DESTINATIONS SONT NOS VRAIES ROUTES.** Les chemins de Systeme.io
(`/mentions-legales`, `/politique-de-confidentialite`,
`/atelier-du-quiz-cgv`) n'existent PAS chez nous : les recopier aurait
posé des 404 dans le pied de page de la page qui vend. Nos pages sont
`/legal`, `/privacy` et `/terms`.

`rewriteSiteLinks` traite aussi les `href` ÉCHAPPÉS et les clés
`"link"` / `"linkUrl"` du modèle JSON : ce sont celles que l'éditeur
Systeme.io relit pour reconstruire ses blocs.

**Rien de tout ça ne s'applique derrière la clé d'aperçu** : la page est
alors un chantier, et son pied de page doit continuer de désigner ce qui
est en ligne.

**3. Ni `robots.txt` ni `sitemap.xml`.** `atelierduquiz.fr/sitemap.xml`
répondait 404. Rien n'interdisait l'exploration, mais rien ne l'aidait :
le seul chemin de Google jusqu'aux pages légales était un lien de pied
de page, et ce sont précisément les pages qu'un acheteur méfiant va
vérifier.

**LE SITEMAP NE LISTE AUCUN CERTIFICAT**, et c'est le point à ne pas
défaire : chaque `/cert/<jeton>` porte le jeton d'une personne réelle,
et une liste de jetons est une liste de clients. Ils restent indexables
un par un, c'est leur page qui le décide ; on ne publie pas l'annuaire.

**4. Aucune donnée structurée hors `FAQPage`.** Rien ne disait à un
moteur que ce domaine EST le site de "l'Atelier du Quiz" : sur une
requête de marque, la page n'était qu'un document parmi d'autres qui
contient ces mots. Elle déclare maintenant `Organization`, `WebSite` et
`Course`.

**LE TYPE COMPTE.** L'Atelier est une FORMATION de sept jours, pas un
logiciel : annoncer `SoftwareApplication` (ce qu'est Tiquiz) serait pire
que ne rien annoncer, parce qu'un moteur qui lit une contradiction cesse
de faire confiance au reste du bloc. `hasCourseInstance` est EXIGÉ par
Google pour qu'un `Course` soit valide, et on n'y invente aucun
calendrier : un cours qu'on suit quand on veut se décrit "online" et
sans date.

**LE PRIX VIENT DU CATALOGUE**, jamais recopié : un tarif écrit dans le
JSON-LD et un tarif au bon de commande finiraient par diverger, et c'est
Google qui afficherait l'ancien, longtemps après la correction.

**La marque ne se déclare QUE sur sa page officielle** : deux pages qui
prétendent être le site de référence se font concurrence sur exactement
la même requête.

Test : `tests/logic/seo-page-vente.test.mts`, qui porte sur la VRAIE
capture. Un test qui n'exercerait qu'une chaîne écrite à la main aurait
été vert le jour du bug.


## Cloudflare masquait les adresses des pages légales (3 septembre 2026)

L'option « Email Address Obfuscation » (Scrape Shield) remplace toute
adresse email du HTML **SERVI** par
`<span class="__cf_email__">[email protected]</span>` plus un script qui
la reconstruit. Un lecteur qui n'exécute pas le JavaScript lit donc une
politique de confidentialité **sans aucune adresse de contact** : le
validateur OAuth de Google, un robot d'indexation, un lecteur d'écran en
mode dégradé.

**MESURÉ le 3 septembre, avec l'agent de Googlebot, en production :**

| | |
|---|---|
| `app.tipote.com/legal/privacy` | **5 masquées sur 5** |
| `app.tipote.com/legal/extension` | 1 |
| `atelierduquiz.fr/privacy` | 1 |
| `atelierduquiz.fr/legal` | 1 |
| `tiquiz.fr/privacy` | 0, corrigé le 2 septembre |

**Tiquiz avait été corrigé SEUL**, et c'est la faute qui compte : un
garde-fou qui ne protège qu'un des jumeaux ne protège personne. Le
composant `components/legal/SansObfuscationEmail.tsx` et le test
`tests/logic/emails-pas-masques.test.mts` vivent maintenant dans les
trois dépôts.

**Ça ne se voit QUE sur la page rendue**, jamais dans le dépôt : c'est
un intermédiaire qu'on oublie parce qu'il ne nous appartient pas. Même
famille que les images en 403 du 31 août, où la configuration était
juste et adressée au mauvais serveur.

Les deux marqueurs `<!--email_off-->` / `<!--email_on-->` sont la
directive OFFICIELLE de Cloudflare pour laisser une zone intacte. Ils ne
changent rien à l'affichage, et ils sont sans effet si l'option est
désactivée un jour.

**Le test lit la SOURCE, pas la page rendue** : le rendu dépend de
Cloudflare, qu'aucun runner ne peut interroger. Il fige que l'enveloppe
est posée, que la raison reste écrite à côté, et **que les écrans
surveillés portent encore une adresse** : un test qui ne peut plus
échouer ment.

## La mise en forme en ligne vivait en DEUX copies (3 septembre 2026)

Béné, en portant le labo bonus vers Tiquiz : "je veux exactement la même
chose sur l'atelier et sur tiquiz. Pareil. Ni plus, ni moins."

En le portant, une divergence est sortie ICI, et elle était déjà là.

`inline()` existait dans `components/BonusDocument.tsx` ET dans
`lib/bonus/printable.ts`, sous ce commentaire du second : "la MEME mise
en forme qu'a l'ecran". **C'était faux, et c'est mesurable :** l'écran
échappait `&`, `<` et `>` ; l'impression échappait aussi le guillemet
double, via son `esc()`.

Or ce texte vient d'un MODÈLE, donc d'ailleurs, et il finit dans un
`innerHTML`. C'est une règle de sécurité : une copie qui prend du retard
sur l'autre, c'est une porte ouverte d'un seul côté, et personne pour le
dire.

**Règle : `inline(texte, cible)` vit dans `lib/bonus/document.ts`, en un
seul exemplaire.** `cible` est un PARAMÈTRE (`"ecran"` ajoute
`target="_blank" rel="noopener noreferrer"`, `"impression"` non) : c'est
le seul écart légitime entre les deux rendus, et le déduire de
l'appelant marcherait aujourd'hui et casserait au premier troisième
appelant.

**ET LA VRAIE RAISON DU DÉPLACEMENT : une règle enfermée dans un `.tsx`
n'est pas testable.** Les deux tests qui la surveillaient
(`tests/logic/bonus-editor.test.mts`) lisaient la SOURCE du composant
avec des regex, faute de pouvoir l'importer :

```
assert.match(ecran, /https\?:\\/\\//, "seuls http, https, mailto et les chemins passent");
```

Ils figeaient donc une ÉCRITURE, pas un comportement : rien ne vérifiait
qu'un `javascript:` était vraiment refusé. Ils APPELLENT la fonction
maintenant, sur les deux cibles, avec `data:` et `vbscript:` en plus.

Les cinq fichiers du labo (`document.ts`, `accents.ts`,
`markdownHtml.ts`, `printable.ts`, `BonusDocument.tsx`) sont désormais
identiques à l'octet près dans les TROIS dépôts. Le garde-fou est une
commande :

```bash
cmp lib/bonus/document.ts ../tiquiz/lib/bonus/document.ts
```

Toute évolution de l'un se porte dans les deux autres, sinon le rendu et
le PDF finissent par ne plus se ressembler d'une app à l'autre.
