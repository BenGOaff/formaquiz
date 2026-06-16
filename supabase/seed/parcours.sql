-- ════════════════════════════════════════════════════════════════
-- FORMAQUIZ — seed complet du parcours (preparation + 14 jours + bonus)
-- ════════════════════════════════════════════════════════════════
--
-- Source : contenu/parcours/*.md et contenu/structure/PROGRAMME-14-jours.
-- Regle d'or : la video enseigne, le quiz fait agir. Chaque "mission du
-- jour" devient les questions. Types autorises uniquement : action,
-- decision, self_eval, recall. Tutoiement, zero tiret long.
--
-- Idempotent : days upsert par day_number ; questions inserees seulement
-- si (day_id, sort_order) n'existe pas deja. video_url reste NULL (tu
-- charges les videos depuis l'admin).
--
-- NB : re-executer ce fichier ECRASE le contenu des jours seedes (title,
-- intro, resultat). A faire AVANT de personnaliser tes jours dans l'admin.

-- ───────────────────────────────────────────────────────────────
-- 1. Les jours
-- ───────────────────────────────────────────────────────────────
insert into days (day_number, slug, title, subtitle, intro_html, result_html, status, sort_order, resources)
values
(
  -3, $s$preparation-bienvenue$s$, $t$Bienvenue, on pose les bases$t$, $st$Avant le coup d'envoi$st$,
  $html$<p>Si tu es là, c'est que tu en as marre de créer du contenu, capter trois curieux, et te demander pourquoi rien ne décolle. Dans 14 jours, tu auras un quiz en ligne qui capte des leads qualifiés en automatique. Pas dans six mois, dans 14 jours.</p>
<h2>La règle du jeu</h2>
<ul>
<li>Une mission par jour, une seule. 20 à 40 minutes.</li>
<li>Une vidéo qui enseigne, un quiz qui te fait agir sur TON projet.</li>
<li>Ton quiz est en ligne dès le jour 7.</li>
<li>On partage dans la communauté : c'est ce qui fait qu'on va au bout.</li>
</ul>
<p>Promesse de système, pas promesse de million. Tu n'as pas besoin d'être tech ni d'avoir une grosse audience.</p>
<p>Deux choses à faire maintenant, 2 minutes : créer ton compte Tiquiz gratuit, et rejoindre la communauté en te présentant en une phrase.</p>$html$,
  $html$<p>Ravie de t'avoir avec nous. Tu viens de poser les bases : ton compte est prêt et tu sais comment ça marche.</p>
<p>Juste après, on scelle un truc ensemble qui change tout sur ta capacité à aller au bout : le pacte.</p>$html$,
  $st2$published$st2$, 10, $r$[]$r$::jsonb
),
(
  0, $s$le-pacte$s$, $t$Le pacte$t$, $st$L'engagement qui change tout$st$,
  $html$<p>Les gens qui finissent un challenge et ceux qui abandonnent, la différence, ce n'est pas la motivation. C'est un engagement pris à voix haute, devant les autres.</p>
<h2>L'état d'esprit du challenge</h2>
<ul>
<li>On agit avant d'être prêt. On publie imparfait, on corrige après.</li>
<li>Le quiz parfait qui reste en brouillon ne rapporte rien.</li>
<li>Tu n'as pas besoin de tout comprendre, juste de faire la mission du jour.</li>
</ul>
<p>L'engagement à prendre, devant la communauté : "Je m'engage à publier mon quiz d'ici le jour 7."</p>$html$,
  $html$<p>Pacte signé. Tu viens de multiplier tes chances d'aller au bout, juste en le disant tout haut.</p>
<p>Demain, on attaque le vrai sujet : pourquoi un quiz va te ramener plus de leads que tout ce que tu as essayé avant.</p>$html$,
  $st2$published$st2$, 20, $r$[]$r$::jsonb
),
(
  1, $s$jour-1-pourquoi-un-quiz$s$, $t$Le déclic$t$, $st$Pourquoi le quiz écrase tous les autres lead magnets$st$,
  $html$<p>Ton PDF gratuit, presque personne ne le lit. Ton webinaire, la moitié des inscrits ne viennent pas. Ta page de capture transforme un visiteur sur cinquante. Ce n'est pas toi le problème, c'est le format.</p>
<h2>Ce que le quiz fait de différent</h2>
<ul>
<li><strong>Interactif</strong> : le prospect participe au lieu de subir.</li>
<li><strong>Il qualifie</strong> : tu apprends qui il est pendant qu'il répond.</li>
<li><strong>Il segmente</strong> : chaque réponse est une info que tu peux taguer.</li>
<li><strong>Il est viral</strong> : on partage son résultat, jamais son PDF.</li>
<li><strong>Il est rapide</strong> : 5 minutes avec Tiquiz, contre des jours pour un tunnel.</li>
</ul>
<h2>Les maths qui changent tout</h2>
<p>Une page de capture classique : 1 à 3 leads pour 100 visiteurs. Un bon quiz : couramment 20 à 50 leads pour 100 visiteurs. Ce sont des fourchettes, ça dépend de ton quiz et de ta cible. On ne garantit pas un chiffre, on installe un système dont les maths jouent pour toi.</p>
<p>[[figure:quiz-maths]]</p>
<h2>Le miroir d'identité</h2>
<p>Les quiz qui cartonnent ne notent pas, ils révèlent une identité. "Tu es un Visionnaire" se partage. "Tu as eu 6 sur 10" se cache. Donc on bannit la logique bonne ou mauvaise réponse, on révèle un type.</p>
<p>Ta mission d'aujourd'hui, la plus importante de la semaine : quelle transformation ton audience cherche vraiment ?</p>$html$,
  $html$<p>Bravo, tu viens de poser la première pierre de ton quiz : ton angle pressenti et ton archétype.</p>
<p>Garde ta phrase de transformation sous les yeux, c'est elle qui guidera tout le reste. Demain, on creuse ta cible jusqu'à la connaître mieux qu'elle ne se connaît elle-même.</p>$html$,
  $st2$published$st2$, 30, $r$[]$r$::jsonb
),
(
  2, $s$jour-2-objectif-cible$s$, $t$L'objectif et la cible$t$, $st$Les décisions à prendre avant de toucher à l'outil$st$,
  $html$<p>La plupart des gens ouvrent l'outil et commencent à écrire des questions. Grave erreur. Un quiz qui rapporte se décide avant.</p>
<h2>Fixe l'objectif n°1</h2>
<p>Quatre objectifs possibles : capter des leads, qualifier, segmenter, ou vendre direct. Tu en choisis UN principal. On ne part pas du thème, on part de la vente qu'on veut faire, et on remonte. La phrase boussole : "Après mon quiz, le prospect réalise que ______ et donc mon offre devient la suite logique."</p>
<h2>Connais ta cible, et vole son langage</h2>
<ul>
<li>Trois douleurs, trois désirs, pas tes suppositions.</li>
<li>Récupère ses vrais mots : avis Amazon, commentaires YouTube, posts dans les groupes. Tu copies les phrases qui reviennent, mot pour mot.</li>
</ul>$html$,
  $html$<p>Tu as ta boussole : ton objectif et les vrais mots de ta cible. C'est ce qui va rendre tout ton quiz juste.</p>
<p>Demain, on transforme ça en résultats de quiz, et tu vas voir pourquoi on écrit les résultats AVANT les questions.</p>$html$,
  $st2$published$st2$, 40, $r$[]$r$::jsonb
),
(
  3, $s$jour-3-angle-resultats$s$, $t$Les résultats avant les questions$t$, $st$La méthode inversée qui fait tenir ton quiz$st$,
  $html$<p>Le truc contre-intuitif que presque personne ne fait : on écrit les résultats AVANT la moindre question.</p>
<h2>Pourquoi à l'envers</h2>
<p>Si tu pars des questions, tu obtiens un quiz fouillis qui ne trie rien. Si tu pars des profils de sortie, chaque question sert à orienter vers le bon profil. Retiens la chaîne : chaque résultat = un segment = un tag Systeme.io = une offre.</p>
<p>[[figure:chaine-resultat]]</p>
<h2>3 ou 4 profils, flatteurs mais actionnables</h2>
<ul>
<li>Pas plus de 4, pour rester clair.</li>
<li>Un nom d'identité désirable, jamais une note. Même le débutant devient "l'Explorateur qui a tout l'élan".</li>
<li>Chaque profil : une force reconnue + un prochain pas clair. Un résultat qui juge tue tout.</li>
</ul>$html$,
  $html$<p>Tes profils sont posés, avec un tag et un CTA chacun. Le squelette de ton quiz existe déjà.</p>
<p>Demain, on rentre dans Tiquiz et en 30 secondes l'IA te génère ton quiz complet. Le quick win commence.</p>$html$,
  $st2$published$st2$, 50, $r$[]$r$::jsonb
),
(
  4, $s$jour-4-generation-ia$s$, $t$La génération IA en 30 secondes$t$, $st$Le quick win : ton quiz généré par l'IA de Tiquiz$st$,
  $html$<p>Le moment que tu attends. En 30 secondes, l'IA de Tiquiz te génère un quiz complet : titre, intro, questions, résultats. Mais il y a une façon de lui parler qui fait toute la différence.</p>
<h2>Le prompt à 3 couches</h2>
<ul>
<li><strong>Cible</strong> : qui (reprends ta fiche cible).</li>
<li><strong>Transformation</strong> : de quel état à quel état (ta phrase d'objectif).</li>
<li><strong>Ton</strong> : chaleureux, expert, fun.</li>
</ul>
<p>Compare un "fais-moi un quiz sur le yoga" générique avec un brief à 3 couches : l'écart est énorme.</p>
<h2>Garde ce qui est bon</h2>
<p>C'est un point de départ, pas un point final. Tu génères, tu gardes ce qui te plaît, tu repères ce qui cloche. On affine demain, aujourd'hui tu ne fais que dégrossir.</p>$html$,
  $html$<p>Ton quiz existe, en brouillon, né en 30 secondes. Ça fait quelque chose, hein ?</p>
<p>Demain, on le rend vraiment toi : on ajuste les 10% qui comptent et on place la capture au bon endroit.</p>$html$,
  $st2$published$st2$, 60, $r$[]$r$::jsonb
),
(
  5, $s$jour-5-affiner$s$, $t$Affiner sans tout réécrire$t$, $st$Les 10% qui font que c'est toi, et le réglage qui double tes leads$st$,
  $html$<p>Erreur classique : tout réécrire à la main pour que ce soit parfait. Non. L'IA a fait 90% du boulot. Ton job, c'est les 10% qui font que c'est toi.</p>
<h2>Le réglage qui change tout : la capture au pic de curiosité</h2>
<p>La plupart demandent l'email au début, et le perdent. Place la capture juste avant le résultat, formulée comme "où on t'envoie ton profil détaillé ?". À ce moment, le prospect a tout répondu, il meurt d'envie de savoir. C'est LE réglage qui fait le plus bouger ton taux de leads.</p>
<p>[[figure:capture-pic]]</p>
<h2>Trois autres gestes</h2>
<ul>
<li>Première question facile et fun, jamais un champ email.</li>
<li>Réordonne du plus léger au plus engageant.</li>
<li>Active la personnalisation dynamique (prénom, forme tu/vous).</li>
</ul>
<p>Ne passe pas trois heures à fignoler. Le quiz n'a pas besoin d'être parfait, il a besoin d'être en ligne.</p>$html$,
  $html$<p>Ton quiz est relu, réordonné, personnalisé, et ta capture est au bon endroit. Le plus dur est fait.</p>
<p>Demain, on l'habille à tes couleurs et on le teste sur mobile, parce que c'est là que tout se joue.</p>$html$,
  $st2$published$st2$, 70, $r$[]$r$::jsonb
),
(
  6, $s$jour-6-branding-mobile$s$, $t$Le branding et le mobile$t$, $st$Mets-le à ton image, et impeccable sur téléphone$st$,
  $html$<p>Un quiz qui inspire confiance se fait en deux minutes, et la majorité des gens le verront sur leur téléphone, pas sur ton bel écran.</p>
<h2>Branding rapide</h2>
<p>Couleur primaire, couleur de fond, police Google, logo. Quelques clics. Reste simple : un quiz lisible bat un quiz surchargé.</p>
<h2>Le mobile d'abord, pour de vrai</h2>
<p>Fais le quiz en entier sur ton téléphone. Coupe les textes qui scrollent trop, les images qui rament. C'est non négociable, la majorité des réponses viennent du mobile.</p>
<p>Pour pousser : soigne l'image de résultat partageable et l'image OG (l'aperçu au partage), deux détails que presque personne ne touche et qui changent le taux de clic.</p>$html$,
  $html$<p>Ton quiz est à ton image et il tourne nickel sur mobile. Il est prêt à recevoir du monde.</p>
<p>Demain, c'est le sommet : on branche Systeme.io, on configure les tags, et on PUBLIE. Repose-toi bien.</p>$html$,
  $st2$published$st2$, 80, $r$[]$r$::jsonb
),
(
  7, $s$jour-7-publier$s$, $t$Brancher Systeme.io et publier$t$, $st$Jalon majeur : ton quiz devient une machine$st$,
  $html$<p>C'est le jour 7. Le jour où ton quiz arrête d'être un projet et devient une machine.</p>
<h2>Les étapes, dans l'ordre</h2>
<ul>
<li>Récupère ta clé API Systeme.io et colle-la dans Tiquiz.</li>
<li>Configure les tags : tag de capture (le minimum), tag par résultat, tag de partage. Rappelle la chaîne : résultat = tag = segment = offre.</li>
<li>Publie, récupère ton lien court, et fais le quiz toi-même de bout en bout.</li>
<li>Vérifie que ton contact arrive bien taggué dans Systeme.io.</li>
</ul>
<p>Pour pousser : le tag par réponse (presque personne ne l'utilise) pour router tes prospects les plus chauds plus tard.</p>
<p>Puis tu postes ton lien dans la communauté et tu vas faire les quiz des autres.</p>$html$,
  $html$<p>Ton quiz est PUBLIÉ et il capture des leads en automatique. Tu as fini la première semaine, bravo, vraiment.</p>
<p>La semaine prochaine, on le remplit de monde. Pense à poster ton lien dans la communauté.</p>$html$,
  $st2$published$st2$, 90, $r$[]$r$::jsonb
),
(
  8, $s$jour-8-viralite$s$, $t$Activer la viralité$t$, $st$Transformer chaque participant en source de nouveaux participants$st$,
  $html$<p>Ton quiz capture. Maintenant on fait un truc que ton PDF ne pourra jamais faire : transformer chaque personne qui le fait en source de nouvelles personnes.</p>
<h2>Le bonus à valeur asymétrique</h2>
<p>Entre la capture et le résultat, Tiquiz propose "partage pour débloquer ton bonus". Le bon bonus coûte zéro à livrer mais vaut cher aux yeux du prospect : un PDF, un mini-cours déjà fait, un accès. Un actif que tu as déjà, pas un truc à reproduire à chaque fois.</p>
<h2>Honnête et ciblé</h2>
<ul>
<li>Tiquiz vérifie le vrai partage : ta viralité est réelle, l'échange est annoncé clairement.</li>
<li>Sur la page de résultat, invite à envoyer le quiz à quelqu'un de précis ("tu connais ton opposé ? comparez vos profils").</li>
</ul>$html$,
  $html$<p>Ta viralité est activée : chaque participant peut t'en ramener d'autres, avec plaisir.</p>
<p>Demain, on attaque le trafic, en commençant par le plus facile : ton audience et des emplacements gratuits que tu as oubliés.</p>$html$,
  $st2$published$st2$, 100, $r$[]$r$::jsonb
),
(
  9, $s$jour-9-trafic-gratuit$s$, $t$Le trafic gratuit, ton audience d'abord$t$, $st$Bouche les fuites avant de chercher du nouveau trafic$st$,
  $html$<p>Avant de courir chercher du nouveau trafic, on récupère celui que tu gaspilles déjà.</p>
<h2>Branche le quiz sur tes points de fuite</h2>
<p>Tu as déjà du trafic qui se perd : la page de remerciement de ton freebie actuel, la fin de tes articles, ta page de confirmation d'achat. Commence par la page de remerciement de ton lead magnet : ces gens viennent de dire oui, ils sont chauds.</p>
<h2>Les emplacements dormants</h2>
<p>Signature email, bio Instagram, LinkedIn, TikTok, post épinglé, lien-en-bio, bannière YouTube. Gratuits, permanents, déjà vus par ton audience.</p>
<p>Puis ton audience directe : un email à ta liste, un post sur ton réseau principal. Et recycle : un post par résultat, un par question intrigante.</p>$html$,
  $html$<p>Tu as branché ton quiz sur ce qui passait déjà chez toi. C'est le trafic le plus rentable de la semaine.</p>
<p>Demain, on va chercher les audiences des autres, sans budget, avec un script qui marche.</p>$html$,
  $st2$published$st2$, 110, $r$[]$r$::jsonb
),
(
  10, $s$jour-10-partenaires-blog$s$, $t$Les audiences des autres et le blog$t$, $st$Puiser dans les audiences des autres, proprement$st$,
  $html$<p>On arrête de compter sur ta seule audience, et on va puiser dans celles des autres. Gratuitement, et sans spammer.</p>
<h2>Le pod d'échange de quiz</h2>
<p>Monte un cercle de 5 à 10 créateurs aux audiences complémentaires, pas concurrentes. Chacun place le quiz des autres sur sa page de résultat. Le trafic circule en boucle, en continu. Tiquiz tague la source, donc chacun sait ce que le pod lui rapporte.</p>
<h2>Trois autres leviers</h2>
<ul>
<li>Le quiz comme cadeau d'invité (podcast, live, sommet) à la place d'un PDF.</li>
<li>Dans les groupes : réponds vraiment à une question récurrente, puis propose le quiz. Apporte avant de demander.</li>
<li>L'embed SEO : colle ton quiz dans ton article de blog le plus visité.</li>
</ul>$html$,
  $html$<p>Tu as lancé des partenariats et branché ton quiz sur du trafic existant. Ton acquisition ne dépend plus que de toi.</p>
<p>Demain, dernier jour de promo : vidéo, Popquiz, et la seule méthode payante du challenge, mais sans risque.</p>$html$,
  $st2$published$st2$, 120, $r$[]$r$::jsonb
),
(
  11, $s$jour-11-video-popquiz-pub$s$, $t$Vidéo, Popquiz et la pub sans risque$t$, $st$Le format qui capture en dormant, et la pub qui ne fait pas peur$st$,
  $html$<p>Dernier jour de promotion, et le plus stratégique.</p>
<h2>Le Popquiz, gratuit et puissant</h2>
<p>Un quiz incrusté dans une vidéo à un instant précis. Place un quiz bloquant juste avant la révélation clé (le cliffhanger), ou transforme ta meilleure vidéo de valeur en webinaire automatique qui capture au pic d'attention, 24h/24.</p>
<h2>La pub, sans risque</h2>
<ul>
<li>La règle d'or : jamais de pub avant d'avoir prouvé que le quiz convertit en gratuit.</li>
<li>L'offre auto-liquidante : juste après le quiz, une petite offre (7 à 27 euros) ciblée sur le résultat. Le but n'est pas de t'enrichir, c'est que ces ventes remboursent ta pub. Quand chaque euro revient, tu peux acheter du trafic à l'infini.</li>
<li>Le retargeting des abandonneurs : recible ceux qui ont commencé ton quiz sans finir. Budget minuscule, conversion maximale.</li>
</ul>
<p>Si tu débutes, reste 100% gratuit, c'est très bien.</p>$html$,
  $html$<p>Tu as fini de remplir ton quiz de monde. Selon ton choix : un Popquiz en ligne, un test pub, ou une méthode gratuite doublée.</p>
<p>Demain, on s'occupe de tous ces leads et on les transforme en relation.</p>$html$,
  $st2$published$st2$, 130, $r$[]$r$::jsonb
),
(
  12, $s$jour-12-leads$s$, $t$Que faire des leads capturés$t$, $st$Des séquences qui bossent pour toi pendant que tu dors$st$,
  $html$<p>Un lead à qui tu ne parles pas t'oublie en 48 heures. On installe le truc qui va bosser pour toi : des séquences email qui se déclenchent selon ce que la personne a répondu.</p>
<h2>Branche l'autorépondeur sur les tags</h2>
<p>Dans Systeme.io : une règle "quand le contact reçoit le tag X, démarre la campagne Y". Le minimum vital : la séquence de bienvenue, déclenchée par ton tag de capture (livre le bonus, pose ta voix).</p>
<h2>L'email qui parle du résultat</h2>
<p>Comme le lead est taggué par profil, ton premier email peut dire "Tu es un Visionnaire, voici exactement quoi faire dans ton cas." Ouverture et réponses explosent, sans aucun effort manuel. Tout est déjà écrit dans le fichier des 7 séquences, tu colles et tu adaptes.</p>$html$,
  $html$<p>Tes leads sont accueillis et triés automatiquement. Ta machine commence à tourner toute seule.</p>
<p>Demain, la partie que tout le monde attend : comment ces leads deviennent des clients, à ta façon, sans forcer.</p>$html$,
  $st2$published$st2$, 140, $r$[]$r$::jsonb
),
(
  13, $s$jour-13-vendre$s$, $t$Vendre avec ton quiz$t$, $st$Pas de pression : ton quiz a déjà diagnostiqué$st$,
  $html$<p>Avec un quiz bien fait, tu n'as pas besoin de vendre au sens où tu l'entends. Pas de pression, pas de fausse urgence. Ton quiz a déjà posé un diagnostic, et un diagnostic ne se vend pas, il se confirme.</p>
<h2>La page de résultat = ta page de vente</h2>
<p>C'est l'endroit le plus chaud du parcours. Structure-la en 4 temps :</p>
<ol>
<li>Le miroir : "voici précisément où tu en es, [profil]."</li>
<li>La cause cachée : "et voici pourquoi tu bloques, ce n'est pas ta faute."</li>
<li>Le chemin : "voici ce qu'une personne de ton profil doit faire maintenant."</li>
<li>Le pont vers l'offre : "le plus rapide pour y arriver, c'est ça."</li>
</ol>
<p>[[figure:page-resultat]]</p>
<h2>Trois façons de vendre</h2>
<p>Le lien de vente direct sur la page de résultat, l'email de vente déclenché par tag, et la combinaison valeur gratuite puis vente (la plus éthique). Pas de fausse rareté : si tu dis qu'une offre ferme, c'est qu'elle ferme vraiment.</p>$html$,
  $html$<p>Ton offre est branchée à ton quiz : un CTA sur la page de résultat et une séquence de vente douce. Ton système peut maintenant convertir.</p>
<p>Demain, dernier jour : ta communauté, ce qui transforme un coup en business. Et on célèbre.</p>$html$,
  $st2$published$st2$, 150, $r$[]$r$::jsonb
),
(
  14, $s$jour-14-communaute$s$, $t$De tes leads à ta communauté$t$, $st$Sortir du one-shot, et clôturer en beauté$st$,
  $html$<p>Tu as un quiz qui capture, des séquences qui convertissent, une offre branchée. La différence entre un coup et un business : est-ce que les gens reviennent ?</p>
<h2>Le quiz comme moteur de communauté</h2>
<p>Choisis un lieu simple que tu peux animer dans la durée (groupe, newsletter vivante, espace dédié). Le résultat qui invite à taguer un ami fait entrer de nouveaux membres en continu. Partage les résultats agrégés et lance des défis.</p>
<h2>L'autorité par la donnée</h2>
<p>Au bout de 100 ou 200 réponses, tu détiens une donnée que personne d'autre n'a sur ton marché. "J'ai analysé 500 [cible], voici ce qui ressort." Autorité incopiable, contenus, matière pour ta prochaine offre. Et un quiz identitaire ne périme jamais : relance le même chaque trimestre avec un nouveau prétexte.</p>
<p>Mission finale : ton lieu de communauté, ton message d'accueil, et ton plan des 30 prochains jours.</p>$html$,
  $html$<p>Tu es parti de zéro il y a 14 jours, et tu as maintenant une machine à leads qui tourne. Tu n'as pas suivi une formation, tu as construit un actif. Sois fier.</p>
<p>Poste ton bilan dans la communauté, on célèbre ça ensemble. Et ce n'est que le début : le module bonus t'attend quand tu veux.</p>$html$,
  $st2$published$st2$, 160, $r$[]$r$::jsonb
),
(
  99, $s$bonus-formats-avances$s$, $t$Bonus : les formats avancés$t$, $st$Pour aller plus loin, quand tu veux$st$,
  $html$<p>Pour les jours où tu veux pousser. À consommer dans le désordre, sans pression.</p>
<h2>Les sondages</h2>
<p>Le petit frère discret du quiz : capte des avis, des données, les vrais mots de ta cible. Lance un sondage avant de créer un nouveau quiz.</p>
<h2>Les Popquiz avancés</h2>
<p>Plusieurs cuepoints, comportement bloquant ou optionnel, embed partout. Le cliffhanger et le webinaire automatique.</p>
<h2>Le multiprofils</h2>
<p>Plusieurs projets isolés dans un seul compte (tags, branding, stats, clé Systeme.io séparés). Teste 3 angles en parallèle, ou gère plusieurs marques sans les mélanger.</p>
<h2>Enchaîner et combiner</h2>
<p>Un quiz d'entrée large puis un quiz de diagnostic pour les chauds, croiser quiz et sondage, recycler les réponses en contenu. Tu as toutes les briques, c'est ton terrain de jeu.</p>$html$,
  $html$<p>Tu as les formats avancés en tête. Lance d'abord, fais tourner, et reviens ici quand tu voudras passer au niveau au-dessus.</p>$html$,
  $st2$published$st2$, 200, $r$[]$r$::jsonb
)
on conflict (day_number) do update set
  slug = excluded.slug,
  title = excluded.title,
  subtitle = excluded.subtitle,
  intro_html = excluded.intro_html,
  result_html = excluded.result_html,
  status = excluded.status,
  sort_order = excluded.sort_order,
  updated_at = now();

-- ───────────────────────────────────────────────────────────────
-- 2. Les questions de chaque jour (la mission devient le quiz)
-- ───────────────────────────────────────────────────────────────
-- Index unique pour pouvoir re-seeder (mettre a jour) les questions sans
-- doublon. (day_id, sort_order) est naturellement unique : chaque jour a
-- des questions a des positions distinctes.
create unique index if not exists uniq_questions_day_sort on questions (day_id, sort_order);

with q(day_number, type, prompt, help_text, options, required, sort_order) as (
  values
  -- J-3 : preparation
  (-3, $p$action$p$, $p$Présente-toi en une phrase, comme tu la posteras dans la communauté.$p$, $p$Qui tu es, ce que tu fais, pour qui.$p$, $j$[]$j$::jsonb, true, 1),
  (-3, $p$action$p$, $p$Ton thème ou ta niche, en quelques mots ?$p$, $p$Même vague pour l'instant, on l'affinera.$p$, $j$[]$j$::jsonb, true, 2),
  (-3, $p$recall$p$, $p$Pour ancrer : la promesse du challenge, c'est...$p$, $p$Aucun piège, juste l'idée clé.$p$, $j$[{"value":"systeme","label":"Un système qui capte des leads qualifiés, en 14 jours"},{"value":"million","label":"Devenir riche en 14 jours"},{"value":"parfait","label":"Un quiz parfait, peu importe le temps"}]$j$::jsonb, false, 3),
  -- J0 : le pacte
  (0, $p$action$p$, $p$Écris ton engagement public.$p$, $p$Par exemple : Je m'engage à publier mon quiz d'ici le jour 7.$p$, $j$[]$j$::jsonb, true, 1),
  (0, $p$decision$p$, $p$Ton état d'esprit pour ces 14 jours ?$p$, $p$Il n'y a pas de mauvaise réponse, mais une qui aide à finir.$p$, $j$[{"value":"agir","label":"J'agis avant d'être prête, je publie imparfait et je corrige après"},{"value":"parfait","label":"J'attends que tout soit parfait avant de publier"}]$j$::jsonb, true, 2),
  (0, $p$self_eval$p$, $p$À quel point te sens-tu prête à publier dans 7 jours ?$p$, $p$Ça me sert à adapter le coach.$p$, $j$[{"value":"pas","label":"Pas du tout, ça m'angoisse un peu"},{"value":"moyen","label":"Moyennement"},{"value":"chaude","label":"Chaude, on y va"}]$j$::jsonb, false, 3),
  -- J1 : pourquoi un quiz
  (1, $p$action$p$, $p$Écris en une phrase la transformation que ton audience cherche vraiment.$p$, $p$Pas la fonctionnalité, le résultat. Exemple : passer de débordée à organisée sans culpabiliser.$p$, $j$[]$j$::jsonb, true, 1),
  (1, $p$decision$p$, $p$Quel archétype de quiz colle le mieux à ton sujet ?$p$, $p$Tu pourras changer plus tard, c'est ton intuition de départ.$p$, $j$[{"value":"identitaire","label":"Quel type de X es-tu ? (identitaire, très viral)"},{"value":"diagnostic","label":"Quel est ton blocage en Y ? (diagnostic, vend bien)"},{"value":"declencheur","label":"Es-tu prêt pour Z ? (déclencheur de décision)"}]$j$::jsonb, true, 2),
  (1, $p$self_eval$p$, $p$Où en es-tu aujourd'hui avec les quiz ?$p$, $p$Ça me sert à adapter ton parcours et le coach.$p$, $j$[{"value":"jamais","label":"Je n'en ai jamais fait"},{"value":"essaye","label":"J'ai déjà essayé sans vrai résultat"},{"value":"actif","label":"J'en ai un qui tourne déjà"}]$j$::jsonb, true, 3),
  (1, $p$recall$p$, $p$Pour ancrer : ce qui fait qu'un quiz capte mieux qu'une page de capture, c'est surtout...$p$, $p$Aucun piège, juste l'idée clé du jour.$p$, $j$[{"value":"interactif","label":"Il est interactif : on participe au lieu de subir"},{"value":"joli","label":"Il est plus joli à regarder"},{"value":"long","label":"Il est plus long à remplir"}]$j$::jsonb, false, 4),
  -- J2 : objectif + cible
  (2, $p$decision$p$, $p$Quel est l'objectif n°1 de ton quiz ?$p$, $p$Tu en choisis UN principal. Un quiz qui veut tout faire ne fait rien.$p$, $j$[{"value":"capter","label":"Capter des leads"},{"value":"qualifier","label":"Qualifier"},{"value":"segmenter","label":"Segmenter"},{"value":"vendre","label":"Vendre directement"}]$j$::jsonb, true, 1),
  (2, $p$action$p$, $p$Complète : Après mon quiz, le prospect réalise que ______ et donc mon offre devient la suite logique.$p$, $p$C'est la boussole de tout ton quiz.$p$, $j$[]$j$::jsonb, true, 2),
  (2, $p$action$p$, $p$Ta fiche cible : 3 douleurs, 3 désirs, et 5 phrases exactes que ta cible emploie (volées dans les avis ou commentaires).$p$, $p$Copie les phrases qui reviennent, mot pour mot.$p$, $j$[]$j$::jsonb, true, 3),
  -- J3 : angle + resultats
  (3, $p$action$p$, $p$Écris tes 3 ou 4 profils de résultats, avec un nom d'identité valorisant pour chacun.$p$, $p$Jamais une note. Même le débutant devient une identité désirable.$p$, $j$[]$j$::jsonb, true, 1),
  (3, $p$action$p$, $p$Pour chaque profil : le tag Systeme.io et le CTA associé.$p$, $p$Rappelle-toi la chaîne : résultat = tag = segment = offre.$p$, $j$[]$j$::jsonb, true, 2),
  (3, $p$recall$p$, $p$Pour ancrer : on écrit les résultats...$p$, $p$La méthode inversée.$p$, $j$[{"value":"avant","label":"Avant les questions"},{"value":"apres","label":"Après les questions"},{"value":"jamais","label":"On ne les écrit pas à l'avance"}]$j$::jsonb, false, 3),
  -- J4 : generation IA
  (4, $p$action$p$, $p$Colle ici ton prompt à 3 couches : Cible + Transformation + Ton.$p$, $p$Reprends ta fiche cible et ta phrase d'objectif des jours 2 et 3.$p$, $j$[]$j$::jsonb, true, 1),
  (4, $p$recall$p$, $p$Face à la sortie de l'IA, ton job c'est...$p$, $p$L'IA a fait le gros, toi tu fais la différence.$p$, $j$[{"value":"juger","label":"Juger et ajuster à 10%, relancer si l'angle est faux"},{"value":"reecrire","label":"Tout réécrire à la main"},{"value":"garder","label":"Tout garder tel quel sans relire"}]$j$::jsonb, false, 2),
  (4, $p$self_eval$p$, $p$Ton quiz généré, tu en es où ?$p$, $p$On affine demain, pas de stress.$p$, $j$[{"value":"ok","label":"Brouillon généré, plutôt contente"},{"value":"retravailler","label":"Généré mais à retravailler"},{"value":"pas","label":"Pas encore généré"}]$j$::jsonb, true, 3),
  -- J5 : affiner
  (5, $p$decision$p$, $p$Où places-tu ta capture email ?$p$, $p$C'est le réglage qui fait le plus bouger ton taux de leads.$p$, $j$[{"value":"avant_resultat","label":"Juste avant le résultat (au pic de curiosité)"},{"value":"debut","label":"Au tout début du quiz"},{"value":"apres","label":"Après avoir montré le résultat"}]$j$::jsonb, true, 1),
  (5, $p$action$p$, $p$Quelle première question facile et fun ouvre ton quiz ?$p$, $p$Jamais un champ email, jamais une question lourde.$p$, $j$[]$j$::jsonb, true, 2),
  (5, $p$self_eval$p$, $p$As-tu activé la personnalisation dynamique (prénom, forme tu ou vous) ?$p$, $p$Marie, ton profil est... est lu jusqu'au bout.$p$, $j$[{"value":"oui","label":"Oui, activée"},{"value":"pas","label":"Pas encore"}]$j$::jsonb, false, 3),
  -- J6 : branding + mobile
  (6, $p$action$p$, $p$Note tes choix de branding : couleur primaire, couleur de fond, police, logo.$p$, $p$Reste simple, un quiz lisible bat un quiz surchargé.$p$, $j$[]$j$::jsonb, true, 1),
  (6, $p$self_eval$p$, $p$As-tu fait ton quiz en entier sur ton téléphone ?$p$, $p$Non négociable : la majorité des réponses viennent du mobile.$p$, $j$[{"value":"oui","label":"Oui, testé et corrigé"},{"value":"pas","label":"Pas encore"}]$j$::jsonb, true, 2),
  (6, $p$recall$p$, $p$Pour ancrer : la majorité de tes répondants seront sur...$p$, $p$D'où l'importance du test mobile.$p$, $j$[{"value":"mobile","label":"Leur téléphone"},{"value":"ordi","label":"Un ordinateur"},{"value":"tablette","label":"Une tablette"}]$j$::jsonb, false, 3),
  -- J7 : publier
  (7, $p$action$p$, $p$Quels tags as-tu configurés ? (au minimum le tag de capture)$p$, $p$Résultat = tag = segment = offre.$p$, $j$[]$j$::jsonb, true, 1),
  (7, $p$self_eval$p$, $p$Ton quiz est-il publié et testé (un lead test taggué dans Systeme.io) ?$p$, $p$On débloque sur la complétion, pas sur la perfection.$p$, $j$[{"value":"verifie","label":"Publié et vérifié (lead test taggué)"},{"value":"publie","label":"Publié mais pas encore testé"},{"value":"pas","label":"Pas encore publié"}]$j$::jsonb, true, 2),
  (7, $p$action$p$, $p$Colle le lien de ton quiz publié (à poster aussi dans la communauté).$p$, $p$C'est ton jalon. Félicitations.$p$, $j$[]$j$::jsonb, false, 3),
  -- J8 : viralite
  (8, $p$action$p$, $p$Quel bonus à valeur asymétrique offres-tu au partage ?$p$, $p$Un actif que tu as déjà : PDF, mini-cours, accès. Coûte zéro à livrer, vaut cher.$p$, $j$[]$j$::jsonb, true, 1),
  (8, $p$self_eval$p$, $p$As-tu testé que le bonus se débloque après partage ?$p$, $p$Vérifie le parcours toi-même.$p$, $j$[{"value":"oui","label":"Oui, ça fonctionne"},{"value":"pas","label":"Pas encore"}]$j$::jsonb, true, 2),
  -- J9 : trafic gratuit
  (9, $p$action$p$, $p$Sur quels emplacements dormants as-tu mis ton lien ?$p$, $p$Signature, bio, post épinglé, page de remerciement de ton freebie...$p$, $j$[]$j$::jsonb, true, 1),
  (9, $p$action$p$, $p$À qui as-tu diffusé ton quiz aujourd'hui ?$p$, $p$Ta liste, ton réseau principal.$p$, $j$[]$j$::jsonb, true, 2),
  (9, $p$recall$p$, $p$Pour ancrer : le trafic le plus rentable à activer en premier, c'est...$p$, $p$On bouche les fuites avant de chercher du neuf.$p$, $j$[{"value":"fuites","label":"Tes points de fuite existants (page de remerciement, ton audience)"},{"value":"pub","label":"La pub froide"},{"value":"hasard","label":"Poster au hasard partout"}]$j$::jsonb, false, 3),
  -- J10 : partenaires + blog
  (10, $p$action$p$, $p$Quels 3 partenaires (même cible, pas concurrents) as-tu contactés ?$p$, $p$Envoie-leur le script d'échange.$p$, $j$[]$j$::jsonb, true, 1),
  (10, $p$self_eval$p$, $p$As-tu embarqué ton quiz sur une page de blog qui a du trafic ?$p$, $p$Si tu débutes, fais d'abord les 3 contacts.$p$, $j$[{"value":"oui","label":"Oui, embed en place"},{"value":"pas","label":"Pas encore"},{"value":"nonblog","label":"Je n'ai pas de blog"}]$j$::jsonb, true, 2),
  -- J11 : video/popquiz/pub
  (11, $p$decision$p$, $p$Ta diffusion avancée du jour ?$p$, $p$Choisis ce qui te correspond, les trois sont valables.$p$, $j$[{"value":"popquiz","label":"Créer un Popquiz à partir d'une vidéo"},{"value":"pub","label":"Lancer un petit test pub en retargeting"},{"value":"gratuit","label":"Doubler la méthode gratuite qui a le mieux marché"}]$j$::jsonb, true, 1),
  (11, $p$recall$p$, $p$Pour ancrer : la règle d'or de la pub, c'est...$p$, $p$Sinon la pub ne fait qu'accélérer la perte.$p$, $j$[{"value":"preuve","label":"Jamais de pub avant d'avoir prouvé que le quiz convertit en gratuit"},{"value":"debut","label":"Faire de la pub dès le premier jour"},{"value":"jamais","label":"Ne jamais faire de pub"}]$j$::jsonb, false, 2),
  -- J12 : leads
  (12, $p$self_eval$p$, $p$As-tu branché la séquence de bienvenue sur ton tag de capture ?$p$, $p$Le minimum vital : livrer le bonus, poser ta voix.$p$, $j$[{"value":"oui","label":"Oui, elle tourne"},{"value":"cours","label":"En cours"},{"value":"pas","label":"Pas encore"}]$j$::jsonb, true, 1),
  (12, $p$action$p$, $p$Quel email personnalisé par résultat as-tu mis en place ?$p$, $p$Tu es un Visionnaire, voici quoi faire dans ton cas. Tout est dans le fichier des séquences.$p$, $j$[]$j$::jsonb, true, 2),
  -- J13 : vendre
  (13, $p$action$p$, $p$Quel CTA de vente as-tu ajouté sur ta page de résultat ?$p$, $p$Par profil si possible, sinon un seul vers ton offre principale.$p$, $j$[]$j$::jsonb, true, 1),
  (13, $p$recall$p$, $p$Pour ancrer : une page de résultat qui vend, c'est...$p$, $p$Le diagnostic se confirme, il ne se force pas.$p$, $j$[{"value":"4temps","label":"Le miroir, la cause cachée, le chemin, le pont vers l'offre"},{"value":"bouton","label":"Juste un gros bouton Acheter"},{"value":"rien","label":"Rien, on ne vend pas sur le résultat"}]$j$::jsonb, false, 2),
  (13, $p$self_eval$p$, $p$Ta séquence de vente douce est...$p$, $p$Valeur d'abord, vente ensuite.$p$, $j$[{"value":"installee","label":"Installée"},{"value":"cours","label":"En cours"},{"value":"pas","label":"Pas encore"}]$j$::jsonb, true, 3),
  -- J14 : communaute
  (14, $p$action$p$, $p$Où installes-tu ta communauté, et quel est ton message d'accueil ?$p$, $p$Un endroit simple que tu tiens vaut mieux qu'un endroit ambitieux que tu abandonnes.$p$, $j$[]$j$::jsonb, true, 1),
  (14, $p$action$p$, $p$Ton plan des 30 prochains jours ?$p$, $p$Prochain quiz, rythme de publication, passage en abo, idée d'affiliation.$p$, $j$[]$j$::jsonb, true, 2),
  (14, $p$action$p$, $p$Ton bilan du challenge, à poster dans la communauté.$p$, $p$Ton quiz, tes premiers chiffres, ce que tu as appris.$p$, $j$[]$j$::jsonb, false, 3),
  -- Bonus
  (99, $p$decision$p$, $p$Quel format avancé veux-tu explorer en premier ?$p$, $p$Aucune urgence, c'est ton terrain de jeu.$p$, $j$[{"value":"sondage","label":"Les sondages"},{"value":"popquiz","label":"Les Popquiz avancés"},{"value":"multiprofils","label":"Le multiprofils (tester 3 angles)"},{"value":"systeme","label":"Enchaîner plusieurs quiz"}]$j$::jsonb, false, 1)
)
insert into questions (day_id, type, prompt, help_text, options, required, sort_order)
select d.id, q.type, q.prompt, q.help_text, q.options, q.required, q.sort_order
from q
join days d on d.day_number = q.day_number
on conflict (day_id, sort_order) do update set
  type = excluded.type,
  prompt = excluded.prompt,
  help_text = excluded.help_text,
  options = excluded.options,
  required = excluded.required;

notify pgrst, 'reload schema';
