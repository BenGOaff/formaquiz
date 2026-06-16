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
-- charges les videos depuis l'admin). Ce fichier inclut le Jour 1 et
-- remplace donc le seed partiel supabase/seed/day1.sql.
--
-- Apres execution : Studio > SQL Editor > coller > Run.

-- ───────────────────────────────────────────────────────────────
-- 1. Les jours
-- ───────────────────────────────────────────────────────────────
insert into days (day_number, slug, title, subtitle, intro_html, result_html, status, sort_order, resources)
values
(
  -3, $s$preparation-bienvenue$s$, $t$Bienvenue, on pose les bases$t$, $st$Avant le coup d'envoi$st$,
  $html$<p>Si tu es la, c'est que tu en as marre de creer du contenu, capter trois curieux, et te demander pourquoi rien ne decolle. Dans 14 jours, tu auras un quiz en ligne qui capte des leads qualifies en automatique. Pas dans six mois, dans 14 jours.</p>
<h2>La regle du jeu</h2>
<ul>
<li>Une mission par jour, une seule. 20 a 40 minutes.</li>
<li>Une video qui enseigne, un quiz qui te fait agir sur TON projet.</li>
<li>Ton quiz est en ligne des le jour 7.</li>
<li>On partage dans la communaute : c'est ce qui fait qu'on va au bout.</li>
</ul>
<p>Promesse de systeme, pas promesse de million. Tu n'as pas besoin d'etre tech ni d'avoir une grosse audience.</p>
<p>Deux choses a faire maintenant, 2 minutes : creer ton compte Tiquiz gratuit, et rejoindre la communaute en te presentant en une phrase.</p>$html$,
  $html$<p>Ravie de t'avoir avec nous. Tu viens de poser les bases : ton compte est pret et tu sais comment ca marche.</p>
<p>Juste apres, on scelle un truc ensemble qui change tout sur ta capacite a aller au bout : le pacte.</p>$html$,
  $st2$published$st2$, 10, $r$[]$r$::jsonb
),
(
  0, $s$le-pacte$s$, $t$Le pacte$t$, $st$L'engagement qui change tout$st$,
  $html$<p>Les gens qui finissent un challenge et ceux qui abandonnent, la difference, ce n'est pas la motivation. C'est un engagement pris a voix haute, devant les autres.</p>
<h2>L'etat d'esprit du challenge</h2>
<ul>
<li>On agit avant d'etre pret. On publie imparfait, on corrige apres.</li>
<li>Le quiz parfait qui reste en brouillon ne rapporte rien.</li>
<li>Tu n'as pas besoin de tout comprendre, juste de faire la mission du jour.</li>
</ul>
<p>L'engagement a prendre, devant la communaute : "Je m'engage a publier mon quiz d'ici le jour 7."</p>$html$,
  $html$<p>Pacte signe. Tu viens de multiplier tes chances d'aller au bout, juste en le disant tout haut.</p>
<p>Demain, on attaque le vrai sujet : pourquoi un quiz va te ramener plus de leads que tout ce que tu as essaye avant.</p>$html$,
  $st2$published$st2$, 20, $r$[]$r$::jsonb
),
(
  1, $s$jour-1-pourquoi-un-quiz$s$, $t$Le declic$t$, $st$Pourquoi le quiz ecrase tous les autres lead magnets$st$,
  $html$<p>Ton PDF gratuit, presque personne ne le lit. Ton webinaire, la moitie des inscrits ne viennent pas. Ta page de capture transforme un visiteur sur cinquante. Ce n'est pas toi le probleme, c'est le format.</p>
<h2>Ce que le quiz fait de different</h2>
<ul>
<li><strong>Interactif</strong> : le prospect participe au lieu de subir.</li>
<li><strong>Il qualifie</strong> : tu apprends qui il est pendant qu'il repond.</li>
<li><strong>Il segmente</strong> : chaque reponse est une info que tu peux taguer.</li>
<li><strong>Il est viral</strong> : on partage son resultat, jamais son PDF.</li>
<li><strong>Il est rapide</strong> : 5 minutes avec Tiquiz, contre des jours pour un tunnel.</li>
</ul>
<h2>Les maths qui changent tout</h2>
<p>Une page de capture classique : 1 a 3 leads pour 100 visiteurs. Un bon quiz : couramment 20 a 50 leads pour 100 visiteurs. Ce sont des fourchettes, ca depend de ton quiz et de ta cible. On ne garantit pas un chiffre, on installe un systeme dont les maths jouent pour toi.</p>
<h2>Le miroir d'identite</h2>
<p>Les quiz qui cartonnent ne notent pas, ils revelent une identite. "Tu es un Visionnaire" se partage. "Tu as eu 6 sur 10" se cache. Donc on bannit la logique bonne ou mauvaise reponse, on revele un type.</p>
<p>Ta mission d'aujourd'hui, la plus importante de la semaine : quelle transformation ton audience cherche vraiment ?</p>$html$,
  $html$<p>Bravo, tu viens de poser la premiere pierre de ton quiz : ton angle pressenti et ton archetype.</p>
<p>Garde ta phrase de transformation sous les yeux, c'est elle qui guidera tout le reste. Demain, on creuse ta cible jusqu'a la connaitre mieux qu'elle ne se connait elle-meme.</p>$html$,
  $st2$published$st2$, 30, $r$[]$r$::jsonb
),
(
  2, $s$jour-2-objectif-cible$s$, $t$L'objectif et la cible$t$, $st$Les decisions a prendre avant de toucher a l'outil$st$,
  $html$<p>La plupart des gens ouvrent l'outil et commencent a ecrire des questions. Grave erreur. Un quiz qui rapporte se decide avant.</p>
<h2>Fixe l'objectif n°1</h2>
<p>Quatre objectifs possibles : capter des leads, qualifier, segmenter, ou vendre direct. Tu en choisis UN principal. On ne part pas du theme, on part de la vente qu'on veut faire, et on remonte. La phrase boussole : "Apres mon quiz, le prospect realise que ______ et donc mon offre devient la suite logique."</p>
<h2>Connais ta cible, et vole son langage</h2>
<ul>
<li>Trois douleurs, trois desirs, pas tes suppositions.</li>
<li>Recupere ses vrais mots : avis Amazon, commentaires YouTube, posts dans les groupes. Tu copies les phrases qui reviennent, mot pour mot.</li>
</ul>$html$,
  $html$<p>Tu as ta boussole : ton objectif et les vrais mots de ta cible. C'est ce qui va rendre tout ton quiz juste.</p>
<p>Demain, on transforme ca en resultats de quiz, et tu vas voir pourquoi on ecrit les resultats AVANT les questions.</p>$html$,
  $st2$published$st2$, 40, $r$[]$r$::jsonb
),
(
  3, $s$jour-3-angle-resultats$s$, $t$Les resultats avant les questions$t$, $st$La methode inversee qui fait tenir ton quiz$st$,
  $html$<p>Le truc contre-intuitif que presque personne ne fait : on ecrit les resultats AVANT la moindre question.</p>
<h2>Pourquoi a l'envers</h2>
<p>Si tu pars des questions, tu obtiens un quiz fouillis qui ne trie rien. Si tu pars des profils de sortie, chaque question sert a orienter vers le bon profil. Retiens la chaine : chaque resultat = un segment = un tag Systeme.io = une offre.</p>
<h2>3 ou 4 profils, flatteurs mais actionnables</h2>
<ul>
<li>Pas plus de 4, pour rester clair.</li>
<li>Un nom d'identite desirable, jamais une note. Meme le debutant devient "l'Explorateur qui a tout l'elan".</li>
<li>Chaque profil : une force reconnue + un prochain pas clair. Un resultat qui juge tue tout.</li>
</ul>$html$,
  $html$<p>Tes profils sont poses, avec un tag et un CTA chacun. Le squelette de ton quiz existe deja.</p>
<p>Demain, on rentre dans Tiquiz et en 30 secondes l'IA te genere ton quiz complet. Le quick win commence.</p>$html$,
  $st2$published$st2$, 50, $r$[]$r$::jsonb
),
(
  4, $s$jour-4-generation-ia$s$, $t$La generation IA en 30 secondes$t$, $st$Le quick win : ton quiz genere par l'IA de Tiquiz$st$,
  $html$<p>Le moment que tu attends. En 30 secondes, l'IA de Tiquiz te genere un quiz complet : titre, intro, questions, resultats. Mais il y a une facon de lui parler qui fait toute la difference.</p>
<h2>Le prompt a 3 couches</h2>
<ul>
<li><strong>Cible</strong> : qui (reprends ta fiche cible).</li>
<li><strong>Transformation</strong> : de quel etat a quel etat (ta phrase d'objectif).</li>
<li><strong>Ton</strong> : chaleureux, expert, fun.</li>
</ul>
<p>Compare un "fais-moi un quiz sur le yoga" generique avec un brief a 3 couches : l'ecart est enorme.</p>
<h2>Garde ce qui est bon</h2>
<p>C'est un point de depart, pas un point final. Tu generes, tu gardes ce qui te plait, tu reperes ce qui cloche. On affine demain, aujourd'hui tu ne fais que degrossir.</p>$html$,
  $html$<p>Ton quiz existe, en brouillon, ne en 30 secondes. Ca fait quelque chose, hein ?</p>
<p>Demain, on le rend vraiment toi : on ajuste les 10% qui comptent et on place la capture au bon endroit.</p>$html$,
  $st2$published$st2$, 60, $r$[]$r$::jsonb
),
(
  5, $s$jour-5-affiner$s$, $t$Affiner sans tout reecrire$t$, $st$Les 10% qui font que c'est toi, et le reglage qui double tes leads$st$,
  $html$<p>Erreur classique : tout reecrire a la main pour que ce soit parfait. Non. L'IA a fait 90% du boulot. Ton job, c'est les 10% qui font que c'est toi.</p>
<h2>Le reglage qui change tout : la capture au pic de curiosite</h2>
<p>La plupart demandent l'email au debut, et le perdent. Place la capture juste avant le resultat, formulee comme "ou on t'envoie ton profil detaille ?". A ce moment, le prospect a tout repondu, il meurt d'envie de savoir. C'est LE reglage qui fait le plus bouger ton taux de leads.</p>
<h2>Trois autres gestes</h2>
<ul>
<li>Premiere question facile et fun, jamais un champ email.</li>
<li>Reordonne du plus leger au plus engageant.</li>
<li>Active la personnalisation dynamique (prenom, forme tu/vous).</li>
</ul>
<p>Ne passe pas trois heures a fignoler. Le quiz n'a pas besoin d'etre parfait, il a besoin d'etre en ligne.</p>$html$,
  $html$<p>Ton quiz est relu, reordonne, personnalise, et ta capture est au bon endroit. Le plus dur est fait.</p>
<p>Demain, on l'habille a tes couleurs et on le teste sur mobile, parce que c'est la que tout se joue.</p>$html$,
  $st2$published$st2$, 70, $r$[]$r$::jsonb
),
(
  6, $s$jour-6-branding-mobile$s$, $t$Le branding et le mobile$t$, $st$Mets-le a ton image, et impeccable sur telephone$st$,
  $html$<p>Un quiz qui inspire confiance se fait en deux minutes, et la majorite des gens le verront sur leur telephone, pas sur ton bel ecran.</p>
<h2>Branding rapide</h2>
<p>Couleur primaire, couleur de fond, police Google, logo. Quelques clics. Reste simple : un quiz lisible bat un quiz surcharge.</p>
<h2>Le mobile d'abord, pour de vrai</h2>
<p>Fais le quiz en entier sur ton telephone. Coupe les textes qui scrollent trop, les images qui rament. C'est non negociable, la majorite des reponses viennent du mobile.</p>
<p>Pour pousser : soigne l'image de resultat partageable et l'OG image (l'apercu au partage), deux details que presque personne ne touche et qui changent le taux de clic.</p>$html$,
  $html$<p>Ton quiz est a ton image et il tourne nickel sur mobile. Il est pret a recevoir du monde.</p>
<p>Demain, c'est le sommet : on branche Systeme.io, on configure les tags, et on PUBLIE. Repose-toi bien.</p>$html$,
  $st2$published$st2$, 80, $r$[]$r$::jsonb
),
(
  7, $s$jour-7-publier$s$, $t$Brancher Systeme.io et publier$t$, $st$Jalon majeur : ton quiz devient une machine$st$,
  $html$<p>C'est le jour 7. Le jour ou ton quiz arrete d'etre un projet et devient une machine.</p>
<h2>Les etapes, dans l'ordre</h2>
<ul>
<li>Recupere ta cle API Systeme.io et colle-la dans Tiquiz.</li>
<li>Configure les tags : tag de capture (le minimum), tag par resultat, tag de partage. Rappelle la chaine : resultat = tag = segment = offre.</li>
<li>Publie, recupere ton lien court, et fais le quiz toi-meme de bout en bout.</li>
<li>Verifie que ton contact arrive bien taggue dans Systeme.io.</li>
</ul>
<p>Pour pousser : le tag par reponse (presque personne ne l'utilise) pour router tes prospects les plus chauds plus tard.</p>
<p>Puis tu postes ton lien dans la communaute et tu vas faire les quiz des autres.</p>$html$,
  $html$<p>Ton quiz est PUBLIE et il capture des leads en automatique. Tu as fini la premiere semaine, bravo, vraiment.</p>
<p>La semaine prochaine, on le remplit de monde. Pense a poster ton lien dans la communaute.</p>$html$,
  $st2$published$st2$, 90, $r$[]$r$::jsonb
),
(
  8, $s$jour-8-viralite$s$, $t$Activer la viralite$t$, $st$Transformer chaque participant en source de nouveaux participants$st$,
  $html$<p>Ton quiz capture. Maintenant on fait un truc que ton PDF ne pourra jamais faire : transformer chaque personne qui le fait en source de nouvelles personnes.</p>
<h2>Le bonus a valeur asymetrique</h2>
<p>Entre la capture et le resultat, Tiquiz propose "partage pour debloquer ton bonus". Le bon bonus coute zero a livrer mais vaut cher aux yeux du prospect : un PDF, un mini-cours deja fait, un acces. Un actif que tu as deja, pas un truc a reproduire a chaque fois.</p>
<h2>Honnete et cible</h2>
<ul>
<li>Tiquiz verifie le vrai partage : ta viralite est reelle, l'echange est annonce clairement.</li>
<li>Sur la page de resultat, invite a envoyer le quiz a quelqu'un de precis ("tu connais ton oppose ? comparez vos profils").</li>
</ul>$html$,
  $html$<p>Ta viralite est activee : chaque participant peut t'en ramener d'autres, avec plaisir.</p>
<p>Demain, on attaque le trafic, en commencant par le plus facile : ton audience et des emplacements gratuits que tu as oublies.</p>$html$,
  $st2$published$st2$, 100, $r$[]$r$::jsonb
),
(
  9, $s$jour-9-trafic-gratuit$s$, $t$Le trafic gratuit, ton audience d'abord$t$, $st$Bouche les fuites avant de chercher du nouveau trafic$st$,
  $html$<p>Avant de courir chercher du nouveau trafic, on recupere celui que tu gaspilles deja.</p>
<h2>Branche le quiz sur tes points de fuite</h2>
<p>Tu as deja du trafic qui se perd : la page de remerciement de ton freebie actuel, la fin de tes articles, ta page de confirmation d'achat. Commence par la page de remerciement de ton lead magnet : ces gens viennent de dire oui, ils sont chauds.</p>
<h2>Les emplacements dormants</h2>
<p>Signature email, bio Instagram, LinkedIn, TikTok, post epingle, lien-en-bio, banniere YouTube. Gratuits, permanents, deja vus par ton audience.</p>
<p>Puis ton audience directe : un email a ta liste, un post sur ton reseau principal. Et recycle : un post par resultat, un par question intrigante.</p>$html$,
  $html$<p>Tu as branche ton quiz sur ce qui passait deja chez toi. C'est le trafic le plus rentable de la semaine.</p>
<p>Demain, on va chercher les audiences des autres, sans budget, avec un script qui marche.</p>$html$,
  $st2$published$st2$, 110, $r$[]$r$::jsonb
),
(
  10, $s$jour-10-partenaires-blog$s$, $t$Les audiences des autres et le blog$t$, $st$Puiser dans les audiences des autres, proprement$st$,
  $html$<p>On arrete de compter sur ta seule audience, et on va puiser dans celles des autres. Gratuitement, et sans spammer.</p>
<h2>Le pod d'echange de quiz</h2>
<p>Monte un cercle de 5 a 10 createurs aux audiences complementaires, pas concurrentes. Chacun place le quiz des autres sur sa page de resultat. Le trafic circule en boucle, en continu. Tiquiz tague la source, donc chacun sait ce que le pod lui rapporte.</p>
<h2>Trois autres leviers</h2>
<ul>
<li>Le quiz comme cadeau d'invite (podcast, live, sommet) a la place d'un PDF.</li>
<li>Dans les groupes : reponds vraiment a une question recurrente, puis propose le quiz. Apporte avant de demander.</li>
<li>L'embed SEO : colle ton quiz dans ton article de blog le plus visite.</li>
</ul>$html$,
  $html$<p>Tu as lance des partenariats et branche ton quiz sur du trafic existant. Ton acquisition ne depend plus que de toi.</p>
<p>Demain, dernier jour de promo : video, Popquiz, et la seule methode payante du challenge, mais sans risque.</p>$html$,
  $st2$published$st2$, 120, $r$[]$r$::jsonb
),
(
  11, $s$jour-11-video-popquiz-pub$s$, $t$Video, Popquiz et la pub sans risque$t$, $st$Le format qui capture en dormant, et la pub qui ne fait pas peur$st$,
  $html$<p>Dernier jour de promotion, et le plus strategique.</p>
<h2>Le Popquiz, gratuit et puissant</h2>
<p>Un quiz incruste dans une video a un instant precis. Place un quiz bloquant juste avant la revelation cle (le cliffhanger), ou transforme ta meilleure video de valeur en webinaire automatique qui capture au pic d'attention, 24h/24.</p>
<h2>La pub, sans risque</h2>
<ul>
<li>La regle d'or : jamais de pub avant d'avoir prouve que le quiz convertit en gratuit.</li>
<li>L'offre auto-liquidante : juste apres le quiz, une petite offre (7 a 27 euros) ciblee sur le resultat. Le but n'est pas de t'enrichir, c'est que ces ventes remboursent ta pub. Quand chaque euro revient, tu peux acheter du trafic a l'infini.</li>
<li>Le retargeting des abandonneurs : recible ceux qui ont commence ton quiz sans finir. Budget minuscule, conversion maximale.</li>
</ul>
<p>Si tu debutes, reste 100% gratuit, c'est tres bien.</p>$html$,
  $html$<p>Tu as fini de remplir ton quiz de monde. Selon ton choix : un Popquiz en ligne, un test pub, ou une methode gratuite doublee.</p>
<p>Demain, on s'occupe de tous ces leads et on les transforme en relation.</p>$html$,
  $st2$published$st2$, 130, $r$[]$r$::jsonb
),
(
  12, $s$jour-12-leads$s$, $t$Que faire des leads captures$t$, $st$Des sequences qui bossent pour toi pendant que tu dors$st$,
  $html$<p>Un lead a qui tu ne parles pas t'oublie en 48 heures. On installe le truc qui va bosser pour toi : des sequences email qui se declenchent selon ce que la personne a repondu.</p>
<h2>Branche l'autorepondeur sur les tags</h2>
<p>Dans Systeme.io : une regle "quand le contact recoit le tag X, demarre la campagne Y". Le minimum vital : la sequence de bienvenue, declenchee par ton tag de capture (livre le bonus, pose ta voix).</p>
<h2>L'email qui parle du resultat</h2>
<p>Comme le lead est taggue par profil, ton premier email peut dire "Tu es un Visionnaire, voici exactement quoi faire dans ton cas." Ouverture et reponses explosent, sans aucun effort manuel. Tout est deja ecrit dans le fichier des 7 sequences, tu colles et tu adaptes.</p>$html$,
  $html$<p>Tes leads sont accueillis et tries automatiquement. Ta machine commence a tourner toute seule.</p>
<p>Demain, la partie que tout le monde attend : comment ces leads deviennent des clients, a ta facon, sans forcer.</p>$html$,
  $st2$published$st2$, 140, $r$[]$r$::jsonb
),
(
  13, $s$jour-13-vendre$s$, $t$Vendre avec ton quiz$t$, $st$Pas de pression : ton quiz a deja diagnostique$st$,
  $html$<p>Avec un quiz bien fait, tu n'as pas besoin de vendre au sens ou tu l'entends. Pas de pression, pas de fausse urgence. Ton quiz a deja pose un diagnostic, et un diagnostic ne se vend pas, il se confirme.</p>
<h2>La page de resultat = ta page de vente</h2>
<p>C'est l'endroit le plus chaud du parcours. Structure-la en 4 temps :</p>
<ol>
<li>Le miroir : "voici precisement ou tu en es, [profil]."</li>
<li>La cause cachee : "et voici pourquoi tu bloques, ce n'est pas ta faute."</li>
<li>Le chemin : "voici ce qu'une personne de ton profil doit faire maintenant."</li>
<li>Le pont vers l'offre : "le plus rapide pour y arriver, c'est ca."</li>
</ol>
<h2>Trois facons de vendre</h2>
<p>Le lien de vente direct sur la page de resultat, l'email de vente declenche par tag, et la combinaison valeur gratuite puis vente (la plus ethique). Pas de fausse rarete : si tu dis qu'une offre ferme, c'est qu'elle ferme vraiment.</p>$html$,
  $html$<p>Ton offre est branchee a ton quiz : un CTA sur la page de resultat et une sequence de vente douce. Ton systeme peut maintenant convertir.</p>
<p>Demain, dernier jour : ta communaute, ce qui transforme un coup en business. Et on celebre.</p>$html$,
  $st2$published$st2$, 150, $r$[]$r$::jsonb
),
(
  14, $s$jour-14-communaute$s$, $t$De tes leads a ta communaute$t$, $st$Sortir du one-shot, et cloturer en beaute$st$,
  $html$<p>Tu as un quiz qui capture, des sequences qui convertissent, une offre branchee. La difference entre un coup et un business : est-ce que les gens reviennent ?</p>
<h2>Le quiz comme moteur de communaute</h2>
<p>Choisis un lieu simple que tu peux animer dans la duree (groupe, newsletter vivante, espace dedie). Le resultat qui invite a taguer un ami fait entrer de nouveaux membres en continu. Partage les resultats agreges et lance des defis.</p>
<h2>L'autorite par la donnee</h2>
<p>Au bout de 100 ou 200 reponses, tu detiens une donnee que personne d'autre n'a sur ton marche. "J'ai analyse 500 [cible], voici ce qui ressort." Autorite incopiable, contenus, matiere pour ta prochaine offre. Et un quiz identitaire ne perime jamais : relance le meme chaque trimestre avec un nouveau pretexte.</p>
<p>Mission finale : ton lieu de communaute, ton message d'accueil, et ton plan des 30 prochains jours.</p>$html$,
  $html$<p>Tu es parti de zero il y a 14 jours, et tu as maintenant une machine a leads qui tourne. Tu n'as pas suivi une formation, tu as construit un actif. Sois fier.</p>
<p>Poste ton bilan dans la communaute, on celebre ca ensemble. Et ce n'est que le debut : le module bonus t'attend quand tu veux.</p>$html$,
  $st2$published$st2$, 160, $r$[]$r$::jsonb
),
(
  99, $s$bonus-formats-avances$s$, $t$Bonus : les formats avances$t$, $st$Pour aller plus loin, quand tu veux$st$,
  $html$<p>Pour les jours ou tu veux pousser. A consommer dans le desordre, sans pression.</p>
<h2>Les sondages</h2>
<p>Le petit frere discret du quiz : capte des avis, des donnees, les vrais mots de ta cible. Lance un sondage avant de creer un nouveau quiz.</p>
<h2>Les Popquiz avances</h2>
<p>Plusieurs cuepoints, comportement bloquant ou optionnel, embed partout. Le cliffhanger et le webinaire automatique.</p>
<h2>Le multiprofils</h2>
<p>Plusieurs projets isoles dans un seul compte (tags, branding, stats, cle Systeme.io separes). Teste 3 angles en parallele, ou gere plusieurs marques sans les melanger.</p>
<h2>Enchainer et combiner</h2>
<p>Un quiz d'entree large puis un quiz de diagnostic pour les chauds, croiser quiz et sondage, recycler les reponses en contenu. Tu as toutes les briques, c'est ton terrain de jeu.</p>$html$,
  $html$<p>Tu as les formats avances en tete. Lance d'abord, fais tourner, et reviens ici quand tu voudras passer au niveau au-dessus.</p>$html$,
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
with q(day_number, type, prompt, help_text, options, required, sort_order) as (
  values
  -- J-3 : preparation
  (-3, $p$action$p$, $p$Presente-toi en une phrase, comme tu la posteras dans la communaute.$p$, $p$Qui tu es, ce que tu fais, pour qui.$p$, $j$[]$j$::jsonb, true, 1),
  (-3, $p$action$p$, $p$Ton theme ou ta niche, en quelques mots ?$p$, $p$Meme vague pour l'instant, on l'affinera.$p$, $j$[]$j$::jsonb, true, 2),
  (-3, $p$recall$p$, $p$Pour ancrer : la promesse du challenge, c'est...$p$, $p$Aucun piege, juste l'idee cle.$p$, $j$[{"value":"systeme","label":"Un systeme qui capte des leads qualifies, en 14 jours"},{"value":"million","label":"Devenir riche en 14 jours"},{"value":"parfait","label":"Un quiz parfait, peu importe le temps"}]$j$::jsonb, false, 3),
  -- J0 : le pacte
  (0, $p$action$p$, $p$Ecris ton engagement public.$p$, $p$Par exemple : Je m'engage a publier mon quiz d'ici le jour 7.$p$, $j$[]$j$::jsonb, true, 1),
  (0, $p$decision$p$, $p$Ton etat d'esprit pour ces 14 jours ?$p$, $p$Il n'y a pas de mauvaise reponse, mais une qui aide a finir.$p$, $j$[{"value":"agir","label":"J'agis avant d'etre prete, je publie imparfait et je corrige apres"},{"value":"parfait","label":"J'attends que tout soit parfait avant de publier"}]$j$::jsonb, true, 2),
  (0, $p$self_eval$p$, $p$A quel point te sens-tu prete a publier dans 7 jours ?$p$, $p$Ca me sert a adapter le coach.$p$, $j$[{"value":"pas","label":"Pas du tout, ca m'angoisse un peu"},{"value":"moyen","label":"Moyennement"},{"value":"chaude","label":"Chaude, on y va"}]$j$::jsonb, false, 3),
  -- J1 : pourquoi un quiz
  (1, $p$action$p$, $p$Ecris en une phrase la transformation que ton audience cherche vraiment.$p$, $p$Pas la fonctionnalite, le resultat. Exemple : passer de debordee a organisee sans culpabiliser.$p$, $j$[]$j$::jsonb, true, 1),
  (1, $p$decision$p$, $p$Quel archetype de quiz colle le mieux a ton sujet ?$p$, $p$Tu pourras changer plus tard, c'est ton intuition de depart.$p$, $j$[{"value":"identitaire","label":"Quel type de X es-tu ? (identitaire, tres viral)"},{"value":"diagnostic","label":"Quel est ton blocage en Y ? (diagnostic, vend bien)"},{"value":"declencheur","label":"Es-tu pret pour Z ? (declencheur de decision)"}]$j$::jsonb, true, 2),
  (1, $p$self_eval$p$, $p$Ou en es-tu aujourd'hui avec les quiz ?$p$, $p$Ca me sert a adapter ton parcours et le coach.$p$, $j$[{"value":"jamais","label":"Je n'en ai jamais fait"},{"value":"essaye","label":"J'ai deja essaye sans vrai resultat"},{"value":"actif","label":"J'en ai un qui tourne deja"}]$j$::jsonb, true, 3),
  (1, $p$recall$p$, $p$Pour ancrer : ce qui fait qu'un quiz capte mieux qu'une page de capture, c'est surtout...$p$, $p$Aucun piege, juste l'idee cle du jour.$p$, $j$[{"value":"interactif","label":"Il est interactif : on participe au lieu de subir"},{"value":"joli","label":"Il est plus joli a regarder"},{"value":"long","label":"Il est plus long a remplir"}]$j$::jsonb, false, 4),
  -- J2 : objectif + cible
  (2, $p$decision$p$, $p$Quel est l'objectif n°1 de ton quiz ?$p$, $p$Tu en choisis UN principal. Un quiz qui veut tout faire ne fait rien.$p$, $j$[{"value":"capter","label":"Capter des leads"},{"value":"qualifier","label":"Qualifier"},{"value":"segmenter","label":"Segmenter"},{"value":"vendre","label":"Vendre directement"}]$j$::jsonb, true, 1),
  (2, $p$action$p$, $p$Complete : Apres mon quiz, le prospect realise que ______ et donc mon offre devient la suite logique.$p$, $p$C'est la boussole de tout ton quiz.$p$, $j$[]$j$::jsonb, true, 2),
  (2, $p$action$p$, $p$Ta fiche cible : 3 douleurs, 3 desirs, et 5 phrases exactes que ta cible emploie (volees dans les avis ou commentaires).$p$, $p$Copie les phrases qui reviennent, mot pour mot.$p$, $j$[]$j$::jsonb, true, 3),
  -- J3 : angle + resultats
  (3, $p$action$p$, $p$Ecris tes 3 ou 4 profils de resultats, avec un nom d'identite valorisant pour chacun.$p$, $p$Jamais une note. Meme le debutant devient une identite desirable.$p$, $j$[]$j$::jsonb, true, 1),
  (3, $p$action$p$, $p$Pour chaque profil : le tag Systeme.io et le CTA associe.$p$, $p$Rappelle-toi la chaine : resultat = tag = segment = offre.$p$, $j$[]$j$::jsonb, true, 2),
  (3, $p$recall$p$, $p$Pour ancrer : on ecrit les resultats...$p$, $p$La methode inversee.$p$, $j$[{"value":"avant","label":"Avant les questions"},{"value":"apres","label":"Apres les questions"},{"value":"jamais","label":"On ne les ecrit pas a l'avance"}]$j$::jsonb, false, 3),
  -- J4 : generation IA
  (4, $p$action$p$, $p$Colle ici ton prompt a 3 couches : Cible + Transformation + Ton.$p$, $p$Reprends ta fiche cible et ta phrase d'objectif des jours 2 et 3.$p$, $j$[]$j$::jsonb, true, 1),
  (4, $p$recall$p$, $p$Face a la sortie de l'IA, ton job c'est...$p$, $p$L'IA a fait le gros, toi tu fais la difference.$p$, $j$[{"value":"juger","label":"Juger et ajuster a 10%, relancer si l'angle est faux"},{"value":"reecrire","label":"Tout reecrire a la main"},{"value":"garder","label":"Tout garder tel quel sans relire"}]$j$::jsonb, false, 2),
  (4, $p$self_eval$p$, $p$Ton quiz genere, tu en es ou ?$p$, $p$On affine demain, pas de stress.$p$, $j$[{"value":"ok","label":"Brouillon genere, plutot content"},{"value":"retravailler","label":"Genere mais a retravailler"},{"value":"pas","label":"Pas encore genere"}]$j$::jsonb, true, 3),
  -- J5 : affiner
  (5, $p$decision$p$, $p$Ou places-tu ta capture email ?$p$, $p$C'est le reglage qui fait le plus bouger ton taux de leads.$p$, $j$[{"value":"avant_resultat","label":"Juste avant le resultat (au pic de curiosite)"},{"value":"debut","label":"Au tout debut du quiz"},{"value":"apres","label":"Apres avoir montre le resultat"}]$j$::jsonb, true, 1),
  (5, $p$action$p$, $p$Quelle premiere question facile et fun ouvre ton quiz ?$p$, $p$Jamais un champ email, jamais une question lourde.$p$, $j$[]$j$::jsonb, true, 2),
  (5, $p$self_eval$p$, $p$As-tu active la personnalisation dynamique (prenom, forme tu ou vous) ?$p$, $p$Marie, ton profil est... est lu jusqu'au bout.$p$, $j$[{"value":"oui","label":"Oui, activee"},{"value":"pas","label":"Pas encore"}]$j$::jsonb, false, 3),
  -- J6 : branding + mobile
  (6, $p$action$p$, $p$Note tes choix de branding : couleur primaire, couleur de fond, police, logo.$p$, $p$Reste simple, un quiz lisible bat un quiz surcharge.$p$, $j$[]$j$::jsonb, true, 1),
  (6, $p$self_eval$p$, $p$As-tu fait ton quiz en entier sur ton telephone ?$p$, $p$Non negociable : la majorite des reponses viennent du mobile.$p$, $j$[{"value":"oui","label":"Oui, teste et corrige"},{"value":"pas","label":"Pas encore"}]$j$::jsonb, true, 2),
  (6, $p$recall$p$, $p$Pour ancrer : la majorite de tes repondants seront sur...$p$, $p$D'ou l'importance du test mobile.$p$, $j$[{"value":"mobile","label":"Leur telephone"},{"value":"ordi","label":"Un ordinateur"},{"value":"tablette","label":"Une tablette"}]$j$::jsonb, false, 3),
  -- J7 : publier
  (7, $p$action$p$, $p$Quels tags as-tu configures ? (au minimum le tag de capture)$p$, $p$Resultat = tag = segment = offre.$p$, $j$[]$j$::jsonb, true, 1),
  (7, $p$self_eval$p$, $p$Ton quiz est-il publie et teste (un lead test taggue dans Systeme.io) ?$p$, $p$On debloque sur la complétion, pas sur la perfection.$p$, $j$[{"value":"verifie","label":"Publie et verifie (lead test taggue)"},{"value":"publie","label":"Publie mais pas encore teste"},{"value":"pas","label":"Pas encore publie"}]$j$::jsonb, true, 2),
  (7, $p$action$p$, $p$Colle le lien de ton quiz publie (a poster aussi dans la communaute).$p$, $p$C'est ton jalon. Felicitations.$p$, $j$[]$j$::jsonb, false, 3),
  -- J8 : viralite
  (8, $p$action$p$, $p$Quel bonus a valeur asymetrique offres-tu au partage ?$p$, $p$Un actif que tu as deja : PDF, mini-cours, acces. Coute zero a livrer, vaut cher.$p$, $j$[]$j$::jsonb, true, 1),
  (8, $p$self_eval$p$, $p$As-tu teste que le bonus se debloque apres partage ?$p$, $p$Verifie le parcours toi-meme.$p$, $j$[{"value":"oui","label":"Oui, ca fonctionne"},{"value":"pas","label":"Pas encore"}]$j$::jsonb, true, 2),
  -- J9 : trafic gratuit
  (9, $p$action$p$, $p$Sur quels emplacements dormants as-tu mis ton lien ?$p$, $p$Signature, bio, post epingle, page de remerciement de ton freebie...$p$, $j$[]$j$::jsonb, true, 1),
  (9, $p$action$p$, $p$A qui as-tu diffuse ton quiz aujourd'hui ?$p$, $p$Ta liste, ton reseau principal.$p$, $j$[]$j$::jsonb, true, 2),
  (9, $p$recall$p$, $p$Pour ancrer : le trafic le plus rentable a activer en premier, c'est...$p$, $p$On bouche les fuites avant de chercher du neuf.$p$, $j$[{"value":"fuites","label":"Tes points de fuite existants (page de remerciement, ton audience)"},{"value":"pub","label":"La pub froide"},{"value":"hasard","label":"Poster au hasard partout"}]$j$::jsonb, false, 3),
  -- J10 : partenaires + blog
  (10, $p$action$p$, $p$Quels 3 partenaires (meme cible, pas concurrents) as-tu contactes ?$p$, $p$Envoie-leur le script d'echange.$p$, $j$[]$j$::jsonb, true, 1),
  (10, $p$self_eval$p$, $p$As-tu embarque ton quiz sur une page de blog qui a du trafic ?$p$, $p$Si tu debutes, fais d'abord les 3 contacts.$p$, $j$[{"value":"oui","label":"Oui, embed en place"},{"value":"pas","label":"Pas encore"},{"value":"nonblog","label":"Je n'ai pas de blog"}]$j$::jsonb, true, 2),
  -- J11 : video/popquiz/pub
  (11, $p$decision$p$, $p$Ta diffusion avancee du jour ?$p$, $p$Choisis ce qui te correspond, les trois sont valables.$p$, $j$[{"value":"popquiz","label":"Creer un Popquiz a partir d'une video"},{"value":"pub","label":"Lancer un petit test pub en retargeting"},{"value":"gratuit","label":"Doubler la methode gratuite qui a le mieux marche"}]$j$::jsonb, true, 1),
  (11, $p$recall$p$, $p$Pour ancrer : la regle d'or de la pub, c'est...$p$, $p$Sinon la pub ne fait qu'accelerer la perte.$p$, $j$[{"value":"preuve","label":"Jamais de pub avant d'avoir prouve que le quiz convertit en gratuit"},{"value":"debut","label":"Faire de la pub des le premier jour"},{"value":"jamais","label":"Ne jamais faire de pub"}]$j$::jsonb, false, 2),
  -- J12 : leads
  (12, $p$self_eval$p$, $p$As-tu branche la sequence de bienvenue sur ton tag de capture ?$p$, $p$Le minimum vital : livrer le bonus, poser ta voix.$p$, $j$[{"value":"oui","label":"Oui, elle tourne"},{"value":"cours","label":"En cours"},{"value":"pas","label":"Pas encore"}]$j$::jsonb, true, 1),
  (12, $p$action$p$, $p$Quel email personnalise par resultat as-tu mis en place ?$p$, $p$Tu es un Visionnaire, voici quoi faire dans ton cas. Tout est dans le fichier des sequences.$p$, $j$[]$j$::jsonb, true, 2),
  -- J13 : vendre
  (13, $p$action$p$, $p$Quel CTA de vente as-tu ajoute sur ta page de resultat ?$p$, $p$Par profil si possible, sinon un seul vers ton offre principale.$p$, $j$[]$j$::jsonb, true, 1),
  (13, $p$recall$p$, $p$Pour ancrer : une page de resultat qui vend, c'est...$p$, $p$Le diagnostic se confirme, il ne se force pas.$p$, $j$[{"value":"4temps","label":"Le miroir, la cause cachee, le chemin, le pont vers l'offre"},{"value":"bouton","label":"Juste un gros bouton Acheter"},{"value":"rien","label":"Rien, on ne vend pas sur le resultat"}]$j$::jsonb, false, 2),
  (13, $p$self_eval$p$, $p$Ta sequence de vente douce est...$p$, $p$Valeur d'abord, vente ensuite.$p$, $j$[{"value":"installee","label":"Installee"},{"value":"cours","label":"En cours"},{"value":"pas","label":"Pas encore"}]$j$::jsonb, true, 3),
  -- J14 : communaute
  (14, $p$action$p$, $p$Ou installes-tu ta communaute, et quel est ton message d'accueil ?$p$, $p$Un endroit simple que tu tiens vaut mieux qu'un endroit ambitieux que tu abandonnes.$p$, $j$[]$j$::jsonb, true, 1),
  (14, $p$action$p$, $p$Ton plan des 30 prochains jours ?$p$, $p$Prochain quiz, rythme de publication, passage en abo, idee d'affiliation.$p$, $j$[]$j$::jsonb, true, 2),
  (14, $p$action$p$, $p$Ton bilan du challenge, a poster dans la communaute.$p$, $p$Ton quiz, tes premiers chiffres, ce que tu as appris.$p$, $j$[]$j$::jsonb, false, 3),
  -- Bonus
  (99, $p$decision$p$, $p$Quel format avance veux-tu explorer en premier ?$p$, $p$Aucune urgence, c'est ton terrain de jeu.$p$, $j$[{"value":"sondage","label":"Les sondages"},{"value":"popquiz","label":"Les Popquiz avances"},{"value":"multiprofils","label":"Le multiprofils (tester 3 angles)"},{"value":"systeme","label":"Enchainer plusieurs quiz"}]$j$::jsonb, false, 1)
)
insert into questions (day_id, type, prompt, help_text, options, required, sort_order)
select d.id, q.type, q.prompt, q.help_text, q.options, q.required, q.sort_order
from q
join days d on d.day_number = q.day_number
where not exists (
  select 1 from questions x where x.day_id = d.id and x.sort_order = q.sort_order
);

notify pgrst, 'reload schema';
