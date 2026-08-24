"use client";

// components/facturation/MesFactures.tsx
//
// L'ÉLÈVE VOIT SES INFOS DE FACTURATION ET SES FACTURES.
//
// Béné, 24 août : "que je puisse mettre à jour si demande du client :
// lui aussi doit avoir ces infos et pouvoir les mettre à jour."
//
// -- CE QUE L'ÉCRAN DOIT DIRE, ET QUE PERSONNE NE DIT JAMAIS -----------
//
// Qu'une modification vaut pour les factures À VENIR. Sans cette phrase,
// quelqu'un qui corrige son adresse s'attend à voir ses anciennes
// factures changer, ne voit rien changer, et conclut que le bouton ne
// marche pas (scénario Jocelyne du 1er août : le menu affichait la
// nouvelle valeur, l'écran gardait l'ancienne).
//
// -- LES FACTURES STRIPE NE SONT PAS ICI, ET ON LE DIT ------------------
//
// Stripe émet les siennes (`invoice_creation`) et les envoie par email.
// Les recopier chez nous donnerait deux numérotations pour une seule
// comptabilité. Cette liste est celle des factures QU'ON A ÉMISES : les
// ventes PayPal, et les pièces créées à la main.
//
// L'Atelier est en français seulement : pas de next-intl ici, à la
// différence du composant jumeau de Tiquiz qui existe en 7 langues.

import { useCallback, useEffect, useState } from "react";

import ChampsFacturation, {
  ACHETEUR_FORM_VIDE,
  type ChampsAcheteur,
} from "@/components/facturation/ChampsFacturation";

interface LigneFactureVue {
  numero: string;
  genre: "facture" | "avoir";
  libelle: string;
  currency: string;
  totalCents: number;
  issuedAt: string;
}

const MOTS: Record<string, string> = {
  nom: "ton nom",
  adresse: "ton adresse",
  ville: "ton code postal et ta ville",
  pays: "ton pays",
};

export function MesFactures() {
  const [valeur, setValeur] = useState<ChampsAcheteur>(ACHETEUR_FORM_VIDE);
  const [factures, setFactures] = useState<LigneFactureVue[]>([]);
  const [manquants, setManquants] = useState<string[]>([]);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  const charger = useCallback(async () => {
    try {
      const r = await fetch("/api/compte/mes-infos");
      const j = (await r.json()) as {
        ok?: boolean;
        facturation?: ChampsAcheteur | null;
        manques?: string[];
        factures?: LigneFactureVue[];
      };
      if (j.ok) {
        setValeur(j.facturation ?? ACHETEUR_FORM_VIDE);
        setManquants(j.manques ?? []);
        setFactures(j.factures ?? []);
      }
    } catch {
      // Un écran vide vaut mieux qu'un écran qui ment : on ne remplit
      // rien plutôt que d'afficher des cases fausses.
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function enregistrer() {
    setEnvoi(true);
    setMessage(null);
    try {
      const r = await fetch("/api/compte/mes-infos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facturation: valeur }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; manques?: string[] };
      // Un `ok: false` produit TOUJOURS quelque chose à l'écran (3 août).
      if (!j.ok) {
        setMessage({ ok: false, texte: "Impossible d'enregistrer. Réessaie dans un instant." });
        return;
      }
      setManquants(j.manques ?? []);
      setMessage({ ok: true, texte: "Informations enregistrées." });
    } catch {
      setMessage({ ok: false, texte: "La connexion a coupé avant d'enregistrer." });
    } finally {
      setEnvoi(false);
    }
  }

  const argent = (cents: number, currency: string) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: (currency || "eur").toUpperCase(),
    }).format(cents / 100);

  const jour = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? "-"
      : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(d);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Informations de facturation</h2>
          <p className="text-sm text-muted-foreground">
            Ce qui apparaît sur tes factures. Complète-les si tu as besoin d&apos;une facture au
            nom de ton entreprise.
          </p>
        </div>

        {/* CE QUI MANQUE SE DIT AVANT, PAS APRÈS : une facture émise sans
            adresse n'est plus rattrapable sans avoir. */}
        {!chargement && manquants.length > 0 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Il manque {manquants.map((m) => MOTS[m] ?? m).join(", ")} pour émettre une facture
            valable.
          </p>
        )}

        {chargement ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : (
          <>
            <ChampsFacturation valeur={valeur} onChange={setValeur} montrerEmail />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void enregistrer()}
                disabled={envoi}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {envoi ? "Enregistrement..." : "Enregistrer"}
              </button>
              {/* LA PHRASE QUI ÉVITE LE MALENTENDU. */}
              <p className="text-xs text-muted-foreground">
                Vaut pour les prochaines factures. Une facture déjà émise ne se modifie pas :
                écris-nous si l&apos;une d&apos;elles doit être corrigée.
              </p>
            </div>
            {message && (
              <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-700"}`}>
                {message.texte}
              </p>
            )}
          </>
        )}
      </section>

      <section className="flex flex-col gap-2 border-t pt-5">
        <h3 className="text-base font-semibold">Mes factures</h3>
        {factures.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune facture pour le moment.</p>
        ) : (
          <ul className="divide-y text-sm">
            {factures.map((f) => (
              <li key={f.numero} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="font-mono text-xs">{f.numero}</span>
                <span className="text-muted-foreground">{jour(f.issuedAt)}</span>
                <span className="flex-1 truncate">{f.libelle}</span>
                <span className="font-semibold">{argent(f.totalCents, f.currency)}</span>
                {/* Nouvel onglet : partir lire une facture ne doit pas
                    faire perdre ce qu'on modifie au dessus. */}
                <a
                  href={`/facture/${encodeURIComponent(f.numero)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  Voir
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Les paiements par carte sont facturés par Stripe : cette facture là t&apos;a été
          envoyée par email au moment du paiement.
        </p>
      </section>
    </div>
  );
}
