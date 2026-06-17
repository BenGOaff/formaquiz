-- ════════════════════════════════════════════════════════════════
-- FORMAQUIZ — seed du parcours condensé (7 jours : J0 à J7) + 4 bonus
-- ════════════════════════════════════════════════════════════════
--
-- Source : contenu/support-jours/*.md (contenu de page vu par l'élève) et
-- contenu/structure/STRUCTURE-7-jours.md (ordre). Le "Résumé + Points clés
-- + Actions" devient intro_html ; "Le quiz à valider" devient les questions.
-- Règle d'or : questions d'action/décision sur le projet de l'élève.
-- Déblocage à la COMPLÉTION (réponse fournie), jamais sur un score : les
-- questions de rappel servent au feedback, pas à bloquer (required=false).
-- Tutoiement, accents respectés, zéro tiret long.
--
-- Idempotent. Nettoie l'ancienne structure (J-3, J8 à J14, ancien bonus 99).

-- Nettoyage de l'ancienne structure (cascade sur questions/réponses de test).
delete from days where day_number not in (0,1,2,3,4,5,6,7,101,102,103,104);

-- ───────────────────────────────────────────────────────────────
-- 1. Les jours (J0 à J7) + bonus (101 à 104)
-- ───────────────────────────────────────────────────────────────
insert into days (day_number, slug, title, subtitle, intro_html, result_html, status, sort_order, resources, is_bonus)
values
(
  0, $s$j0-bienvenue$s$, $t$Bienvenue$t$, $st$Comment ça marche, et le pacte$st$,
  $html$<p>Bienvenue dans FormaQuiz. Ici, tu n'apprends pas les quiz en regardant des cours : tu avances dans un quiz pour apprendre à en faire un. En 7 jours, tu auras un quiz lead-magnet publié, branché à Systeme.io, qui capte des leads qualifiés en automatique. Aujourd'hui, on pose les bases.</p>
<h2>À retenir</h2>
<ul>
<li>Chaque jour : une vidéo qui enseigne, un quiz qui te fait agir. Finir le quiz du jour débloque le suivant.</li>
<li>Tes réponses ne sont pas un test : elles construisent ton projet et remplissent ton carnet de bord.</li>
<li>Un coach IA est là en bulle, à toute heure, dès que tu bloques.</li>
<li>L'engagement public change tout : ceux qui s'engagent à voix haute finissent.</li>
<li>On agit avant d'être prêt. Le quiz parfait qui reste en brouillon ne rapporte rien.</li>
</ul>
<h2>Tes actions du jour</h2>
<ul>
<li>Crée ton compte Tiquiz gratuit avec le lien fourni.</li>
<li>Rejoins la communauté et présente-toi en une phrase.</li>
<li>Réponds au quiz ci-dessous pour débloquer le Jour 1.</li>
</ul>$html$,
  $html$<p>Le pacte est scellé et ton compte est prêt. Tu viens de multiplier tes chances d'aller au bout.</p><p>Demain, on attaque le vrai sujet : pourquoi un quiz, et comment le penser pour qu'il rapporte.</p>$html$,
  $st2$published$st2$, 10, $r$[]$r$::jsonb, false
),
(
  1, $s$j1-pourquoi-penser$s$, $t$Pourquoi un quiz, et comment le penser$t$, $st$Les 3 décisions qui font qu'un quiz rapporte$st$,
  $html$<p>Aujourd'hui, tu comprends pourquoi un quiz capte cinq à dix fois mieux qu'un PDF, et tu prends les trois décisions qui font qu'un quiz rapporte au lieu d'amuser.</p>
<h2>À retenir</h2>
<ul>
<li>Le PDF est passif et finit oublié. Le quiz est interactif, il qualifie, segmente, se partage et se crée en 5 minutes.</li>
<li>Les maths jouent pour toi : une page classique convertit 1 à 3% des visiteurs, un bon quiz 20 à 50%.</li>
<li>Un quiz peut servir 16 objectifs. Choisis-en UN principal, sinon ton quiz ne fait rien de bien.</li>
<li>On construit à l'envers : d'abord la prise de conscience visée, puis les résultats, puis les questions.</li>
<li>Un quiz révèle une identité, il ne note pas. On bannit la logique bonne ou mauvaise réponse.</li>
<li>Vole le langage de {audience} : ses mots exacts, pris dans les avis et commentaires.</li>
</ul>
<h2>Tes actions du jour</h2>
<ul>
<li>Choisis l'objectif n°1 de ton quiz.</li>
<li>Complète : "après mon quiz, le prospect réalise que ___".</li>
<li>Note 3 phrases que ta cible emploie vraiment.</li>
<li>Écris tes 3 ou 4 profils de résultats, avec un nom valorisant chacun.</li>
</ul>$html$,
  $html$<p>Ton angle, tes résultats, les mots de {audience} : la matière de ton quiz est posée.</p><p>Demain, on prépare la tuyauterie qui rend tout le reste possible : Systeme.io.</p>$html$,
  $st2$published$st2$, 20, $r$[]$r$::jsonb, false
),
(
  2, $s$j2-prerequis-systemeio$s$, $t$Les prérequis : Systeme.io, tags, emails$t$, $st$La tuyauterie qui accueille tes leads$st$,
  $html$<p>Aujourd'hui, on prépare la tuyauterie qui rend tout le reste possible. Sans elle, tes leads tombent dans le vide. Trente minutes de mise en place, et tes leads arriveront au bon endroit, taggués et accueillis.</p>
<h2>À retenir</h2>
<ul>
<li>Systeme.io est le socle où vivent tes leads. Tiquiz s'y branche en natif.</li>
<li>Un tag est une étiquette posée sur un contact. Tiquiz peut en poser plusieurs en automatique : capture, par résultat, partage, par réponse.</li>
<li>La chaîne à retenir : résultat = tag = segment = offre.</li>
<li>Une automatisation : quand le contact reçoit le tag X, démarre la séquence Y.</li>
<li>L'email qui parle du résultat explose les ouvertures, sans effort manuel.</li>
</ul>
<h2>Tes actions du jour</h2>
<ul>
<li>Crée ou prépare ton compte Systeme.io et repère ta clé API.</li>
<li>Crée tes premiers tags : capture + un par profil de résultat.</li>
<li>Installe ta séquence de bienvenue à partir du fichier des 7 séquences email.</li>
</ul>$html$,
  $html$<p>Ta tuyauterie est prête : tes futurs leads seront accueillis et triés tout seuls.</p><p>Demain, on choisit le bon format Tiquiz pour ton objectif.</p>$html$,
  $st2$published$st2$, 30, $r$[]$r$::jsonb, false
),
(
  3, $s$j3-formats-tiquiz$s$, $t$Tiquiz : quiz, sondage, popquiz$t$, $st$Quel format pour quel objectif$st$,
  $html$<p>Dans Tiquiz, tu as trois formats : quiz, sondage, popquiz. Trois outils pour trois objectifs. Aujourd'hui, tu apprends lequel choisir, pour ne pas perdre de temps demain au moment de créer.</p>
<h2>À retenir</h2>
<ul>
<li>Le quiz révèle un type, capture l'email et segmente le lead. C'est ton outil d'acquisition principal.</li>
<li>Le sondage récolte des données et des avis. Il t'informe toi, il ne personnalise pas le répondant.</li>
<li>Le popquiz est un quiz incrusté dans une vidéo, pour capter au pic d'attention.</li>
<li>La règle : quiz pour des leads segmentés, sondage pour comprendre ton marché, popquiz pour capter sur tes vidéos.</li>
<li>On peut les combiner (à voir en bonus).</li>
</ul>
<h2>Tes actions du jour</h2>
<ul>
<li>Choisis ton format selon ton objectif du Jour 1 (pour la plupart, ce sera le quiz).</li>
<li>Repère le template ou l'angle dont tu vas partir demain.</li>
</ul>$html$,
  $html$<p>Format choisi, angle repéré : tu sais exactement ce que tu crées demain.</p><p>Et demain, c'est le grand jour : ton quiz passe de l'idée à la réalité.</p>$html$,
  $st2$published$st2$, 40, $r$[]$r$::jsonb, false
),
(
  4, $s$j4-creer-connecter$s$, $t$Créer et connecter ton quiz$t$, $st$Jalon majeur : ton quiz publié et branché$st$,
  $html$<p>Le grand jour : ton quiz passe de l'idée à la réalité. Tu le génères avec l'IA, tu l'ajustes, tu l'habilles, tu le branches à Systeme.io et tu le publies. À la fin, ton quiz capture des leads taggués en automatique.</p>
<h2>À retenir</h2>
<ul>
<li>Le prompt à 3 couches (cible, transformation, ton) sort un quiz dix fois meilleur.</li>
<li>L'IA fait 90% du travail. Tu juges et tu ajustes 10% au clic, tu ne réécris pas tout.</li>
<li>Le réglage qui change le plus ton taux de leads : place la capture email juste avant le résultat.</li>
<li>Première question facile et fun, jamais un champ email. Personnalise avec le prénom. Teste sur mobile.</li>
<li>Pense à l'image de résultat partageable et à l'image OG (l'aperçu au partage).</li>
<li>Publie, fais le quiz toi-même, et vérifie que ton contact arrive taggué dans Systeme.io.</li>
</ul>
<h2>Tes actions du jour</h2>
<ul>
<li>Génère ton quiz avec le prompt à 3 couches, puis affine.</li>
<li>Place la capture juste avant le résultat, mets une première question fun, active la personnalisation.</li>
<li>Applique ton branding et teste sur mobile.</li>
<li>Connecte ta clé API Systeme.io, configure au moins le tag de capture, publie et teste de bout en bout.</li>
<li>Poste ton lien dans la communauté.</li>
</ul>$html$,
  $html$<p>Ton quiz est PUBLIÉ et il capture des leads en automatique. C'est le jalon, félicitations.</p><p>Demain, on le remplit de monde, sans dépenser un euro.</p>$html$,
  $st2$published$st2$, 50, $r$[]$r$::jsonb, false
),
(
  5, $s$j5-promouvoir-gratos$s$, $t$Promouvoir gratuitement$t$, $st$Remplir ton quiz sans dépenser un euro$st$,
  $html$<p>Ton quiz est en ligne, il faut du monde dedans. Aujourd'hui, on le remplit sans dépenser un euro, avec des méthodes que presque personne n'utilise. C'est le jour le plus chargé en growth hacks.</p>
<h2>À retenir</h2>
<ul>
<li>La viralité d'abord : un bonus de partage à valeur asymétrique, l'anti-triche honnête, le résultat qui invite à taguer un ami.</li>
<li>Récupère le trafic que tu gaspilles déjà : la page de remerciement de ton freebie actuel est ton meilleur gisement.</li>
<li>Les emplacements dormants : lien en bio, signature email, post épinglé.</li>
<li>Un quiz = des semaines de contenu : un post par résultat, par question, par statistique.</li>
<li>Les audiences des autres, gratuitement : le pod d'échange de quiz, le cadeau d'invité, les groupes sans spammer.</li>
</ul>
<h2>Tes actions du jour</h2>
<ul>
<li>Active ton étape bonus de partage avec un bonus que tu as déjà et qui donne envie.</li>
<li>Mets ton lien dans au moins 3 emplacements, dont la page de remerciement de ton freebie.</li>
<li>Publie ton quiz sur ton canal principal avec un premier post.</li>
<li>Repère 1 ou 2 partenaires pour un échange.</li>
</ul>$html$,
  $html$<p>Ta viralité est activée et tes premières diffusions sont lancées. Le trafic va monter.</p><p>Demain, on transforme ces leads en communauté vivante.</p>$html$,
  $st2$published$st2$, 60, $r$[]$r$::jsonb, false
),
(
  6, $s$j6-communaute$s$, $t$Créer ta communauté$t$, $st$Transformer tes leads en audience vivante$st$,
  $html$<p>Un lead seul t'oublie en 48 heures. La différence entre un coup et un business, c'est que les gens reviennent. Aujourd'hui, tu transformes tes leads de quiz en communauté.</p>
<h2>À retenir</h2>
<ul>
<li>Une communauté transforme une liste morte en audience vivante qui échange et rachète.</li>
<li>Choisis la plateforme que tu peux animer dans la durée : Facebook (large), Telegram (direct), Discord (structuré).</li>
<li>Le quiz est ton moteur d'entrée : la page de résultat invite à rejoindre, taguer un ami fait entrer du monde.</li>
<li>Le flywheel d'autorité : au bout de 100 à 200 réponses, tu as une donnée que personne d'autre n'a.</li>
<li>Anime simplement, mais régulièrement.</li>
</ul>
<h2>Tes actions du jour</h2>
<ul>
<li>Choisis ta plateforme et crée ton espace communauté.</li>
<li>Ajoute une invitation à le rejoindre sur la page de résultat de ton quiz.</li>
<li>Écris ton premier message d'accueil.</li>
</ul>$html$,
  $html$<p>Ta communauté démarre, et ton quiz l'alimente. Tu ne fais plus du one-shot.</p><p>Demain, dernier jour : on pilote avec tes vrais chiffres, et on célèbre.</p>$html$,
  $st2$published$st2$, 70, $r$[]$r$::jsonb, false
),
(
  7, $s$j7-adapter-suivre$s$, $t$Adapter, suivre, et après$t$, $st$Piloter avec tes vrais chiffres, et la suite$st$,
  $html$<p>Dernier jour. Tu as un quiz qui capture, branché, qui ramène du monde, avec une communauté qui démarre. Aujourd'hui, tu apprends à piloter avec tes vrais chiffres, à améliorer ton quiz sans tout casser, et à savoir quoi faire ensuite. Et on célèbre.</p>
<h2>À retenir</h2>
<ul>
<li>Regarde le funnel Tiquiz : vues, démarrages, complétions, partages, conversions. Cherche où tu perds le plus de monde.</li>
<li>La règle du point de fuite unique : corrige UNE seule chose à la fois, puis remesure.</li>
<li>Ta progression, ce sont tes vrais chiffres (leads, partages, ventes), pas des étoiles.</li>
<li>Un quiz identitaire ne périme jamais : relance-le chaque trimestre avec un nouveau prétexte.</li>
<li>Ensuite : passe en abo Tiquiz quand tu satures, explore les bonus, regarde le multiprofils et l'affiliation.</li>
</ul>
<h2>Tes actions du jour</h2>
<ul>
<li>Lis ton funnel Tiquiz et repère ton point de fuite n°1.</li>
<li>Applique un seul correctif.</li>
<li>Écris ton plan des 30 prochains jours.</li>
<li>Poste ton bilan (ton quiz et tes premiers chiffres) dans la communauté.</li>
</ul>$html$,
  $html$<p>Tu es parti de zéro il y a 7 jours, et tu as maintenant une machine à leads qui tourne. Sois fier, tu as construit un actif.</p><p>Les bonus t'attendent quand tu veux pour aller plus loin.</p>$html$,
  $st2$published$st2$, 80, $r$[]$r$::jsonb, false
),
(
  101, $s$bonus-trafic-payant$s$, $t$Bonus : Trafic payant$t$, $st$La pub presque sans risque$st$,
  $html$<p>La pub est la seule méthode payante du parcours. Bien faite, elle est presque sans risque, grâce à un mécanisme que les pros connaissent : l'offre auto-liquidante.</p>
<h2>À retenir</h2>
<ul>
<li>Règle d'or : jamais de pub avant d'avoir prouvé que ton quiz convertit en gratuit.</li>
<li>L'offre auto-liquidante : une petite offre (7 à 27 euros) juste après le quiz, qui rembourse ta pub. Quand chaque euro dépensé te revient, le trafic devient illimité et sans risque.</li>
<li>Commence petit : 5 à 10 euros par jour.</li>
<li>Le retargeting des abandonneurs est la pub la plus rentable.</li>
<li>Ne monte le budget que quand les maths sont bonnes.</li>
</ul>
<h2>Tes actions</h2>
<ul>
<li>Mets en place une petite offre auto-liquidante après ton quiz.</li>
<li>Si tu testes la pub, lance 5 euros par jour en retargeting de tes abandonneurs.</li>
<li>Observe le coût par lead avant de monter le budget.</li>
</ul>$html$,
  $html$<p>Tu as les clés pour amplifier ton quiz sans cramer ton budget. À toi de jouer, quand tu seras prête.</p>$html$,
  $st2$published$st2$, 1010, $r$[]$r$::jsonb, true
),
(
  102, $s$bonus-vendre-avec-un-quiz$s$, $t$Bonus : Vendre avec un quiz$t$, $st$La page de résultat = ta page de vente$st$,
  $html$<p>Ton quiz a diagnostiqué, donc tu prescris. Vendre devient une suite logique, sans pression ni fausse urgence. Ce bonus te montre comment transformer ta page de résultat en page de vente.</p>
<h2>À retenir</h2>
<ul>
<li>Le prospect a conclu seul, donc zéro résistance. Tu confirmes, tu ne pousses pas.</li>
<li>La page de résultat = ta page de vente en 4 temps : miroir, cause cachée, chemin, pont vers l'offre.</li>
<li>3 façons de vendre : lien direct sur le résultat, email de vente par tag, ou valeur gratuite puis vente.</li>
<li>L'aiguilleur : chaque résultat pointe vers l'offre adaptée à ce profil.</li>
<li>Les coupons et promos : coupon-récompense, coupon par profil, coupon de partage, urgence honnête.</li>
</ul>
<h2>Tes actions</h2>
<ul>
<li>Ajoute un CTA de vente clair sur ta page de résultat.</li>
<li>Mets en place un coupon-récompense honnête relié à ton offre Systeme.io.</li>
<li>Installe ta séquence de vente douce à partir du fichier des 7 séquences email.</li>
</ul>$html$,
  $html$<p>Ta page de résultat peut maintenant convertir, proprement. Le diagnostic se confirme, il ne se force pas.</p>$html$,
  $st2$published$st2$, 1020, $r$[]$r$::jsonb, true
),
(
  103, $s$bonus-exploiter-sondages$s$, $t$Bonus : Exploiter les sondages$t$, $st$Connaître ta cible mieux que tes concurrents$st$,
  $html$<p>Le sondage est le petit frère discret du quiz. Il ne révèle pas un type, il récolte. C'est l'outil qui te fait connaître ta cible mieux que tes concurrents.</p>
<h2>À retenir</h2>
<ul>
<li>Le sondage pré-quiz : avant de créer ou d'améliorer un quiz, sonde ton audience pour récolter ses mots exacts.</li>
<li>L'analyse IA fait parler l'agrégat : patterns, segments, insights.</li>
<li>Le flywheel de données : tes réponses nourrissent ton contenu, ton autorité et ta prochaine offre.</li>
</ul>
<h2>Tes actions</h2>
<ul>
<li>Lance un sondage court à ton audience cette semaine.</li>
<li>Récupère 5 formulations exactes pour ton prochain quiz.</li>
<li>Sors un insight de l'analyse IA et fais-en un post.</li>
</ul>$html$,
  $html$<p>Tu sais maintenant écouter ton marché à la source. La data devient du contenu et des idées d'offres.</p>$html$,
  $st2$published$st2$, 1030, $r$[]$r$::jsonb, true
),
(
  104, $s$bonus-exploiter-popquiz$s$, $t$Bonus : Exploiter les popquiz$t$, $st$Capter au pic d'attention de tes vidéos$st$,
  $html$<p>Le popquiz, c'est un quiz incrusté dans une vidéo, un format que personne d'autre ne propose. Ce bonus te montre deux usages qui peuvent remplacer des heures de travail.</p>
<h2>À retenir</h2>
<ul>
<li>Bases avancées : plusieurs cuepoints sur une vidéo, comportement bloquant ou optionnel, embed partout.</li>
<li>Le cliffhanger : un quiz bloquant juste avant la révélation clé d'une vidéo. Pour la suite, il faut répondre, donc laisser son mail.</li>
<li>Le popquiz qui remplace un webinaire : ta meilleure vidéo de valeur + un quiz au moment fort, 24h sur 24, sans live.</li>
</ul>
<h2>Tes actions</h2>
<ul>
<li>Choisis ta meilleure vidéo de valeur.</li>
<li>Incruste un popquiz au moment où l'attention est la plus forte.</li>
<li>Récupère l'embed et place-le là où ta vidéo est vue.</li>
</ul>$html$,
  $html$<p>Tes vidéos peuvent désormais capter au pic d'attention, en automatique. Un format que tes concurrents n'ont pas.</p>$html$,
  $st2$published$st2$, 1040, $r$[]$r$::jsonb, true
)
on conflict (day_number) do update set
  slug = excluded.slug,
  title = excluded.title,
  subtitle = excluded.subtitle,
  intro_html = excluded.intro_html,
  result_html = excluded.result_html,
  status = excluded.status,
  sort_order = excluded.sort_order,
  is_bonus = excluded.is_bonus,
  updated_at = now();

-- ───────────────────────────────────────────────────────────────
-- 2. Les questions (la mission devient le quiz). Déblocage à la
--    complétion : required=true bloque, required=false = feedback.
-- ───────────────────────────────────────────────────────────────
create unique index if not exists uniq_questions_day_sort on questions (day_id, sort_order);

with q(day_number, type, prompt, help_text, options, required, sort_order) as (
  values
  -- J0
  (0, $p$action$p$, $p$C'est quoi ta niche ou ton activité, en une phrase ?$p$, $p$Sert à personnaliser la suite et ton coach.$p$, $j$[]$j$::jsonb, true, 1),
  (0, $p$decision$p$, $p$Où en es-tu aujourd'hui ?$p$, $p$Ça adapte ton parcours.$p$, $j$[{"value":"zero","label":"Je pars de zéro"},{"value":"essaye","label":"J'ai déjà essayé des lead magnets"},{"value":"audience","label":"J'ai déjà une audience"}]$j$::jsonb, true, 2),
  (0, $p$decision$p$, $p$As-tu créé ton compte Tiquiz gratuit ?$p$, $p$Si pas encore, le lien est juste au-dessus.$p$, $j$[{"value":"oui","label":"Oui, c'est fait"},{"value":"pas_encore","label":"Pas encore"}]$j$::jsonb, true, 3),
  (0, $p$decision$p$, $p$Le pacte : je m'engage à publier mon quiz d'ici la fin du parcours.$p$, $p$Un engagement à voix haute, c'est ce qui fait aller au bout.$p$, $j$[{"value":"oui","label":"Oui, je m'engage"}]$j$::jsonb, true, 4),
  -- J1
  (1, $p$decision$p$, $p$Quel est l'objectif n°1 de ton quiz ?$p$, $p$Un seul principal, sinon ton quiz ne fait rien de bien.$p$, $j$[{"value":"capter","label":"Capter des emails"},{"value":"qualifier","label":"Qualifier"},{"value":"segmenter","label":"Segmenter"},{"value":"diagnostiquer","label":"Diagnostiquer"},{"value":"orienter","label":"Orienter vers une offre"},{"value":"vendre","label":"Vendre"},{"value":"viralite","label":"Générer de la viralité"},{"value":"donnees","label":"Récolter des données"},{"value":"autorite","label":"Construire mon autorité"},{"value":"communaute","label":"Faire entrer dans ma communauté"},{"value":"autre","label":"Autre"}]$j$::jsonb, true, 1),
  (1, $p$action$p$, $p$Complète : après mon quiz, le prospect réalise que ___.$p$, $p$C'est la boussole de ton quiz.$p$, $j$[]$j$::jsonb, true, 2),
  (1, $p$action$p$, $p$Note 3 phrases que ta cible emploie vraiment.$p$, $p$Volées dans des avis ou commentaires. Ces mots iront dans ton quiz.$p$, $j$[]$j$::jsonb, false, 3),
  (1, $p$action$p$, $p$Écris tes 3 ou 4 profils de résultats, avec un nom valorisant chacun.$p$, $p$Alimente ton carnet et la génération du Jour 4.$p$, $j$[]$j$::jsonb, true, 4),
  -- J2
  (2, $p$decision$p$, $p$As-tu ton compte Systeme.io et sais-tu où trouver ta clé API ?$p$, $p$Si pas encore, le coach te guide.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"pas_encore","label":"Pas encore (le coach me guide)"}]$j$::jsonb, true, 1),
  (2, $p$decision$p$, $p$Combien de tags as-tu créés ?$p$, $p$La capture au minimum.$p$, $j$[{"value":"capture","label":"Juste la capture"},{"value":"capture_profils","label":"Capture + un par profil"},{"value":"pas_encore","label":"Pas encore"}]$j$::jsonb, true, 2),
  (2, $p$action$p$, $p$Quel sera le premier email de bienvenue que reçoit ton lead ?$p$, $p$Le coach peut t'aider à l'affiner.$p$, $j$[]$j$::jsonb, false, 3),
  (2, $p$self_eval$p$, $p$Où en es-tu sur la tuyauterie ?$p$, $p$Si tu bloques, le coach intervient.$p$, $j$[{"value":"pret","label":"Tout est prêt"},{"value":"presque","label":"Presque"},{"value":"bloque","label":"Je bloque"}]$j$::jsonb, false, 4),
  -- J3
  (3, $p$decision$p$, $p$Pour ton objectif, quel format choisis-tu ?$p$, $p$C'est ce que tu crées demain.$p$, $j$[{"value":"quiz","label":"Quiz"},{"value":"sondage","label":"Sondage"},{"value":"popquiz","label":"Popquiz"}]$j$::jsonb, true, 1),
  (3, $p$recall$p$, $p$Pour ancrer : la principale différence entre un quiz et un sondage ?$p$, $p$Aucun piège, c'est pour fixer l'idée.$p$, $j$[{"value":"perso","label":"Le quiz personnalise et segmente le répondant, le sondage agrège pour m'informer"},{"value":"pareil","label":"Le quiz et le sondage font la même chose"}]$j$::jsonb, false, 2),
  (3, $p$self_eval$p$, $p$Es-tu au clair sur ce que tu vas créer demain ?$p$, $p$Si doute, le coach t'aide à trancher.$p$, $j$[{"value":"pret","label":"Oui, prêt"},{"value":"doute","label":"J'ai un doute"}]$j$::jsonb, false, 3),
  -- J4
  (4, $p$decision$p$, $p$As-tu généré ton quiz avec le prompt à 3 couches ?$p$, $p$Cible + transformation + ton.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"pas_encore","label":"Pas encore"}]$j$::jsonb, true, 1),
  (4, $p$decision$p$, $p$Ta capture email est-elle placée juste avant le résultat ?$p$, $p$C'est le réglage qui fait le plus bouger ton taux de leads.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"corrige","label":"Non, je corrige"}]$j$::jsonb, true, 2),
  (4, $p$decision$p$, $p$Ton quiz est-il connecté à Systeme.io avec au moins le tag de capture ?$p$, $p$La preuve que tes leads arriveront bien.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"pas_encore","label":"Pas encore"}]$j$::jsonb, true, 3),
  (4, $p$action$p$, $p$Colle ici le lien de ton quiz publié.$p$, $p$Preuve de publication et matière pour la communauté.$p$, $j$[]$j$::jsonb, true, 4),
  -- J5
  (5, $p$decision$p$, $p$As-tu activé l'étape bonus de partage avec un bonus désirable ?$p$, $p$Un actif que tu as déjà, qui donne envie.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"pas_encore","label":"Pas encore"}]$j$::jsonb, true, 1),
  (5, $p$action$p$, $p$Quels canaux vas-tu utiliser pour diffuser ?$p$, $p$Par exemple : réseaux, YouTube, blog, email, partenaires.$p$, $j$[]$j$::jsonb, true, 2),
  (5, $p$decision$p$, $p$Dans combien d'emplacements dormants as-tu mis ton lien ?$p$, $p$Lien en bio, signature, post épinglé...$p$, $j$[{"value":"aucun","label":"Aucun"},{"value":"un_deux","label":"1 ou 2"},{"value":"trois_plus","label":"3 et plus"}]$j$::jsonb, true, 3),
  (5, $p$action$p$, $p$Écris le premier post que tu vas publier pour lancer ton quiz.$p$, $p$Le coach peut l'affiner.$p$, $j$[]$j$::jsonb, true, 4),
  -- J6
  (6, $p$decision$p$, $p$Quelle plateforme pour ta communauté ?$p$, $p$Celle que tu peux animer dans la durée.$p$, $j$[{"value":"facebook","label":"Facebook"},{"value":"telegram","label":"Telegram"},{"value":"discord","label":"Discord"},{"value":"autre","label":"Autre"}]$j$::jsonb, true, 1),
  (6, $p$decision$p$, $p$As-tu créé ton espace et ajouté l'invitation sur ta page de résultat ?$p$, $p$Le quiz devient ton moteur d'entrée.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"pas_encore","label":"Pas encore"}]$j$::jsonb, true, 2),
  (6, $p$action$p$, $p$Écris ton premier message d'accueil pour la communauté.$p$, $p$Le coach peut t'aider.$p$, $j$[]$j$::jsonb, true, 3),
  -- J7
  (7, $p$action$p$, $p$Quel est ton point de fuite n°1 dans ton funnel Tiquiz ?$p$, $p$Là où tu perds le plus de monde.$p$, $j$[]$j$::jsonb, true, 1),
  (7, $p$action$p$, $p$Quel correctif unique appliques-tu ?$p$, $p$Une seule chose à la fois, puis remesure.$p$, $j$[]$j$::jsonb, false, 2),
  (7, $p$action$p$, $p$Écris ton plan des 30 prochains jours.$p$, $p$Prochain quiz, rythme, abo, affiliation.$p$, $j$[]$j$::jsonb, true, 3),
  (7, $p$action$p$, $p$Colle ton bilan : ton quiz et tes premiers chiffres.$p$, $p$Boucle le parcours et nourrit tes témoignages.$p$, $j$[]$j$::jsonb, true, 4),
  -- Bonus 101 : trafic payant
  (101, $p$recall$p$, $p$Pour ancrer : quand peut-on lancer de la pub ?$p$, $p$Feedback, pas blocage.$p$, $j$[{"value":"preuve","label":"Seulement après avoir prouvé que le quiz convertit en gratuit"},{"value":"tout_de_suite","label":"Tout de suite, pour aller plus vite"}]$j$::jsonb, false, 1),
  (101, $p$decision$p$, $p$As-tu une idée d'offre auto-liquidante pour ton quiz ?$p$, $p$Le coach peut t'aider à la trouver.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"pas_encore","label":"Pas encore (le coach m'aide)"}]$j$::jsonb, false, 2),
  -- Bonus 102 : vendre
  (102, $p$recall$p$, $p$Pour ancrer : pourquoi un quiz vend-il sans forcer ?$p$, $p$Feedback, pas blocage.$p$, $j$[{"value":"diagnostic","label":"Parce qu'il a diagnostiqué, le prospect conclut seul (zéro résistance)"},{"value":"faux_timer","label":"Parce qu'on met un faux compte à rebours"}]$j$::jsonb, false, 1),
  (102, $p$decision$p$, $p$Quelle façon de vendre testes-tu en premier ?$p$, $p$Tu pourras en ajouter d'autres.$p$, $j$[{"value":"cta","label":"CTA direct sur le résultat"},{"value":"email","label":"Email de vente par tag"},{"value":"valeur","label":"Valeur gratuite puis vente"}]$j$::jsonb, false, 2),
  (102, $p$decision$p$, $p$Vas-tu utiliser un coupon-récompense ?$p$, $p$Honnête, relié à ton offre.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"plus_tard","label":"Pas pour l'instant"}]$j$::jsonb, false, 3),
  -- Bonus 103 : sondages
  (103, $p$recall$p$, $p$Pour ancrer : à quoi sert surtout un sondage ?$p$, $p$Feedback, pas blocage.$p$, $j$[{"value":"data","label":"À récolter des données et la voix du client"},{"value":"type","label":"À révéler un type au répondant"}]$j$::jsonb, false, 1),
  (103, $p$decision$p$, $p$Vas-tu lancer un sondage cette semaine ?$p$, $p$Même court, ça rapporte beaucoup.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"plus_tard","label":"Plus tard"}]$j$::jsonb, false, 2),
  -- Bonus 104 : popquiz
  (104, $p$recall$p$, $p$Pour ancrer : qu'est-ce qu'un popquiz cliffhanger ?$p$, $p$Feedback, pas blocage.$p$, $j$[{"value":"bloquant","label":"Un quiz bloquant juste avant la révélation d'une vidéo, à compléter pour la suite"},{"value":"fin","label":"Un quiz qu'on met en fin de page"}]$j$::jsonb, false, 1),
  (104, $p$decision$p$, $p$As-tu une vidéo où incruster un popquiz ?$p$, $p$Ta meilleure vidéo de valeur.$p$, $j$[{"value":"oui","label":"Oui"},{"value":"pas_encore","label":"Pas encore"}]$j$::jsonb, false, 2)
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
