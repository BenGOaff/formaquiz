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
npm run build
pm2 restart formaquiz-prod --update-env
```

Tu prends ma branche, tu copies le code dans ton dossier local, tu pousses
sur `main`, puis le serveur tire `main`. `main` est donc la branche de
PROD, et je n'y touche jamais : je pousse sur ma branche, tu fais le
reste.

**Ce que ça implique pour moi, et c'est le point à ne pas oublier :**

- Le copier-coller ne détecte pas les FICHIERS NOUVEAUX ni les
  SUPPRESSIONS. **Quand j'ajoute ou je supprime un fichier, je le dis
  explicitement dans mon message final**, avec son chemin. Sinon il
  n'arrive jamais en prod et on cherche pendant une heure pourquoi une
  commande "n'existe pas".
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
