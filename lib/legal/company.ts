// lib/legal/company.ts
//
// L'IDENTITÉ DU VENDEUR, RECOPIÉE SUR CHAQUE FACTURE.
//
// **CES VALEURS DOIVENT ÊTRE IDENTIQUES DANS LES TROIS DÉPÔTS**
// (`tiquiz`, `tipote-app`, ici). C'est la même société qui vend, donc
// la même identité sur toutes les pièces. Il n'y a pas de paquet
// partagé entre les dépôts, donc c'est une recopie, donc c'est
// exactement le genre de chose qui diverge : le test
// `tests/logic/facturation.test.mts` fige les valeurs, pour qu'un
// changement soit VOULU et pas subi.
//
// Le jour où une de ces lignes change (adresse, capital, RCS), il faut
// la changer dans les trois, et le test rougira dans les deux autres.


export const COMPANY = {
  name: "ETHILIFE",
  form: "SAS",
  capital: "500 €",
  rcs: "Montpellier 909 349 045",
  vat: "FR38909349045",
  address: "377 Tertre Avenue Grassion Cibrand, 34130 Mauguio, France",
  product: "L'Atelier du Quiz",
  productMark: "L'Atelier du Quiz",
  // Consumer-facing email. Using @tiquiz.com for the US launch; the creator
  // can still reply from hello@tipote.com internally.
  email: "hello@tipote.com",
  director: "Bénédicte Lagardette",
  // ISO 8601 date that feeds every "Last updated" line.
  lastUpdated: "2026-04-22",
} as const;
