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
et le contact chez Systeme.io avec son étiquette.

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
