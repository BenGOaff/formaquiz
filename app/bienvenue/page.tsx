import { Suspense } from "react";
import { Welcome } from "./Welcome";

// Page d'atterrissage de l'invitation (lien email). Publique : l'eleve
// n'a pas encore de session quand il arrive ici, elle s'etablit cote
// client a partir des jetons du lien.
export default function BienvenuePage() {
  return (
    <Suspense fallback={null}>
      <Welcome />
    </Suspense>
  );
}
