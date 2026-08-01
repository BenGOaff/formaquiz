// lib/affiliateSwipe.ts
// Kit de contenu prêt à l'emploi pour les affiliés de L'Atelier du Quiz :
//   - SWIPE_EMAILS : la séquence de 6 emails (copie de
//     vente/emails-affilies-atelier-du-quiz.md), que l'affilié copie-colle.
//   - SWIPE_POSTS / ARTICLE_ANGLES / VIDEO_IDEAS : idées de contenu réseaux,
//     articles de blog et vidéos promo.
//
// Data-pure (réutilisable client + serveur). Les placeholders {LIEN} et
// {TON_PRENOM} sont substitués à l'affichage (lien affilié réel + prénom).
// {first_name} reste tel quel : c'est le champ de fusion de l'outil d'emailing
// de l'affilié, pas quelque chose qu'on remplit ici.
//
// Contenu USER-VISIBLE : aucun tiret long (règle anti-IA). Ne pas coller de
// texte généré sans repasser le scan grep "—\|–".

export interface SwipeEmail {
  /** Numéro dans la séquence (1 à 15). */
  n: number;
  /** Clé stable de personnalisation (indépendante du numéro d'ordre). */
  key: string;
  /** Rôle du mail (ouverture, preuve...). */
  role: string;
  /** 3 objets A/B/C à tester. */
  subjects: string[];
  /** Pré-en-tête d'une ligne. */
  preheader: string;
  /** Corps du mail, avec placeholders {first_name} {LIEN} {TON_PRENOM}. */
  body: string;
}

export const SWIPE_EMAILS: SwipeEmail[] = [
  {
    "n": 1,
    "key": "atelier-01",
    "role": "L'ouverture",
    "subjects": [
      "Créer le quiz, c'est 10 % du travail",
      "Ton quiz est en ligne. Et après ?",
      "La partie que personne ne te montre"
    ],
    "preheader": "Les 90 % qui rapportent, personne ne les explique.",
    "body": "Salut {first_name},\n\nTu as forcément déjà répondu à un quiz sur internet. « Quel type de … êtes-vous ? »\n\nTu as cliqué, tu as répondu à 5 questions, tu as eu ton profil. Et tu as laissé ton adresse email sans y réfléchir une seconde.\n\nC'est exactement ce qui rend cet outil redoutable. Personne n'a l'impression de donner quelque chose. Les gens adorent parler d'eux.\n\nAlors depuis quelques mois, tout le monde s'y met. Et c'est là que je vois toujours la même scène se répéter.\n\nLe quiz est créé. Il est joli. Il est en ligne.\n\nEt il ne rapporte rien.\n\nPas parce qu'il est raté. Parce que créer le quiz, c'est 10 % du travail. Les 90 % qui rapportent viennent après : amener du monde dessus, trier les gens selon leurs réponses, les relancer avec le bon message, et vendre. Dans cet ordre précis.\n\nEt ça, personne ne te l'explique.\n\nC'est pour ça que je te parle aujourd'hui de **l'Atelier du Quiz**, créé par ma partenaire Béné.\n\nCe n'est pas une formation de plus à regarder en accéléré un dimanche soir. C'est 7 jours, une action par jour, et à la fin tu as un quiz publié, connecté à ton Systeme.io, qui tourne sans toi.\n\nVoilà ce que tu installes pendant ces 7 jours :\n\n**Les 7 jours.** Une action par jour, et le 7ᵉ jour ton quiz est en ligne. Dans huit jours, tu envoies ton premier lien à tes gens et tu regardes les premières réponses arriver. (Accès à vie, mises à jour comprises.)\n\n**La méthode CAPTO®.** Les 5 maillons d'un quiz qui vend, montés dans l'ordre et appliqués à ton activité. Tu comprends pourquoi chaque question est là, donc tu deviens capable d'en écrire d'autres tout seul, pour ta prochaine offre comme pour celle d'après.\n\n**Le générateur d'emails.** Comment obtenir la suite d'emails de chaque profil de ton quiz, écrite noir sur blanc, sans en rédiger une ligne toi-même, et importée dans Systeme.io en un clic. Tu passes du quiz aux emails qui vendent dans le même après-midi.\n\n**Le moment de l'email.** Ce qu'il ne faut JAMAIS faire à la seconde où tu demandes l'adresse, et l'instant exact où elle se donne toute seule. Plus le réglage du jour 3, celui qui transforme un inscrit de plus en lecteur qui t'ouvre chaque semaine.\n\n**Du monde, sans pub.** Comment remplir ton quiz sans dépenser un euro de publicité, avec ce que tu as déjà sous la main aujourd'hui. Et le déclencheur qui donne envie à tes participants de l'envoyer eux-mêmes à leur entourage, pour que ton quiz continue de tourner pendant que tu dors.\n\n**Le Coach IA.** Une IA connectée aux vraies données de TON quiz, qui connaît ton domaine et ton contexte. Tu bloques à 23 h un dimanche, tu demandes, tu as ta réponse, et tu avances d'un cran le soir même.\n\n**Le Quiz Doctor.** Le diagnostic question par question, qui te montre exactement laquelle réécrire. Tu changes une phrase, et tes participants vont jusqu'au bout du parcours que tu as construit pour eux.\n\n**La communauté.** Tu vois les quiz des autres membres pendant que tu construis le tien. Tu repères le matin ce qui marche chez eux, et tu l'appliques chez toi l'après-midi.\n\n**Les 5 bonus.** Trafic payant sans risque · Vendre avec ton quiz · Les sondages · Les popquiz · Réseaux sociaux. Cinq leviers à activer une fois ton quiz en ligne, pour qu'il te ramène encore du monde dans six mois.\n\nLe tout pour **47 €, une seule fois.**\n\nPas d'abonnement, aucun prélèvement caché. L'Atelier est à toi pour toujours, mises à jour comprises. Et tu démarres sans payer un centime de plus : l'accès gratuit à l'outil est inclus.\n\n**Je vais voir l'Atelier du Quiz >> {LIEN}**\n\n{TON_PRENOM}\n\nPS : si tu as déjà un quiz qui ne te ramène pas grand-chose, retiens juste cette phrase. Le problème n'est presque jamais le quiz. C'est tout ce qu'il y a autour. Et c'est exactement ce qui se règle en 7 jours."
  },
  {
    "n": 2,
    "key": "atelier-02",
    "role": "La preuve chiffrée",
    "subjects": [
      "Presque 1 sur 2 laisse son email",
      "44,9 %. Regarde le chiffre de ta page de capture.",
      "Ce que ton PDF ne te dira jamais"
    ],
    "preheader": "Compare avec ta dernière page de capture. Tu vas rire (jaune).",
    "body": "Salut {first_name},\n\nUn chiffre, et je te laisse en tirer ta conclusion.\n\nDans la catégorie coaching et formation, **44,9 % des personnes qui commencent un quiz laissent leur email à la fin.** C'est le rapport Interact qui le dit, pas moi.\n\nPresque une personne sur deux.\n\nMaintenant, va regarder le taux de ta dernière page de capture. Prends ton temps, je t'attends.\n\nVoilà. On peut parler.\n\nEt encore, le taux n'est même pas le plus intéressant.\n\nUn lead magnet classique te donne une adresse email. Un PDF, une checklist, une mini-formation : la personne télécharge, ferme, oublie. Tu récupères une ligne de plus dans ta liste, et tu ne sais toujours rien d'elle.\n\nUn quiz te donne une adresse email **et** la raison d'acheter.\n\nParce que pendant qu'elle répond, la personne te dit où elle en est, ce qui la bloque, ce qu'elle a déjà essayé et ce qu'elle cherche. Elle te le dit volontairement, en cliquant, sans que tu aies rien à demander.\n\nRésultat : quand tu lui écris le lendemain, tu ne pars plus d'une adresse anonyme. Tu sais déjà à qui tu parles. Et le taux d'ouverture de tes emails ne ressemble plus du tout à celui d'avant.\n\nC'est toute la différence entre collecter des emails et construire une liste qui achète.\n\nMa partenaire Béné a construit **l'Atelier du Quiz** pour installer ça chez toi en 7 jours : une action par jour, ton quiz publié dès le 4ᵉ jour, connecté à ton Systeme.io, et tes inscrits qui arrivent déjà triés.\n\n47 €, une seule fois, accès à vie.\n\n**Je veux voir comment ça marche >> {LIEN}**\n\n{TON_PRENOM}\n\nPS : le chiffre de 44,9 %, c'est une moyenne de marché. Ce n'est pas une promesse, et Béné ne te la fera pas. Ce qu'elle te montre, c'est comment construire le quiz qui te met du bon côté de la moyenne."
  },
  {
    "n": 3,
    "key": "atelier-03",
    "role": "Ton PDF gratuit dort, et ce n'est pas ta faute",
    "subjects": [
      "Ton PDF gratuit dort. Voilà pourquoi.",
      "Le problème n'est pas ta niche",
      "Pourquoi tes lead magnets tombent à plat"
    ],
    "preheader": "Ce n'est ni ta niche, ni ton marketing.",
    "body": "Salut {first_name},\n\nSi tu as déjà essayé de capter des emails sans grand résultat, tu es sûrement passé par un de ces classiques.\n\nLe PDF gratuit à télécharger. La checklist. La mini-formation offerte. Le guide en 12 pages que tu as mis trois week-ends à écrire.\n\nTu l'as proposé. Quelques personnes l'ont pris. Et puis plus rien.\n\nAlors tu t'es dit : « c'est ma niche, ça ne marche pas chez moi. » Ou : « je suis nul en marketing. »\n\nCe n'est ni l'un ni l'autre.\n\nLe vrai problème, c'est que ces lead magnets sont **passifs**. La personne télécharge, ferme le fichier, et t'oublie. Toi, tu n'apprends strictement rien sur elle. Tu ne sais pas qui elle est, ce qu'elle veut, ni où elle en est.\n\nTu te retrouves donc à écrire à une liste dont tu ne sais rien. Et à envoyer la même offre à tout le monde en croisant les doigts.\n\nUn quiz fait exactement l'inverse.\n\nLa personne participe. Elle répond. Elle se dévoile. Elle prend du plaisir à le faire, parce que tout le monde adore parler de soi et découvrir son profil.\n\nEt à la fin, tu ne récupères pas juste un email. Tu récupères un email, un profil et un besoin précis, que tu peux taguer et adresser directement dans ton Systeme.io.\n\nC'est vrai dans tous les domaines, y compris le tien. Un sujet sérieux ne devient pas léger parce qu'il passe par un quiz. Au contraire : plus ton sujet est sérieux, plus les gens ont besoin de savoir où ils en sont avant de dépenser le moindre euro.\n\nDans **l'Atelier du Quiz**, ma partenaire Béné te fait transformer ton lead magnet qui dort en quiz qui trie et qui vend. 7 jours, une action par jour, zéro ligne de code.\n\n**Je transforme mon PDF qui dort >> {LIEN}**\n\n{TON_PRENOM}\n\nPS : garde ton PDF. Il ne devient pas inutile. Il devient ce que tu offres à la fin du quiz, une fois que tu sais à qui tu parles. Ce n'est plus le même objet."
  },
  {
    "n": 4,
    "key": "atelier-04",
    "role": "La chaîne à 5 maillons (et le maillon que je t'offre)",
    "subjects": [
      "Là où 9 personnes sur 10 lâchent",
      "Ton quiz n'est que la première marche",
      "Les 5 étapes, et celle que tout le monde saute"
    ],
    "preheader": "Un maillon offert à la fin de cet email, applicable ce soir.",
    "body": "Salut {first_name},\n\nPour qu'un quiz rapporte vraiment, il y a une chaîne à respecter. Dans l'ordre, elle donne ça :\n\n**1. Capter.** Concevoir un quiz qu'on a envie de finir : le bon angle, des résultats qui parlent vraiment à la personne.\n**2. Attirer.** Amener du trafic qualifié dessus, gratuitement.\n**3. Profiler.** Taguer chaque personne selon ses réponses, pour savoir précisément à qui tu parles.\n**4. Transformer.** Convertir ces inscrits en clients, avec les bons emails, la bonne offre, au bon moment.\n**5. Optimiser.** Mesurer, ajuster, et faire tourner le système en boucle.\n\nCapter, Attirer, Profiler, Transformer, Optimiser. C'est la méthode CAPTO®, mise au point par ma partenaire Béné.\n\nEt voilà le truc que presque personne ne te dira.\n\nLa plupart des gens font l'étape 1. Ils créent leur quiz. Ils sont fiers, et ils ont raison de l'être. Et ils s'arrêtent là.\n\nAlors le quiz est en ligne, mais personne ne tombe dessus : l'étape 2 manque. Ou il capte des emails que personne ne trie ni ne relance : les étapes 3 et 4 manquent.\n\nLa chaîne casse à la première marche, et le quiz ne rapporte rien.\n\nCe n'est pas un problème d'effort. C'est un problème d'enchaînement. Une seule maille qui lâche, et toute la chaîne tombe.\n\n**Tiens, je t'offre un maillon tout de suite.**\n\nÀ l'étape « Capter », l'ordre de tes questions change tout. Plus une personne avance dans ton quiz, moins elle a envie de l'abandonner. Donc si ta question la plus moyenne, celle qui fait décrocher, tombe trop tôt, tu perds des gens pour rien, juste avant qu'ils ne te laissent leur adresse.\n\nUne participante de l'Atelier a raconté exactement ça. Son quiz avait un gros abandon à la question 2. Elle a simplement inversé la 2 et la 3. Ses mots :\n\n*« J'ai juste inversé la 2 et la 3, et les résultats sont déjà bien meilleurs. Plus les gens sont avancés dans le quiz, moins ils abandonnent. En attendant de modifier la question, ça a suffi à bien augmenter le taux de complétion. »*\n\nComment a-t-elle su quelle question coinçait ? Parce que l'outil lui montre le parcours question par question. Elle a vu noir sur blanc que sa Q2 faisait fuir 18 % des gens. Tu repères le point chaud, tu le corriges, tu gardes plus de monde jusqu'au bout. Et plus de monde au bout, ça veut dire plus d'inscrits, sans un visiteur de plus.\n\nÇa, c'est UN maillon sur cinq, et tu peux l'appliquer ce soir.\n\nDans **l'Atelier du Quiz**, tu as les cinq, montés dans l'ordre avec toi, et un coach qui vérifie que les tiens tiennent. 7 jours, une action par jour, 47 € une seule fois.\n\n**Je veux la chaîne complète >> {LIEN}**\n\n{TON_PRENOM}\n\nPS : si tu ne devais retenir qu'une phrase de cet email : ton quiz n'est pas le produit fini, c'est la première marche. Ce qui rapporte, c'est ce que tu montes derrière."
  },
  {
    "n": 5,
    "key": "atelier-05",
    "role": "« Ça marche pour eux, pas pour moi »",
    "subjects": [
      "« Oui mais moi, c'est pas pareil »",
      "Les 4 raisons que ton cerveau vient d'inventer",
      "Ce que tu te dis, et pourquoi c'est faux"
    ],
    "preheader": "Je te les prends une par une, sans te raconter d'histoires.",
    "body": "Salut {first_name},\n\nJe connais ton cerveau, parce que c'est le mien aussi.\n\nDès qu'il voit quelque chose qui marche chez quelqu'un d'autre, il part chercher la raison pour laquelle, toi, ça ne marcherait pas. Et il la trouve toujours. En général, une de ces quatre.\n\n**« Je n'ai pas l'expertise. »**\nSi. Tu as un métier, un vécu, des galères que tu as traversées et que d'autres traversent en ce moment. C'est ça, l'expertise. Le quiz sert justement à la mettre en avant, et l'IA t'aide à la formuler à partir de tes propres mots. Dans l'Atelier, un carnet de bord se remplit au fil des jours avec TES réponses. Ton quiz s'écrit à partir de toi.\n\n**« Je n'ai pas le budget. »**\nTu n'en as pas besoin pour démarrer. On commence par le trafic 100 % gratuit, et l'accès gratuit à l'outil est inclus. Tu peux faire tout le parcours sans sortir un euro de plus que les 47 € de l'Atelier. La publicité, tu la mettras plus tard, ou jamais, comme tu veux.\n\n**« La technique, ça me dépasse. »**\nZéro code, zéro Zapier, zéro Make. L'IA écrit la première version de ton quiz, tu corriges en cliquant, et la connexion à Systeme.io est montrée clic par clic. Si tu sais répondre à des questions, tu sais faire ton quiz.\n\n**« Je suis seul face à tout ça. »**\nC'est justement le cœur de l'Atelier. Un coach IA connecté aux vraies données de ton quiz, disponible jour et nuit, qui te débloque à la seconde où tu cales. Une communauté de membres qui construisent en même temps que toi. Et Béné, qui répond personnellement.\n\nEt s'il te reste un doute après ces quatre-là, voilà ce qu'elle te propose.\n\n**Si tu n'as pas capté un seul inscrit avec ton quiz au bout de 30 jours, alors que tu as appliqué la méthode, elle te rembourse.**\n\nTout le risque est de son côté. Soit ça te ramène des inscrits, soit tu récupères ton argent. On ne propose pas ça quand on n'y croit pas.\n\nDonc la vraie question n'est plus « est-ce que ça peut marcher pour moi ».\n\nC'est « est-ce que je me lance ».\n\n**Oui, je me lance >> {LIEN}**\n\n{TON_PRENOM}\n\nPS : la seule personne qui sait vraiment de quoi tu es capable, c'est toi. Et honnêtement, à 47 € avec un remboursement au bout, la question du risque ne se pose plus. Reste celle de l'envie."
  },
  {
    "n": 6,
    "key": "atelier-06",
    "role": "Partir de zéro (vraiment de zéro)",
    "subjects": [
      "Elle est partie de zéro. Vraiment de zéro.",
      "Aucune audience, aucune liste, aucun abonné",
      "1 h 30 de travail, et tout a changé"
    ],
    "preheader": "Comptes créés la veille. Zéro abonné. Et pourtant.",
    "body": "Salut {first_name},\n\nIl y a une objection que je n'ai pas encore traitée, et c'est la plus fréquente de toutes.\n\n« Ça marche pour ceux qui ont déjà une audience. Moi je pars de rien. »\n\nAlors laisse-moi te présenter Jocelyne.\n\nJocelyne a été orthophoniste pendant 40 ans. Elle a écrit près de 70 romans. Et récemment, elle décide de se lancer sur un sujet complètement nouveau pour elle, où absolument personne ne la connaît.\n\nComptes Facebook et Instagram créés la veille. Aucune audience. Aucune liste email. Un livre sur Amazon que personne ne lit encore.\n\nLe point de départ le plus dur qui soit.\n\nElle avait deux options. Passer six mois à construire une audience avant d'espérer capter quoi que ce soit. Ou faire l'inverse.\n\nElle a fait un quiz. 5 questions, 5 profils sur mesure. L'IA a écrit la première version, elle l'a affinée avec ses 40 ans de métier. Temps de création : à peu près 1 h 30.\n\nLe quiz tague chaque personne selon son profil, directement dans Systeme.io. Le tag déclenche l'email adapté à cette personne. Pas de Zapier, pas de Make, pas une ligne de code.\n\nEt en 9 jours, elle est passée de zéro contact à une liste qualifiée, sur laquelle elle sait déjà qui est qui.\n\nSon plus beau retour n'est même pas un chiffre. C'est une lectrice qui lui a envoyé un message qui lui a « fait venir les larmes aux yeux ».\n\nParce qu'un quiz bien fait, ça ne capture pas juste une adresse. Ça touche la bonne personne, sur le bon sujet, au bon moment.\n\nJe te dis les choses franchement : Jocelyne a aussi testé un petit budget publicitaire pour accélérer. Ce n'est ni obligatoire, ni le point de départ. Dans l'Atelier, on commence par le trafic 100 % gratuit, avec ce que tu as déjà sous la main.\n\nCe que son histoire prouve, c'est autre chose, et c'est bien plus important : ce qui a tout changé pour elle, ce n'est pas son audience, elle n'en avait pas. C'est d'avoir suivi le bon enchaînement, dans le bon ordre.\n\nCapter, attirer, profiler, transformer, optimiser.\n\nC'est exactement ce que tu montes dans **l'Atelier du Quiz** de ma partenaire Béné. 7 jours, une action par jour, 47 € une seule fois.\n\n**Je pars de zéro moi aussi >> {LIEN}**\n\n{TON_PRENOM}\n\nPS : le meilleur moment pour construire une liste qualifiée, c'était il y a deux ans. Le deuxième meilleur moment, c'est cette semaine, pendant que ton concurrent envoie encore un PDF."
  },
  {
    "n": 7,
    "key": "atelier-07",
    "role": "Pourquoi je te parle d'elle",
    "subjects": [
      "Pourquoi je te parle d'elle",
      "Je ne recommande presque jamais rien",
      "Une ancienne infirmière, et un réflexe qui change tout"
    ],
    "preheader": "Ce qui m'a convaincu, ce n'est pas la promesse.",
    "body": "Salut {first_name},\n\nTu as remarqué que je ne te parle pas d'un outil ou d'une formation toutes les semaines. C'est volontaire.\n\nAlors quand je le fais, autant que tu saches pourquoi.\n\nBéné a été infirmière avant de créer son entreprise. Et il lui reste un réflexe de ce métier : on ne traite pas un symptôme, on cherche la vraie cause.\n\nC'est exactement ce qu'elle a fait avec les quiz.\n\nPendant des mois, elle a vu des gens créer leur quiz, être fiers de l'avoir fait, et puis… plus rien. Le quiz reste là. Personne dessus. Ou des adresses qui tombent et qui ne mènent nulle part.\n\nEt toujours la même phrase qui revenait dans sa boîte mail : « j'ai fait mon quiz, mais je fais quoi maintenant ? »\n\nAu début elle répondait, un par un, longuement. Des heures. Parce que ça la rend dingue, cette idée que quelqu'un fasse l'effort, y croie, et abandonne juste parce que personne ne lui a montré la suite.\n\nPuis elle a arrêté de traiter le symptôme. Elle a cherché la vraie cause.\n\nEt la vraie cause n'était pas le quiz. C'était le vide autour : pas de trafic, pas d'automatisation, pas de plan.\n\nAlors elle a construit **l'Atelier du Quiz**. Pas un produit de plus. La réponse qu'elle aurait voulu pouvoir donner à chaque personne restée coincée.\n\n7 jours, une action par jour, un livrable concret à chaque fois. Un coach IA connecté à tes données quand elle ne peut pas être là en personne. Et elle qui répond, personnellement, dans la communauté.\n\nVoilà ce qui m'a convaincu. Ce n'est pas la promesse, c'est la façon dont c'est construit. Ça se voit tout de suite, quand quelqu'un a passé des mois sur un truc pour qu'il serve vraiment.\n\n**Je vais voir ce qu'elle a construit >> {LIEN}**\n\n{TON_PRENOM}\n\nPS : 47 €, paiement unique, accès à vie, mises à jour comprises. Et si tu n'as pas capté un seul inscrit en 30 jours en appliquant la méthode, elle rembourse. Ça aussi, ça dit quelque chose sur la personne."
  },
  {
    "n": 8,
    "key": "atelier-08",
    "role": "« C'est gratuit sur YouTube »",
    "subjects": [
      "« Je trouve tout ça gratuitement sur YouTube »",
      "La voie lente, ou la voie rapide ?",
      "Pourquoi payer pour un truc qu'on trouve gratuitement"
    ],
    "preheader": "Question légitime. Réponse franche.",
    "body": "Salut {first_name},\n\n« Pourquoi je paierais, alors que je peux tout trouver gratuitement sur YouTube ? »\n\nC'est une bonne question, elle est légitime, et je vais y répondre franchement.\n\nOui, tu peux tout trouver gratuitement. Les quiz, le trafic, les tags, les séquences d'emails. Tout est quelque part.\n\nEn morceaux. Éparpillé dans des centaines de vidéos qui ne se parlent pas entre elles.\n\nLe problème n'a jamais été l'information. Le problème, c'est le temps.\n\nLa voie gratuite, concrètement, c'est : chercher la bonne vidéo et trier les mauvaises, assembler des bouts de méthodes qui ne vont pas ensemble, adapter tout ça à ton activité à toi, tester, te tromper, recommencer. Et rester bloqué trois jours sur un détail, sans personne pour te dire où est l'erreur.\n\nDes semaines. Parfois des mois. Et le plus souvent, un abandon en cours de route, parce que la vie continue à côté.\n\nLa voie de **l'Atelier du Quiz**, c'est le même savoir. Béné ne réinvente pas la route.\n\nSauf qu'il est rangé dans l'ordre, testé, adapté à ton domaine, et que tu n'y es jamais seul : le coach IA te débloque à la seconde où tu cales, et Béné répond tous les jours.\n\n7 jours. Une action par jour. Un quiz qui tourne au bout.\n\n47 € pour gagner des semaines. À toi de voir ce que vaut ton temps.\n\n**Je prends le raccourci >> {LIEN}**\n\n{TON_PRENOM}\n\nPS : compte le nombre d'heures que tu as déjà passées à regarder des vidéos sur le sujet sans rien publier derrière. Multiplie par ton tarif horaire. Puis relis le prix."
  },
  {
    "n": 9,
    "key": "atelier-09",
    "role": "Ce n'est ni facile ni rapide",
    "subjects": [
      "Ce n'est ni facile ni rapide",
      "Je ne vais pas te mentir là-dessus",
      "À ne pas prendre si tu cherches un bouton magique"
    ],
    "preheader": "Autant te le dire maintenant que te décevoir après.",
    "body": "Salut {first_name},\n\nJe vais écrire un truc qu'on lit rarement dans un email qui recommande quelque chose.\n\nL'Atelier du Quiz, ce n'est pas magique.\n\nTu ne vas pas cliquer, croiser les bras, et voir les inscrits pleuvoir. Il va falloir répondre aux questions du carnet, construire ton quiz, le publier, le diffuser. Bref, bosser. Un peu chaque jour, pendant 7 jours.\n\nSi tu cherches le bouton « gagner sans rien faire », ferme cet email. Sincèrement. Je préfère te le dire maintenant.\n\nPar contre.\n\nSi tu acceptes de mettre une petite heure par jour pendant une semaine, voilà ce que ça installe chez toi :\n\n**Un quiz publié et qui capte dès le 4ᵉ jour**, pas dans six mois, pas « quand tu auras le temps ». Tu vois les premières réponses arriver pendant que la semaine est encore en cours.\n\n**Tes inscrits qui rentrent triés tout seuls**, avec leur profil et leur besoin déjà rangés dans ton Systeme.io. Tu ouvres ton tableau de bord le matin et tu sais à qui tu écris aujourd'hui.\n\n**Un plan clair, dans l'ordre**, avec une seule action par jour. Tu ouvres ton ordinateur en sachant exactement quoi faire, et tu le refermes en ayant terminé quelque chose.\n\nCe n'est pas « facile » au sens de sans rien faire. C'est simple au sens de : tu sais exactement quoi faire, étape par étape, avec quelqu'un pour te débloquer quand tu cales.\n\nLa nuance est énorme.\n\nJocelyne a mis à peu près 1 h 30 à créer son quiz, en partant d'une audience à zéro. Elle a bossé, oui. Mais au bon endroit, dans le bon ordre.\n\nC'est tout ce que je te propose : arrêter de t'épuiser au mauvais endroit.\n\n**Je suis d'accord pour bosser au bon endroit >> {LIEN}**\n\n{TON_PRENOM}\n\nPS : 7 jours. C'est plus court que le temps que tu as déjà passé à te demander si tu devais te lancer."
  },
  {
    "n": 10,
    "key": "atelier-10",
    "role": "Ce qui se passe vraiment pendant les 7 jours",
    "subjects": [
      "Ce qui se passe vraiment pendant les 7 jours",
      "Tu n'apprends pas à faire un quiz. Tu en fais un.",
      "Une action par jour, un livrable par jour"
    ],
    "preheader": "Ce n'est pas une formation. C'est un chantier.",
    "body": "Salut {first_name},\n\nTu as déjà acheté une formation que tu n'as jamais finie. Moi aussi. Tout le monde aussi.\n\nLe schéma est toujours le même : tu regardes trois vidéos le premier soir, plein d'enthousiasme. Puis la semaine reprend. Et le module 4 t'attend encore aujourd'hui.\n\nL'Atelier du Quiz est construit pour rendre ça impossible.\n\nParce que tu n'apprends pas à faire un quiz. **Tu fais ton quiz.**\n\nChaque jour, une action, une seule. Et un livrable concret à la fin. Pas des notes. Pas un « j'ai compris ». Un morceau de ton quiz qui existe et que tu peux montrer.\n\nTrois moments que je te donne, pour que tu voies le rythme :\n\n**Le jour 3.** Le réglage au moment où tu demandes l'adresse email. Un détail que presque personne ne connaît, et qui décide si la personne te la donne ou referme l'onglet à deux questions de la fin.\n\n**Le jour 4.** Ton quiz est publié. En ligne, connecté à ton Systeme.io, capable de capter. À partir de là, les trois jours qui restent servent à amener du monde dessus et à faire tourner la machine derrière.\n\n**Le jour 7.** Le système est monté. Tu envoies ton premier lien, et tu regardes les réponses tomber. Ensuite, ça tourne sans toi.\n\nEntre les deux, un carnet de bord se remplit avec TES réponses, et c'est lui qui sert de matière première : à ton quiz, à tes emails, à ta page de résultat.\n\nVoilà pourquoi Béné appelle ça un quizing et pas une formation. Tu apprends en faisant, et ce que tu produis reste à toi.\n\n47 €, paiement unique, accès à vie, mises à jour comprises.\n\n**Je veux mon quiz en ligne cette semaine >> {LIEN}**\n\n{TON_PRENOM}\n\nPS : le jour 4, c'est le moment que je préfère. C'est là que ça arrête d'être un projet et que ça devient un truc qui existe sur internet."
  },
  {
    "n": 11,
    "key": "atelier-11",
    "role": "Tu ne restes jamais bloqué",
    "subjects": [
      "Il est 23 h un dimanche et tu bloques",
      "Ce qui fait qu'on abandonne (et comment c'est réglé)",
      "Personne pour te répondre : voilà le vrai problème"
    ],
    "preheader": "On n'abandonne pas par manque de motivation.",
    "body": "Salut {first_name},\n\nOn n'abandonne presque jamais par manque de motivation.\n\nOn abandonne parce qu'on bloque sur un truc, qu'il n'y a personne pour répondre, et que le lendemain on est passé à autre chose. Le projet ne meurt pas d'un coup. Il meurt d'un point d'interrogation resté sans réponse.\n\nDans l'Atelier du Quiz, il y a trois filets pour que ça n'arrive pas.\n\n**Le Coach IA.** Une IA connectée aux vraies données de TON quiz, qui connaît ton domaine et ton contexte. Ce n'est pas un chatbot générique à qui tu dois réexpliquer ta vie à chaque fois. Tu bloques à 23 h un dimanche, tu demandes, tu as ta réponse, et tu avances d'un cran le soir même.\n\n**Le Quiz Doctor.** Ton quiz tourne mais peu de gens vont au bout ? Ce n'est pas tout le quiz qu'il faut refaire. Le diagnostic te montre, question par question, exactement laquelle bloque. Tu réécris une phrase, et tes participants vont jusqu'au bout du parcours que tu as construit pour eux.\n\n**La communauté, et Béné dedans.** Tu vois les quiz des autres membres pendant que tu construis le tien. Tu repères le matin ce qui marche chez eux, et tu l'appliques chez toi l'après-midi. Et Béné répond personnellement, tous les jours.\n\nTrois filets, pour que la question du dimanche soir ne devienne jamais l'abandon du lundi matin.\n\nC'est aussi ça que tu achètes à 47 €. Pas seulement du contenu : quelqu'un au bout du fil.\n\n**Je veux être accompagné jusqu'au bout >> {LIEN}**\n\n{TON_PRENOM}\n\nPS : compte les projets que tu as laissés tomber à 80 %. C'est presque toujours à cause d'un blocage minuscule que personne n'était là pour lever."
  },
  {
    "n": 12,
    "key": "atelier-12",
    "role": "Les 5 bonus et les 2 outils",
    "subjects": [
      "7 cadeaux dans l'Atelier",
      "Les bonus coûtent plus cher que le programme",
      "Ce qu'il y a une fois ton quiz en ligne"
    ],
    "preheader": "Ce qui se passe après le 7ᵉ jour.",
    "body": "Salut {first_name},\n\nJusqu'ici je t'ai parlé des 7 jours. Aujourd'hui je te parle de ce qu'il y a après.\n\nParce qu'une fois ton quiz en ligne, l'Atelier ne s'arrête pas. Il te donne 5 bonus et 2 outils. Voilà à quoi ils servent.\n\n**🎁 Le trafic payant sans risque.** La règle d'or : tu ne lances jamais de publicité avant que ton quiz capte déjà en gratuit. Plus l'offre à placer juste après le quiz pour que ses ventes remboursent ce que tu as dépensé, et le seul poste de publicité vraiment rentable, celui qui va rechercher les gens qui ont commencé ton quiz sans le finir. Tu n'ouvres les vannes que le jour où les maths sont bonnes.\n\n**🎁 Vendre avec ton quiz.** Pourquoi ton quiz pose le diagnostic et pourquoi c'est toi qui prescris, ce qui fait que la personne ne se braque pas quand tu proposes ta solution. Plus ta page de résultat en 4 temps, et l'aiguilleur qui envoie chaque profil vers l'offre faite pour lui. Tu arrêtes de proposer la même chose à tout le monde, et tu commences à proposer la bonne chose à la bonne personne.\n\n**🎁 Les sondages.** Comment écrire ton quiz et ton offre avec les mots exacts de ta cible, au lieu de les deviner tout seul à ton bureau. Une réponse est anecdotique, trois cents deviennent des tendances, et l'analyse les sort à ta place. Tu crées ta prochaine offre en sachant déjà qu'elle va se vendre.\n\n**🎁 Les popquiz.** Un quiz incrusté dans ta vidéo, à un moment que tu choisis toi-même. Le cliffhanger, placé juste avant la révélation, pile quand l'envie de savoir est la plus forte. Ta meilleure vidéo devient un webinaire qui tourne 24 h sur 24, et plus personne ne rate la session.\n\n**🎁 Les réseaux sociaux, en 7 modules.** Facebook, Instagram, LinkedIn, Reddit, Threads et X, un module par réseau, avec ce qui marche et ce qui te fait sanctionner. Tu ramènes du monde sur ton quiz sans payer un euro de publicité.\n\n**🛠 Les modèles à importer.** Rien à écouter ici. Ta séquence de bienvenue en 4 emails et trois modèles de page de liens, importés en un clic dans ton Systeme.io. Tu remplaces, tu publies. La partie technique que tu repousses depuis des mois est pliée avant le dîner.\n\n**🛠 Le générateur de campagne.** Tu remplis ton carnet, il écrit ta séquence de bienvenue, un email par profil de résultat, ta séquence de vente et ton kit de lancement. Celui qui a répondu « je débute » ne reçoit pas le message de celui qui vend déjà. Et plus ton carnet est rempli, meilleure est la campagne.\n\nTout ça est compris dans les 47 €. Une seule fois, accès à vie, mises à jour comprises.\n\n**Je veux les 7 >> {LIEN}**\n\n{TON_PRENOM}\n\nPS : regarde bien la liste. Ce ne sont pas des bonus posés là pour gonfler la page. Chacun sert à faire tourner ton quiz une fois qu'il est en ligne. C'est-à-dire au moment exact où la plupart des gens ne savent plus quoi faire."
  },
  {
    "n": 13,
    "key": "atelier-13",
    "role": "Les questions qu'on me pose",
    "subjects": [
      "Je réponds à tes questions sur l'Atelier",
      "« C'est un abonnement ? » et 5 autres questions",
      "Tout ce que tu te demandes avant de te lancer"
    ],
    "preheader": "Réponses courtes, sans détour.",
    "body": "Salut {first_name},\n\nTu m'as posé des questions sur l'Atelier du Quiz depuis que je t'en parle. Je réponds à toutes d'un coup, cash.\n\n**« C'est un abonnement ? »**\nNon. 47 €, une seule fois, et l'Atelier est à toi pour toujours, mises à jour comprises. Aucun prélèvement caché, aucune reconduction.\n\n**« Il faut payer un outil en plus ? »**\nNon, tu démarres en gratuit. L'accès gratuit à l'outil est inclus et il suffit pour créer et publier ton premier quiz pendant les 7 jours. Tu passeras à une formule supérieure seulement quand ton quiz te ramènera déjà des inscrits, c'est-à-dire quand ça se financera tout seul.\n\n**« C'est encore une formation comme les autres ? »**\nNon, et c'est tout l'intérêt. Tu ne regardes pas des vidéos en prenant des notes que tu n'appliques jamais. Tu apprends à faire un quiz en faisant le tien. Chaque jour, une action, un livrable. À la fin, tu n'as pas juste compris : tu as un quiz publié qui tourne.\n\n**« Et si je bloque ? »**\nUn coach IA connecté aux données de ton quiz, disponible jour et nuit, qui te débloque tout de suite. Et au-dessus, Béné répond personnellement. Un vrai humain, pas un répondeur.\n\n**« Je suis nul en technique. C'est grave ? »**\nC'est même fait pour toi. Zéro code, zéro Make, zéro Zapier. L'IA écrit la première version de ton quiz à partir de ton idée, tu corriges en cliquant, chaque étape est montrée clic par clic. Si tu sais répondre à des questions, tu sais faire ton quiz.\n\n**« Est-ce que ça marche dans MON domaine ? »**\nOui. Un quiz s'adapte partout, parce que partout les gens adorent parler d'eux et découvrir leur profil. Coach, consultant, formateur, e-commerce, freelance, créateur de contenu : la mécanique est identique, c'est seulement l'angle qui change. Et l'angle, tu le travailles dès le premier jour.\n\n**« Et si ça ne marche pas pour moi ? »**\nSi tu n'as pas capté un seul inscrit avec ton quiz au bout de 30 jours, alors que tu as appliqué la méthode, Béné te rembourse. Le risque est de son côté, pas du tien.\n\nVoilà. S'il te reste une question qui n'est pas là, réponds simplement à cet email. Je lis tout.\n\n**J'ai ma réponse, j'y vais >> {LIEN}**\n\n{TON_PRENOM}\n\nPS : la question que personne ne pose et qui compte le plus : « est-ce que je vais le faire ? » 7 jours, une heure par jour. Regarde ton agenda de la semaine prochaine et réponds honnêtement."
  },
  {
    "n": 14,
    "key": "atelier-14",
    "role": "Imagine, dans 30 jours",
    "subjects": [
      "Un matin, dans 30 jours",
      "Tu ouvres ton téléphone et il s'est passé un truc",
      "Et si, cette fois, c'était toi ?"
    ],
    "preheader": "Ça ne t'a demandé aucun effort la veille.",
    "body": "Salut {first_name},\n\nFais-moi plaisir, deux minutes.\n\nDans 30 jours, un matin, tu ouvres ton téléphone au réveil.\n\nEt tu vois que des gens ont répondu à ton quiz pendant la nuit. Pas des curieux : des gens qualifiés, qui t'ont dit où ils en sont, ce qui les bloque et ce qu'ils cherchent. Ils sont déjà rangés dans la bonne liste, avec le bon tag.\n\nTu n'as rien fait de spécial la veille. Tu as dîné, regardé un truc, dormi. Ton quiz, lui, a travaillé.\n\nTa liste grossit chaque semaine, sans que tu postes tous les jours en espérant récolter trois adresses.\n\nEt quand tu lances une offre, tu ne pars plus d'une page blanche. Tu parles à des gens déjà chauds, déjà triés, dont tu connais le problème exact.\n\nTu ne demandes plus « est-ce que ça va intéresser quelqu'un ? ». Tu sais déjà qui, et pourquoi.\n\nCe n'est pas un rêve lointain. C'est ce que fait un quiz correctement construit et correctement connecté.\n\nEntre toi et cette matinée-là, il y a exactement deux choses : un quiz bien monté, et 7 jours pour le faire.\n\nC'est tout l'objet de **l'Atelier du Quiz**. 47 €, une seule fois, accès à vie.\n\n**Je veux ce matin-là >> {LIEN}**\n\n{TON_PRENOM}\n\nPS : dans 30 jours, tu auras 30 jours de plus, quoi qu'il arrive. La seule question, c'est de savoir si ton quiz tournera déjà ou s'il sera encore « à faire »."
  },
  {
    "n": 15,
    "key": "atelier-15",
    "role": "Le dernier",
    "subjects": [
      "Je ne t'en reparle plus",
      "Deux chemins, et c'est toi qui choisis",
      "Le dernier email sur le sujet"
    ],
    "preheader": "Pas de compte à rebours. Juste un choix.",
    "body": "Salut {first_name},\n\nC'est le dernier email que je t'écris sur l'Atelier du Quiz. Après, je passe à autre chose et je te laisse tranquille.\n\nPas de compte à rebours, pas de fausse urgence, pas de « il ne reste que ». Je n'aime pas ça, et tu mérites mieux.\n\nJuste un constat, et deux chemins.\n\n**Le premier chemin.** Tu fermes cet email. Dans trois mois, ta liste ressemble à celle d'aujourd'hui, tu écris toujours à des gens dont tu ne sais rien, et tu envoies toujours la même offre à tout le monde en croisant les doigts. Ce n'est pas dramatique. C'est juste identique.\n\n**Le deuxième chemin.** Tu prends 7 jours, une heure par jour. Au 4ᵉ jour ton quiz est en ligne et capte déjà. Au 7ᵉ, le système tourne : les gens répondent, se trient tout seuls, et arrivent chez toi avec leur profil et leur besoin. Ensuite ça continue sans toi, le soir, le week-end, en vacances.\n\nCe que ça coûte : 47 €, une seule fois, accès à vie, mises à jour comprises.\n\nCe que ça risque : rien. Pas un seul inscrit capté au bout de 30 jours en appliquant la méthode, et Béné te rembourse.\n\nJe serais content de te savoir dedans. Mais quoi que tu décides, c'est ton choix et je le respecte.\n\n**Le lien est ici, il reste ouvert >> {LIEN}**\n\n{TON_PRENOM}\n\nPS : garde cet email quelque part. Le jour où tu en auras marre d'écrire à une liste dont tu ne sais rien, tu sauras où retrouver le lien."
  }
];

export interface SwipePost {
  /** Réseau conseillé. */
  platform: string;
  /** Accroche courte pour se repérer. */
  hook: string;
  /** Texte du post, prêt à coller, avec {LIEN}. */
  body: string;
}

export const SWIPE_POSTS: SwipePost[] = [
  {
    platform: "LinkedIn / Facebook",
    hook: "Le quiz n'est pas le problème",
    body: `Tout le monde te dit "fais un quiz pour capter des leads".

Personne ne te dit ce qui vient après.

Le quiz, c'est la partie facile. Le vrai travail, c'est : amener du trafic dessus, trier les leads, les relancer, vendre. Dans le bon ordre.

C'est exactement ce que L'Atelier du Quiz t'apprend en 7 jours, une action par jour. À la fin tu as un quiz publié, branché à ton outil d'emailing, qui tourne tout seul.

47€ une fois. Accès Tiquiz gratuit inclus. Garantie 30 jours.

👉 {LIEN}`,
  },
  {
    platform: "Instagram / Story",
    hook: "Preuve chiffrée (Jocelyne)",
    body: `285 leads qualifiés en 9 jours. 63,50€ de pub au total. 0,18€ le lead.

Partie de zéro : aucune audience, aucune liste, une niche inconnue.

Son secret ? Un quiz de 5 questions qui tague chaque personne et déclenche le bon email, sans code.

La méthode complète est dans L'Atelier du Quiz.

👉 Lien en bio / {LIEN}`,
  },
  {
    platform: "X / Threads",
    hook: "Fil court CAPTO",
    body: `Pourquoi 9 quiz sur 10 ne rapportent rien :

Les gens font l'étape 1 (créer le quiz) et s'arrêtent là.

Il en manque 4 : attirer du trafic, profiler, transformer, optimiser.

La chaîne casse à la première marche.

L'Atelier du Quiz déroule les 5 étapes avec toi en 7 jours 👉 {LIEN}`,
  },
  {
    platform: "Email court / DM",
    hook: "Relance douce 1 ligne",
    body: `Petit rappel : le quiz qui capte des leads en automatique, tu peux l'avoir en ligne dans 7 jours. Une action par jour, 47€ une fois, garantie 30 jours. 👉 {LIEN}`,
  },
];

export interface ArticleAngle {
  title: string;
  angle: string;
}

export const ARTICLE_ANGLES: ArticleAngle[] = [
  {
    title: "Pourquoi ton quiz ne te ramène aucun lead (et comment y remédier)",
    angle:
      "Démonte l'idée que le problème vient du quiz. Le vrai sujet : le trafic, le profilage et les relances. Termine sur L'Atelier du Quiz comme méthode complète (lien affilié).",
  },
  {
    title: "Étude de cas : 285 leads en 9 jours en partant de zéro",
    angle:
      "Raconte l'histoire de Jocelyne (niche inconnue, aucune liste). Décortique l'enchaînement capter, attirer, profiler, transformer. CTA vers l'Atelier.",
  },
  {
    title: "La méthode CAPTO expliquée simplement",
    angle:
      "Un article pédagogique sur les 5 étapes. Donne un maillon en cadeau (l'ordre des questions), garde le reste pour l'Atelier. Idéal en SEO longue traîne.",
  },
  {
    title: "Quiz, sondage, test de personnalité : lequel pour capter des leads ?",
    angle:
      "Comparatif utile qui positionne le quiz de profilage comme le plus efficace. Recommande l'outil (Tiquiz) et la méthode (l'Atelier) en fin d'article.",
  },
];

export interface VideoIdea {
  format: string;
  title: string;
  outline: string;
}

export const VIDEO_IDEAS: VideoIdea[] = [
  {
    format: "Reel / Short (30-45 s)",
    title: "Le réglage à 0€ qui garde tes leads",
    outline:
      "Hook : \"Tes visiteurs abandonnent ton quiz juste avant de te laisser leur email.\" Montre l'ordre des questions qui change tout. CTA : méthode complète dans l'Atelier, lien en bio.",
  },
  {
    format: "Reel / Short (30-45 s)",
    title: "285 leads, 63€ de pub",
    outline:
      "Balance les 3 chiffres à l'écran. \"Partie de zéro, sans audience.\" Explique en 2 phrases le quiz qui tague. CTA vers l'Atelier.",
  },
  {
    format: "Vidéo YouTube (5-8 min)",
    title: "J'ai construit un quiz qui capte des leads en 7 jours",
    outline:
      "Format défi : une action par jour à l'écran, le quiz qui se monte, la connexion Systeme.io sans code, le premier lead. Lien affilié en description et épinglé.",
  },
  {
    format: "Live / Webinaire",
    title: "Atelier offert : ton premier quiz lead-magnet",
    outline:
      "Mini-atelier live où tu montres la création d'un quiz en direct, puis tu recommandes l'Atelier pour aller au bout (trafic, relances). CTA lien affilié en fin de live.",
  },
];

export interface DefaultAsset {
  title: string;
  description: string;
  /** Chemin public (servi depuis /public/affiliate-kit). */
  url: string;
  fileType: string;
}

/**
 * Kit visuel officiel de L'Atelier du Quiz, fourni d'office à tous les
 * affiliés (logo, icône, mockups, jaquette). Servi depuis /public : le
 * process de deploy doit recopier /public dans le build standalone (déjà
 * le cas pour le logo / favicon). Béné peut en ajouter d'autres via
 * l'admin (bucket Supabase) ; les deux listes s'affichent ensemble.
 */
export const DEFAULT_ASSETS: DefaultAsset[] = [
  {
    title: "Logo Atelier du Quiz",
    description: "Logo complet, fond transparent (PNG).",
    url: "/affiliate-kit/logo-atelier-du-quiz.png",
    fileType: "image/png",
  },
  {
    title: "Logo Atelier du Quiz (vectoriel)",
    description: "Logo complet en SVG, net à toutes les tailles.",
    url: "/affiliate-kit/logo-atelier-du-quiz.svg",
    fileType: "image/svg+xml",
  },
  {
    title: "Icône seule",
    description: "Icône carrée, idéale en avatar ou vignette.",
    url: "/affiliate-kit/logo-icone.png",
    fileType: "image/png",
  },
  {
    title: "Mockup produit",
    description: "Visuel produit à poser dans tes posts et emails.",
    url: "/affiliate-kit/mockup-atelier-du-quiz.png",
    fileType: "image/png",
  },
  {
    title: "Mockup produit (fond blanc)",
    description: "Même mockup sur fond blanc, pour les fonds clairs.",
    url: "/affiliate-kit/mockup-atelier-du-quiz-fond-blanc.png",
    fileType: "image/png",
  },
  {
    title: "Jaquette Atelier du Quiz",
    description: "Couverture verticale, pour vignettes et miniatures.",
    url: "/affiliate-kit/jaquette-atelier-du-quiz.png",
    fileType: "image/png",
  },
  {
    title: "Logo fond foncé",
    description: "Version du logo à poser sur un fond sombre (SVG).",
    url: "/affiliate-kit/logo-atelier-du-quiz-fond-fonce.svg",
    fileType: "image/svg+xml",
  },
];

/**
 * Posts réseaux prêts à publier (format 4:5), fournis d'office. Numéros
 * impairs = visuel image (PNG), numéros pairs = carrousel (PDF). Servis
 * depuis /public/affiliate-kit/posts.
 */
export const DEFAULT_POSTS: DefaultAsset[] = [
  { n: 1, kind: "image" },
  { n: 2, kind: "carousel" },
  { n: 3, kind: "image" },
  { n: 4, kind: "carousel" },
  { n: 5, kind: "image" },
  { n: 6, kind: "carousel" },
  { n: 7, kind: "image" },
  { n: 8, kind: "carousel" },
  { n: 9, kind: "image" },
  { n: 10, kind: "carousel" },
  { n: 11, kind: "image" },
  { n: 12, kind: "carousel" },
  { n: 13, kind: "image" },
  { n: 14, kind: "carousel" },
  { n: 15, kind: "image" },
].map(({ n, kind }) => {
  const num = String(n).padStart(2, "0");
  const isImg = kind === "image";
  return {
    title: `Post ${n}`,
    description: isImg ? "Visuel prêt à publier (image)." : "Carrousel prêt à publier (PDF).",
    url: `/affiliate-kit/posts/post-${num}.${isImg ? "png" : "pdf"}`,
    fileType: isImg ? "image/png" : "application/pdf",
  };
});


/** Légendes des 15 posts du kit, à copier à côté de leur visuel. Le lien
 *  n'est PAS dans le texte : il se colle en premier commentaire. */
export interface SwipePostText {
  n: number;
  title: string;
  kind: "image" | "carousel";
  caption: string;
}

export const SWIPE_POST_TEXTS: SwipePostText[] = [
  {
    "n": 1,
    "title": "L'ouverture",
    "kind": "image",
    "caption": "Tout le monde sait créer un quiz.\n\nPresque personne ne sait le faire rapporter.\n\nCréer le quiz, c'est 10 % du travail.\n\nLes 90 % qui rapportent, personne ne les montre : amener du monde dessus, trier les gens selon leurs réponses, les relancer avec le bon message, et vendre. Dans cet ordre précis.\n\nRésultat : des quiz très jolis qui ne rapportent rien.\n\nC'est pour ça que je parle de l'Atelier du Quiz, créé par ma partenaire Béné.\n\nCe n'est pas une formation de plus à empiler dans ton drive. C'est 7 jours, une action par jour, et à la fin tu as un quiz publié, connecté à ton Systeme.io, qui tourne sans toi.\n\n47 €. Une fois. Accès à vie. L'accès à l'outil est inclus pour démarrer sans payer un centime de plus.\n\nSi ton quiz actuel ne rapporte rien, retiens juste ça : le problème n'est presque jamais le quiz. C'est tout ce qu'il y a autour.\n\nLien en commentaire ↓\n\n#leadgeneration #systemeio #marketingdigital #solopreneur #quiz"
  },
  {
    "n": 2,
    "title": "Partir de zéro",
    "kind": "carousel",
    "caption": "Elle a créé ses comptes la veille. Zéro abonné. Zéro liste.\n\nNeuf jours plus tard, 285 personnes avaient laissé leur email.\n\nVoilà comment 👇\n\nJocelyne a été orthophoniste pendant 40 ans. Elle se lance sur un sujet où personne ne la connaît. Le pire point de départ possible.\n\nAu lieu d'attendre des mois pour construire une audience, elle monte un quiz. Il lui a pris une heure et demie. 5 questions, 5 profils.\n\nChaque réponse tague la personne dans Systeme.io et déclenche le bon email. Sans Zapier, sans une ligne de code.\n\nCe que son histoire prouve, ce n'est pas qu'elle a eu de la chance. C'est que ce qui a tout changé, ce n'est pas son audience : elle n'en avait pas. C'est d'avoir suivi le bon enchaînement, dans le bon ordre.\n\nCapter, attirer, profiler, transformer, optimiser.\n\nC'est exactement la méthode qu'on installe pas à pas dans l'Atelier du Quiz, celui de ma partenaire Béné. Et on y démarre en trafic 100 % gratuit, avant même de penser à dépenser un euro.\n\nSi tu attends d'avoir une audience pour lancer quelque chose, tu attends la mauvaise chose.\n\nLien en commentaire ↓\n\n#casclient #leadgeneration #systemeio #marketingdigital #solopreneur"
  },
  {
    "n": 3,
    "title": "Ce qui te retient",
    "kind": "image",
    "caption": "« Ça marche pour eux, pas pour moi. »\n\nC'est la phrase qui enterre le plus de projets.\n\nTu veux lancer un quiz pour capter des contacts, mais ton cerveau a déjà trouvé pourquoi ça raterait. En général, l'une de ces quatre.\n\n**« Je n'ai pas l'expertise. »** Si. Ton métier, ton vécu, tes galères, tes clients. Ce qui te manque, ce n'est pas la matière, c'est la forme. L'IA fait la mise en forme, pas le fond.\n\n**« Je n'ai pas le budget. »** Le trafic gratuit est le point de départ, pas le plan B. L'accès à l'outil est inclus.\n\n**« La technique, ça me dépasse. »** Zéro code. Tu connectes ton quiz à ton Systeme.io en cliquant.\n\n**« Je suis tout seul face à ça. »** Un coach disponible jour et nuit, une communauté, et Béné qui répond en personne.\n\nEt une garantie : aucun contact capté en 30 jours en appliquant la méthode, remboursé.\n\nLa vraie question n'est plus « est-ce que ça peut marcher pour moi ».\n\nC'est « est-ce que je m'y mets ».\n\nLien en commentaire ↓\n\n#mindset #solopreneur #leadgeneration #systemeio #quiz"
  },
  {
    "n": 4,
    "title": "La chaîne à 5 maillons",
    "kind": "carousel",
    "caption": "Tu as testé un quiz et il ne t'a rien rapporté ?\n\n9 fois sur 10, c'est la même erreur : tu t'es arrêté au premier maillon.\n\nUn quiz qui rapporte, c'est une chaîne. Dans l'ordre. C'est la méthode CAPTO® 👇\n\n**Capter** : un quiz qu'on a envie de finir.\n**Attirer** : du monde dessus, gratuitement.\n**Profiler** : taguer chaque personne selon ses réponses.\n**Transformer** : le bon email, au bon moment.\n**Optimiser** : mesurer, ajuster, recommencer.\n\nCe que presque personne te dit : la plupart des gens font le premier maillon. Ils créent leur quiz. Ils sont fiers, et à raison. Et ils s'arrêtent là.\n\nLe quiz est en ligne, mais personne ne tombe dessus. Ou il capte des emails que personne ne trie ni ne relance.\n\nLa chaîne casse à la première marche, et le quiz meurt tranquillement dans son coin. À côté de ton vieux PDF, tu vois lequel.\n\nCe n'est pas un problème d'effort. C'est un problème d'enchaînement.\n\nAlors je t'offre un maillon, gratuitement.\n\nDans « Capter », l'ordre de tes questions change tout. Une participante l'a dit mieux que moi : « J'ai déplacé une seule question, celle qui demandait le budget. Je l'ai mise à la fin au lieu du début. 18 % de réponses en plus la semaine suivante. »\n\nElle n'a pas amené plus de monde. Elle a juste arrêté d'en perdre.\n\nÇa, c'est un cinquième d'un maillon. Il y en a cinq.\n\nDans l'Atelier du Quiz, celui de ma partenaire Béné, on construit chaque maillon ensemble, appliqué à ton activité. Et tu n'y es jamais seul.\n\nLien en commentaire ↓\n\n#methode #leadgeneration #systemeio #marketingdigital #quiz"
  },
  {
    "n": 5,
    "title": "Les questions qu'on me pose",
    "kind": "image",
    "caption": "« Encore une formation que je ne finirai jamais. »\n\nC'est ce que tu te dis. Et tu as raison de te méfier, les vendeurs de rêve ne manquent pas.\n\nAlors voilà les 5 questions qu'on me pose le plus sur l'Atelier du Quiz.\n\n**1. C'est un abonnement ?**\nNon. 47 €, une seule fois, accès à vie, mises à jour comprises.\n\n**2. Il faut payer un outil en plus ?**\nNon pour démarrer. Tu commences avec la version gratuite, tu passeras au payant le jour où ton quiz te ramène déjà des contacts. Même logique pour Systeme.io.\n\n**3. C'est comme les autres formations ?**\nNon. Tu ne regardes pas des vidéos qui expliquent comment faire. Tu fais ton quiz. Chaque jour, une action, un livrable.\n\n**4. Et si je bloque ?**\nUn coach IA connecté aux vraies données de ton quiz, disponible jour et nuit. Une communauté. Et Béné qui répond en personne.\n\n**5. Et si ça ne marche pas ?**\nGarantie 30 jours. Aucun contact capté en appliquant la méthode, remboursé sans discussion.\n\nIl te reste une question ? Pose-la en commentaire, je réponds à tout.\n\nLien en commentaire ↓\n\n#faq #solopreneur #leadgeneration #systemeio #quiz"
  },
  {
    "n": 6,
    "title": "Pourquoi je te parle d'elle",
    "kind": "carousel",
    "caption": "Je te recommande peu de choses. Alors quand je le fais, je te dis pourquoi.\n\nBéné a été infirmière avant de créer son entreprise. Et ce métier lui a laissé un réflexe qu'elle utilise encore aujourd'hui.\n\nEn soin, on t'apprend une chose : on ne traite pas le symptôme, on cherche la vraie cause.\n\nDepuis des mois, elle voit des gens créer leur quiz. Fiers de l'avoir fait, soulagés. Et après, plus rien. Le quiz reste là, presque personne dessus, des emails capturés que personne n'exploite.\n\nToujours la même phrase dans sa boîte : « J'ai fait mon quiz, je fais quoi maintenant ? »\n\nAu début elle répondait un par un, longuement, des heures. Parce que ça la rend dingue, l'idée que quelqu'un fasse l'effort, y croie, et abandonne juste parce que personne ne lui a montré la suite.\n\nLe problème, ce n'est presque jamais le quiz. C'est le vide autour : pas de trafic, pas d'automatisation, pas de plan.\n\nAlors elle a arrêté de répondre à l'infini et elle a construit l'Atelier du Quiz.\n\nCe n'est pas une formation de plus à laisser moisir. C'est la réponse qu'elle aurait voulu donner à chaque personne restée coincée.\n\nVoilà pourquoi je t'en parle.\n\nLien en commentaire ↓\n\n#entrepreneuriat #solopreneur #leadgeneration #systemeio #quiz"
  },
  {
    "n": 7,
    "title": "Ton PDF gratuit dort",
    "kind": "image",
    "caption": "Ton PDF gratuit a arrêté de t'amener des clients, et tu crois que le problème c'est ta niche.\n\nCe n'est pas ça.\n\nPDF, checklist, mini-formation offerte : tu as sûrement testé. Quelques téléchargements, puis plus rien. Les emails captés dorment dans ta liste.\n\nLe problème n'est ni ta niche ni ton marketing.\n\nC'est que ces contenus sont passifs. On les télécharge, on ferme le document, on l'oublie. Et toi, tu n'apprends strictement rien sur la personne qui vient de le prendre.\n\nUn quiz, c'est l'inverse. La personne participe, elle répond, elle se dévoile.\n\nÀ la fin, tu ne récupères pas juste un email.\n\nTu récupères un email, un profil, et un besoin précis. Que tu peux taguer et relancer dans ton Systeme.io, automatiquement.\n\nVoilà pourquoi un quiz qualifie tellement mieux qu'un PDF. Dans toutes les niches, y compris la tienne.\n\nDans l'Atelier du Quiz, celui de ma partenaire Béné, on transforme ton contenu gratuit qui dort en quiz qui trie et qui vend.\n\nLien en commentaire ↓\n\n#leadmagnet #leadgeneration #systemeio #solopreneur #quiz"
  },
  {
    "n": 8,
    "title": "Ni facile ni rapide",
    "kind": "carousel",
    "caption": "Je vais faire un truc stupide pour quelqu'un qui recommande un produit.\n\nJe vais te dire que ce ne sera ni facile ni rapide.\n\nTu ne vas pas cliquer 5 minutes, filer devant une série et enchaîner les ventes.\n\nIl faut créer un quiz assez bon pour qu'on aille jusqu'au bout. Le diffuser pour amener du monde dessus. Le connecter à ton autorépondeur pour que chaque réponse serve à quelque chose.\n\nEn gros : une petite heure par jour, pendant 7 jours.\n\nSi tu cherches une option « devenir riche sans rien faire », continue à scroller, sincèrement.\n\nEn revanche.\n\nSi tu acceptes de mettre une heure par jour pendant une semaine, voilà ce que ça installe chez toi :\n\n→ Un quiz publié et connecté dès le 4ᵉ jour\n→ Des contacts qui rentrent et se trient tout seuls\n→ Un plan clair, dans l'ordre, sans jamais douter de ta prochaine étape\n\nCe n'est pas facile au sens « sans rien faire ».\n\nC'est simple au sens « tu sais exactement quoi faire, et quelqu'un te débloque quand tu cales ».\n\nLa nuance change tout.\n\nUne participante a mis une heure et demie à créer son quiz. 285 personnes ont laissé leur email dans les 9 jours qui ont suivi. Elle a travaillé, oui. Mais dans le bon ordre.\n\nLien en commentaire ↓\n\n#entrepreneuriat #discipline #leadgeneration #solopreneur #quiz"
  },
  {
    "n": 9,
    "title": "« C'est gratuit sur YouTube »",
    "kind": "image",
    "caption": "« C'est gratuit sur YouTube. »\n\nOui. C'est vrai. Et c'est exactement là que ça coince.\n\nLa question m'a été posée cette semaine, et elle est légitime : pourquoi payer un atelier quand tout se trouve déjà en ligne ?\n\nCréer un quiz, amener du trafic, taguer un contact, monter une séquence d'emails : tout est quelque part.\n\nLe souci, c'est que c'est en morceaux, éparpillé dans des centaines de vidéos qui ne se parlent pas entre elles.\n\nLe problème n'a jamais été de trouver l'information. C'est le temps que tu vas y passer.\n\nTrier les vidéos. Les regarder. Adapter tout ça à ton activité à toi. Assembler des méthodes qui ne vont pas ensemble. Tester. Te tromper. Recommencer.\n\nEt rester bloqué, sans personne pour te dire où est l'erreur.\n\nC'est arrivé à quelqu'un que je connais : des jours à chercher un bug dans son quiz, alors qu'il lui manquait simplement du monde dessus.\n\nL'Atelier du Quiz, c'est le même savoir. Béné ne réinvente pas la route.\n\nSauf qu'il est rangé dans l'ordre, adapté à ton domaine, et que tu n'y es jamais seul.\n\nElle a passé des mois à le penser, à le coder et à tourner les vidéos.\n\nToi, il te faut 47 € et 7 jours pour tout lui prendre.\n\nÀ toi de voir ce que vaut ton temps.\n\nLien en commentaire ↓\n\n#leadgeneration #systemeio #solopreneur #productivite"
  },
  {
    "n": 10,
    "title": "Dans 30 jours",
    "kind": "carousel",
    "caption": "Dans 30 jours, un matin, tu ouvres ton téléphone.\n\nEt tu vois que des gens ont rempli ton quiz pendant la nuit.\n\nPas des curieux. Des gens qui savent déjà ce que tu fais, et qui viennent de te dire ce dont ils ont besoin.\n\nTu n'as rien fait de spécial la veille. Ton quiz a tourné tout seul.\n\nTa liste grossit chaque semaine, sans que tu postes tous les jours en priant pour trois likes.\n\nEt quand tu lances une offre, tu ne pars plus de zéro. Il y a déjà des gens chauds, triés, qui n'attendent que ça.\n\nCe n'est pas un rêve lointain. C'est ce qu'une participante a mis en place en 9 jours, en partant de zéro.\n\nLa seule différence entre toi et cette matinée-là : un quiz bien construit, bien connecté. Et 7 jours pour le faire.\n\nC'est tout l'objet de l'Atelier du Quiz.\n\nLien en commentaire ↓\n\n#vision #liberte #leadgeneration #systemeio #quiz"
  },
  {
    "n": 11,
    "title": "47 €",
    "kind": "image",
    "caption": "47 €.\n\nLe prix de deux menus au restaurant. Ou celui d'un système qui te ramène des contacts qualifiés tous les jours, à vie.\n\nC'est le tarif de l'Atelier du Quiz : 7 jours pour lancer un quiz qui capte en automatique, connecté à ton Systeme.io.\n\nAvec 47 €, tu arrêtes de poster dans le vide en espérant récolter trois emails.\n\nAvec 47 €, tu installes quelque chose qui travaille pour toi le soir, le week-end, pendant tes vacances.\n\nPosés là, ces 47 € ne sont pas une dépense. C'est un outil qui peut te rapporter bien plus qu'il ne coûte. Paiement unique, aucun abonnement, aucun prélèvement caché.\n\nEt si au bout de 30 jours tu n'as pas capté un seul contact en appliquant la méthode, tu es remboursé.\n\nLe vrai risque n'est pas de perdre 47 €.\n\nC'est de rester exactement là où tu es.\n\nLien en commentaire ↓\n\n#investissement #solopreneur #leadgeneration #systemeio #quiz"
  },
  {
    "n": 12,
    "title": "44,9 %",
    "kind": "carousel",
    "caption": "44,9 %.\n\nC'est la proportion de gens qui commencent un quiz de coaching ou de formation et qui laissent leur email au bout.\n\nC'est le rapport Interact qui le dit, pas moi.\n\nPresque une personne sur deux.\n\nMaintenant va regarder le taux de ta dernière page de capture, et compare.\n\nEt on continue de dire qu'un quiz, c'est sympa, mais que ça ne vend pas.\n\nUn contenu gratuit classique te donne une adresse email.\n\nUn quiz te donne une adresse email, et il te dit ce que la personne veut.\n\nElle répond. Elle arrive sur son résultat. Son résultat l'envoie sur ta page. Et parfois elle achète avant même que ta première relance soit partie.\n\nC'est ça qu'on installe dans l'Atelier du Quiz : 7 jours pour monter le tien, en ligne et connecté à ton Systeme.io dès le 4ᵉ jour.\n\n47 €, paiement unique, accès à vie. Aucun contact capté en 30 jours en appliquant la méthode ? Remboursé.\n\nLien en commentaire ↓\n\n#systemeio #quiz #leadmagnet #leadgeneration"
  },
  {
    "n": 13,
    "title": "Tu ne restes jamais bloqué",
    "kind": "image",
    "caption": "Le vrai risque quand tu achètes une formation, ce n'est pas qu'elle soit mauvaise.\n\nC'est que tu bloques au jour 3, un dimanche soir, et que personne ne réponde.\n\nAlors tu remets à demain. Puis à la semaine prochaine. Et le dossier se referme.\n\nDans l'Atelier du Quiz, il y a trois filets sous toi.\n\n**Un coach IA** connecté aux vraies données de ton quiz. Il connaît ton domaine et ton contexte. Tu bloques à 23 h un dimanche, tu demandes, tu as ta réponse, et tu avances le soir même.\n\n**Un diagnostic question par question**, qui te montre exactement laquelle réécrire quand les gens abandonnent en cours de route. Tu changes une phrase, et ils vont jusqu'au bout du parcours que tu as construit.\n\n**Une communauté**, où tu vois les quiz des autres membres pendant que tu construis le tien. Tu repères le matin ce qui marche chez eux, tu l'appliques chez toi l'après-midi.\n\nEt au-dessus de tout ça, Béné répond en personne. Un vrai humain, pas un répondeur automatique.\n\nLa question n'est pas « est-ce que le contenu est bon ». C'est « est-ce que je vais aller au bout ».\n\nLien en commentaire ↓\n\n#accompagnement #solopreneur #leadgeneration #systemeio #quiz"
  },
  {
    "n": 14,
    "title": "Ce qu'il y a dedans",
    "kind": "carousel",
    "caption": "47 €, c'est le prix des 7 jours.\n\nLe reste, tu ne l'as pas payé.\n\n**Le trafic payant sans risque.** La règle d'or : tu ne lances jamais de publicité avant que ton quiz capte déjà en gratuit. Plus l'offre à placer juste après le quiz pour que ses ventes remboursent ce que tu as dépensé.\n\n**Vendre avec ton quiz.** Comment le résultat lui-même amène à ton offre, sans que ça ressemble à de la vente. Tu arrêtes de tortiller au moment de proposer quelque chose.\n\n**Les sondages.** Écrire ton quiz et ton offre avec les mots exacts de ta cible, au lieu de les deviner à ton bureau. Trois cents réponses, et tu crées ta prochaine offre en sachant déjà qu'elle va se vendre.\n\n**Les popquiz.** Le format court qui s'ouvre au bon moment sur ton site, pour transformer les visiteurs qui allaient repartir sans rien laisser.\n\n**Les réseaux sociaux.** Le déclencheur qui donne envie à tes participants d'envoyer ton quiz à leur entourage. Ton quiz continue de tourner pendant que tu dors.\n\nEt deux outils que tu n'as pas à payer pour démarrer : le logiciel de quiz en version gratuite, et les modèles à importer en un clic dans ton Systeme.io. Séquence de bienvenue et pages de liens comprises.\n\nTu remplaces, tu publies. La partie technique que tu repousses depuis des mois est pliée avant le dîner.\n\nLien en commentaire ↓\n\n#bonus #leadgeneration #systemeio #solopreneur #quiz"
  },
  {
    "n": 15,
    "title": "Les deux chemins",
    "kind": "image",
    "caption": "Tu es à un embranchement, et les deux chemins sont valables.\n\n**Le premier.** Tu fermes ce post. Tu continues comme avant. Dans 30 jours, ton quiz est exactement au même point qu'aujourd'hui, ta liste ne te dit toujours rien de ceux qui sont dedans, et tu recommences à chercher d'où vont venir tes prochains clients. Ce chemin n'a rien de honteux. Beaucoup le prennent, et ils vivent très bien.\n\n**Le second.** Tu prends 7 jours, une heure par jour. Au 4ᵉ jour ton quiz est en ligne et capte déjà. Au 7ᵉ, le système tourne : les gens répondent, se trient tout seuls, et arrivent chez toi avec leur profil et leur besoin. Ensuite ça continue sans toi, le soir, le week-end, en vacances.\n\n47 €, paiement unique, accès à vie. Aucun contact capté en 30 jours en appliquant la méthode ? Remboursé.\n\nCe qui sépare les deux chemins, ce n'est pas le talent. C'est une décision qui prend dix secondes.\n\nLe lien est en commentaire. Il reste ouvert.\n\nQuoi que tu décides, c'est ton choix, et je le respecte.\n\n{TON_PRENOM}\n\nLien en commentaire ↓\n\n#decision #solopreneur #leadgeneration #systemeio #quiz"
  }
];

/** Parcours conseillés par Béné quand on ne veut pas tout envoyer. */
export const ATELIER_EMAIL_PLAN_7 = [1, 3, 4, 5, 12, 13, 15];
export const ATELIER_EMAIL_PLAN_3 = [1, 4, 15];
export const ATELIER_POST_PLAN_5 = [1, 4, 3, 12, 15];

/** Pack "textes des posts" (légendes) à télécharger (Word). */
export const POSTS_TEXT_DOC: DefaultAsset = {
  title: "Textes des posts (Word)",
  description: "Toutes les légendes des posts, à copier-coller et adapter.",
  url: "/affiliate-kit/posts/kit-reseaux-sociaux-affilies.docx",
  fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Remplace {LIEN} et {TON_PRENOM} par les valeurs de l'affilié. {first_name}
 *  est laissé intact (champ de fusion de l'outil d'emailing de l'affilié). */
export function fillSwipe(text: string, opts: { link: string; firstName: string | null }): string {
  const link = opts.link?.trim() || "TON_LIEN_AFFILIE";
  const prenom = (opts.firstName ?? "").trim() || "Ton prénom";
  return text.replace(/\{LIEN\}/g, link).replace(/\{TON_PRENOM\}/g, prenom);
}
