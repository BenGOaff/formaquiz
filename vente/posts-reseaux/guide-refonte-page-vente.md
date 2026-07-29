# Refonte de la page l'Atelier du Quiz
### Design de la page -old, disposition de la page -bene

---

## 1. Ce que disent vraiment tes deux retours

Tes deux relecteurs ne critiquent pas la même chose, et c'est important de ne pas tout mélanger.

Le premier ne parle pas de goût malgré ce qu'il dit. Sa phrase clé est : « ça me renvoie vers quelque chose de non fini comme produit / logiciel, passager ». Ce n'est pas un avis esthétique, c'est un problème de crédibilité produit. Le style à cadres noirs signale « projet perso » alors que tu vends l'accès à un logiciel payant derrière. Le décalage entre la promesse et le signal visuel crée un doute au moment exact où il faut sortir la carte bleue.

Gwenn dit la même chose autrement : « ça manque de marketing et donc de réassurance pro visuellement ». Elle ajoute une information que le premier n'a pas : ce style, elle l'a utilisé pour un auteur de fiction ado, parce que c'était tiré d'une culture ado. Autrement dit, ce n'est pas un style neutre, c'est un style qui a déjà une cible et ce n'est pas la tienne. Tes acheteurs sont des coachs, des consultants, des infopreneurs. Ils achètent de la rigueur, pas du fun.

Sa deuxième remarque, en revanche, est un vrai contre-argument : « c'est important de se démarquer du style IA de base en ce moment ». Elle a raison et c'est le seul risque réel de la bascule vers le design -old. La page -old est plus rassurante mais plus banale. La troisième voie qu'elle évoque, c'est exactement ce que je te propose ci-dessous : la base est le design -old, et on garde trois signatures venues de la page -bene qui empêchent la page de ressembler à toutes les autres.

Un point de méthode : le premier relecteur a raison de dire que seul un test A/B tranchera. Mais tu fermes le lancement dimanche 2 août. Tu n'as ni le trafic ni le temps pour un test statistiquement valable. Donc on tranche sur la logique, pas sur la donnée, et on assume.

---

## 2. La règle de la bascule

Tu ne changes ni la structure HTML, ni les textes, ni l'ordre des sections. Tu changes uniquement quatre décisions visuelles. C'est tout ce qui sépare les deux pages : la typographie est déjà identique sur les deux (Bricolage Grotesque pour les titres, Inter pour le texte).

**Les quatre décisions à inverser**

La première, les ombres portées dures. La page -bene utilise des ombres décalées sans flou, du type `box-shadow: 6px 6px 0 #16182E`. C'est la signature néo-brutaliste et c'est ce qui produit à 90 % l'effet « années 80-90 » que décrit Gwenn. Elles deviennent des ombres diffuses : `box-shadow: 0 18px 50px rgba(46,56,110,.14)`.

La deuxième, les bordures noires épaisses. Partout où tu as `border: 2.28571px solid #16182E`, tu passes à `border: 1px solid #E6E8F5`. Un trait fin gris-bleu au lieu d'un contour noir. C'est ce qui fait passer un bloc de « sticker » à « interface ».

La troisième, le fond à pois. Le `radial-gradient` en pointillés du fond de page disparaît au profit d'un lavis très doux, deux halos colorés à peine perceptibles. Le fond ne doit plus être un motif, il doit être une lumière.

La quatrième, le surlignage jaune bloc. Le rectangle jaune plein derrière un mot est le marqueur le plus daté de la page. Il devient soit un lavis cyan à 26 % qui ne couvre que le bas du mot, soit un trait dégradé fin sous le mot. Les deux versions sont dans la maquette : « milliers d'emails » utilise le lavis, « quiz marketing » utilise le trait.

**Les trois signatures que tu gardes**

Sans elles la page devient générique et Gwenn aura raison sur le risque « IA de base ».

Tu gardes la ligne manuscrite en Caveat sous le titre. C'est la seule trace de ta voix dans le visuel, elle ne coûte rien en crédibilité et aucun template SaaS ne fait ça.

Tu gardes la ligne équation `Ton quiz + Coach IA + Quiz Doctor + Communauté = Quizing`. C'est ton dispositif le plus mémorable, il explique ton offre en une seconde. Elle passe simplement de blocs à contour noir à des pastilles blanches à trait fin, avec le résultat en dégradé.

Tu gardes la frise des 7 jours en colonnes. C'est le format qui rend ta promesse concrète et c'est ce qui te distingue d'une page de formation classique.

---

## 3. Tableau de correspondance, à appliquer tel quel

| Élément | Page -bene (à remplacer) | Page -old (à appliquer) |
|---|---|---|
| Ombre de bloc | `box-shadow: 6px 6px 0 #16182E` | `box-shadow: 0 18px 50px rgba(46,56,110,.14)` |
| Ombre de carte survolée | `box-shadow: 8px 8px 0 #16182E` | `box-shadow: 0 28px 70px rgba(46,56,110,.18)` |
| Bordure | `border: 2.28571px solid #16182E` | `border: 1px solid #E6E8F5` |
| Rayon d'angle | `border-radius: 0` ou `4px` | `border-radius: 12px` (cartes), `8px` (boutons) |
| Fond de page | `radial-gradient` en pointillés | deux halos `#E6F6FD` et `#E9ECFB` sur fond `#F7F8FC` |
| Bouton | aplat indigo + ombre dure + emoji | `linear-gradient(120deg,#5F6FDF,#20BBE6)` + halo cyan, sans emoji |
| Surlignage | bloc jaune plein | lavis cyan bas de mot, ou trait dégradé sous le mot |
| Titre | noir `#16182E` | inchangé, `#16182E` reste |
| Texte courant | noir | `#4A5170` |
| Texte secondaire | gris | `#6B73A0` |

Le texte courant est le point que les gens oublient. Le noir pur sur toute la page fait dense et agressif. Le gris-bleu `#4A5170` change la perception du sérieux d'un cran à lui seul.

---

## 4. Le bloc CSS à coller pour tester en dix minutes

Ton CSS personnalisé est déjà nommé proprement, avec des préfixes à toi (`aq-`, `tqpt-`, `qzvs-`, `qzeq-`) et Systeme.io utilise ses propres classes `sc-*`. Donc tu peux poser une surcouche sans rien casser.

Duplique la page -bene dans Systeme.io, ouvre la copie, et colle ce bloc dans le champ code personnalisé en tout dernier. Si le résultat ne te plaît pas tu supprimes le bloc et tu es revenue à l'état d'avant, sans avoir touché à une seule ligne existante.

```css
/* --- Surcouche "design old" sur la page bene. A coller en dernier. --- */
:root{
  --aq-navy:#16182E;
  --aq-navy2:#2E386E;
  --aq-grad:linear-gradient(120deg,#5F6FDF 0%,#20BBE6 100%);
  --aq-line:#E6E8F5;
  --aq-ink:#4A5170;
  --aq-shadow:0 18px 50px rgba(46,56,110,.14);
  --aq-shadow-sm:0 8px 24px rgba(46,56,110,.10);
}

/* 1. le fond a pois devient un lavis */
body{
  background:
    radial-gradient(1200px 600px at 15% -10%, #E6F6FD 0%, rgba(230,246,253,0) 60%),
    radial-gradient(1000px 700px at 100% 5%, #E9ECFB 0%, rgba(233,236,251,0) 55%),
    #F7F8FC !important;
  background-attachment:fixed !important;
  color:var(--aq-ink);
}

/* 2. tous les blocs encadres passent en trait fin + ombre douce */
[class*="aq-"], [class*="tqpt-"], [class*="qzvs-"], [class*="qzeq-"],
.card, .day, .hot, .seal, .old, .new, .blue{
  border:1px solid var(--aq-line) !important;
  border-radius:12px !important;
  box-shadow:var(--aq-shadow) !important;
}

/* 3. boutons : degrade + halo, plus d'ombre dure */
.cta, a.cta, button.cta, [class*="aq-"] .cta{
  background:var(--aq-grad) !important;
  border:0 !important;
  border-radius:8px !important;
  box-shadow:0 10px 26px rgba(46,56,110,.22), 0 0 14px rgba(32,187,230,.35) !important;
  transition:transform .18s ease, box-shadow .18s ease;
}
.cta:hover{transform:translateY(-2px)}

/* 4. le surlignage jaune devient un lavis cyan */
mark, .mark, .hl, .surligne{
  background:linear-gradient(180deg,rgba(32,187,230,0) 58%, rgba(32,187,230,.26) 58%) !important;
  color:var(--aq-navy) !important;
  padding:0 .06em !important;
}
```

Deux avertissements honnêtes sur ce bloc. Les sélecteurs des points 2 et 3 sont basés sur les noms de classes que j'ai relevés sur ta page ; si tu as ajouté des classes depuis, quelques blocs resteront en style ancien et il faudra ajouter leur nom à la liste. Et cette surcouche te donne 80 % du résultat en dix minutes, pas 100 % : la maquette que je t'ai envoyée est la cible finale, ce bloc est le raccourci pour voir tout de suite si la direction te convient avant d'investir une journée dessus.

---

## 5. Où placer la VSL

Réponse courte : un seul lecteur, juste sous le hero, dans sa propre section pleine largeur.

Le raisonnement. Ton titre et ta ligne d'accroche qualifient le visiteur en cinq secondes. À ce moment précis il se divise en deux. Celui qui a déjà compris et qui veut acheter descend directement, il ne regardera jamais ta vidéo, et c'est pour lui que le reste de la page existe. Celui qui hésite a besoin de t'entendre, et si tu ne lui proposes pas la vidéo tout de suite, il va scroller, se perdre dans les blocs et partir. La vidéo doit être là où le doute apparaît, c'est-à-dire immédiatement après la promesse.

Ne mets pas la vidéo dans le hero lui-même. Une vidéo dans le hero pousse le bouton d'achat sous la ligne de flottaison et tu perds les acheteurs pressés. Le hero garde le titre, la ligne manuscrite, le bouton et l'équation. La vidéo prend la section suivante.

Ne mets pas un second lecteur en bas de page. Deux lecteurs sur la même page divisent le taux de lecture, alourdissent le chargement et rendent tes statistiques illisibles. À la place, juste avant la section prix, une ligne simple : « Tu préfères que je te l'explique en vidéo ? » avec un lien d'ancre qui remonte vers le lecteur du haut. Coût zéro, même effet.

Le titre au-dessus du lecteur compte autant que la vidéo. Pas « Regarde la vidéo » mais une promesse avec une durée annoncée, du type « 8 minutes pour voir exactement ce que tu vas faire pendant 7 jours ». Annoncer la durée augmente le taux de lancement, parce que le visiteur sait ce qu'il engage.

Un bouton d'achat sous le lecteur, obligatoire. Quelqu'un qui vient de regarder huit minutes est au sommet de son intention. Ne le fais pas scroller pour trouver comment payer.

### Le code d'intégration

N'utilise pas l'iframe brute de YouTube. Elle charge environ un mégaoctet de scripts avant même que le visiteur clique, ce qui écroule ton temps de chargement, et ton temps de chargement est un facteur direct de conversion. Utilise une vignette cliquable qui ne charge le vrai lecteur qu'au clic.

```html
<div class="aq-vsl-shell">
  <div class="aq-vsl" id="aqVsl">
    <img src="https://i.ytimg.com/vi/CstBwRbAm4M/maxresdefault.jpg"
         alt="Découvre l'Atelier du Quiz en vidéo" loading="lazy">
    <span class="aq-play" aria-hidden="true"></span>
    <span class="aq-dur">8:37</span>
  </div>
</div>
<script>
document.getElementById('aqVsl').addEventListener('click', function(){
  this.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/CstBwRbAm4M?autoplay=1&rel=0&modestbranding=1" '
    + 'title="l\'Atelier du Quiz" frameborder="0" '
    + 'allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" '
    + 'allowfullscreen style="width:100%;height:100%;border:0"></iframe>';
}, {once:true});
</script>
```

```css
.aq-vsl-shell{background:#fff;border:1px solid #E6E8F5;border-radius:18px;
  padding:14px;box-shadow:0 28px 70px rgba(46,56,110,.18);max-width:880px;margin:0 auto}
.aq-vsl{position:relative;aspect-ratio:16/9;border-radius:12px;overflow:hidden;
  background:#0F1120;display:grid;place-items:center;cursor:pointer}
.aq-vsl img{width:100%;height:100%;object-fit:cover;opacity:.9}
.aq-play{position:absolute;width:82px;height:82px;border-radius:50%;
  background:rgba(255,255,255,.95);display:grid;place-items:center;
  box-shadow:0 14px 40px rgba(0,0,0,.35);transition:transform .2s ease}
.aq-vsl:hover .aq-play{transform:scale(1.07)}
.aq-play::after{content:"";border-left:22px solid #2E386E;
  border-top:14px solid transparent;border-bottom:14px solid transparent;margin-left:6px}
.aq-dur{position:absolute;right:14px;bottom:14px;background:rgba(16,18,32,.82);
  color:#fff;font-size:13px;font-weight:600;padding:5px 10px;border-radius:6px}
```

`youtube-nocookie` évite de poser des cookies tant que le visiteur n'a pas cliqué, ce qui simplifie ta conformité. `rel=0` limite les vidéos suggérées à la fin à ta seule chaîne, pour ne pas envoyer ton prospect chez un concurrent à la seconde 517.

---

## 6. L'ordre des sections

C'est la disposition de la page -bene, avec la vidéo insérée et une section ajoutée.

Le hero d'abord : pastille, titre, ligne d'accroche, ligne manuscrite, bouton, mention prix et garantie sous le bouton, puis la ligne équation.

La VSL ensuite, dans sa propre section, avec un bouton dessous.

Le comparatif « Une formation de plus ? Surtout pas. » vient après, parce que la première objection après la vidéo est toujours « j'en ai déjà acheté dix ».

Puis les trois cartes du dispositif, Coach IA, Quiz Doctor, Communauté. C'est là que tu réponds à « je vais rester seul devant mon écran ».

Puis la frise des 7 jours, qui rend la promesse concrète.

**Puis les témoignages. Cette section n'existe pas sur ta page et c'est le manque le plus coûteux.** Tu as quatre témoignages vérifiés que tu utilises déjà dans la VSL, et ils ne sont nulle part sur la page de vente. Quelqu'un qui ne regarde pas la vidéo n'a aucune preuve sociale, à aucun moment, avant de voir le prix. C'est la correction qui a le plus de chances de bouger ton taux de conversion, davantage que toute la refonte visuelle. Place-la juste avant le prix : on lit une preuve, puis on voit le tarif.

Puis l'offre et le prix, avec la liste de ce qui est inclus et le sceau de garantie.

Puis le rappel vidéo en lien d'ancre.

Puis la FAQ, qui traite les dernières objections.

Puis un dernier bloc bouton, avec l'échéance de fermeture.

---

## 7. Trois corrections urgentes sur la page actuelle

Elles sont indépendantes de la refonte et elles te coûtent des ventes en ce moment même.

Le compteur de rareté affiche « Il reste 20/20 places ». Vingt sur vingt, c'est-à-dire cent pour cent des places encore libres. Tu voulais créer de l'urgence, tu as créé le signal inverse : personne n'a acheté. Soit tu affiches le vrai nombre restant s'il a baissé, soit tu retires le compteur et tu gardes uniquement la date de fermeture, dimanche 2 août. Une échéance de date fonctionne toujours, un compteur figé décrédibilise toute la page.

Il y a une faute dans « C'est moi qui prends tous les riques, pas toi ». Il manque le s de risques. C'est dans le bloc garantie, donc à l'endroit exact où tu demandes au visiteur de te faire confiance.

Il n'y a aucun témoignage sur la page, voir le point précédent.

---

## 8. Ce que je te déconseille

Ne repars pas de la page -old telle quelle. Elle est plus rassurante mais sa disposition est plus faible : ton comparatif, ta frise en 7 jours et ta ligne équation sont les trois blocs qui vendent réellement, et ils viennent de la page -bene. Ton premier relecteur a formulé exactement la bonne conclusion, garde-la.

Ne cherche pas à tout refaire avant dimanche. Si tu ne devais faire que trois choses dans l'ordre : ajouter les témoignages, corriger le compteur 20/20, coller la surcouche CSS. La refonte fine peut attendre le lancement suivant.
