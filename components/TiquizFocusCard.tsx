"use client";

// components/TiquizFocusCard.tsx
// Carte "Quiz suivi" de la page d'accueil (Gwenn 19 juil 2026). L'Atelier
// étudie UN seul quiz à la fois. Par défaut, le quiz le plus récent (celui
// que l'user vient de créer) ; il peut en choisir un autre, mémorisé jusqu'à
// ce qu'il le change. Sélection limitée aux QUIZ (profil), pas les sondages
// ni popquiz, pour éviter les erreurs. États guidés : pas connecté -> bouton
// connexion ; connecté sans quiz -> bouton création.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Target, ExternalLink, Loader2, Plus, Link2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type QuizRef = { id: string; title: string; project_id: string | null; mode: string | null };
type ProjectRef = { id: string; name: string; is_default: boolean };

export function TiquizFocusCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  // "tiquiz" ou "tipote" : ou vit le compte quiz de l'eleve (pont).
  // Adapte les libelles et les liens sortants (retour Maurice 29/07 :
  // un eleve Tipote etait envoye sur le login Tiquiz, impasse totale).
  const [provider, setProvider] = useState<string>("tiquiz");
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRef[]>([]);
  const [scope, setScope] = useState("");
  const [busy, setBusy] = useState(false);
  // L'ADRESSE DU COMPTE RELIÉ (drame Jocelyne, 4 août 2026).
  //
  // Elle a passé six semaines à lire "tu n'as pas encore de quiz" alors
  // qu'elle en avait trois en ligne, avec 2002 vues. Son Atelier était
  // relié à un compte Tiquiz créé sous son AUTRE adresse, et vide.
  //
  // L'API renvoyait déjà cette adresse. C'est l'écran qui ne l'affichait
  // nulle part : rien, à aucun moment, ne lui permettait de voir qu'on
  // regardait le mauvais compte. Elle a même refait la manip de
  // reconnexion sans pouvoir constater qu'elle retombait au même endroit.
  const [account, setAccount] = useState("");
  // Distingue "impossible de charger la liste" (API Tiquiz KO / pas déployée)
  // de "vraiment aucun quiz" : sinon on afficherait "crée ton premier quiz"
  // à quelqu'un qui en a plein (drame Gwenn 19 juil 2026).
  const [loadError, setLoadError] = useState(false);
  const initRan = useRef(false);

  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/me/tiquiz-quizzes");
      const data = await res.json().catch(() => ({}));
      if (!data?.ok) {
        setLoadError(true);
        return;
      }
      setConnected(Boolean(data.connected));
      setAccount(typeof data.email === "string" ? data.email : "");
      if (data.provider === "tipote" || data.provider === "tiquiz") setProvider(data.provider);
      if (data.error) {
        // Connecté mais la liste n'a pas pu être récupérée : NE PAS conclure
        // "aucun quiz". On propose de réessayer.
        setLoadError(true);
        return;
      }
      setProjects((data.projects ?? []) as ProjectRef[]);
      // Tous les quiz SAUF les sondages (les popquiz ne sont pas un `mode`).
      const qs = ((data.quizzes ?? []) as QuizRef[]).filter((q) => q.mode !== "survey");
      setQuizzes(qs);
      const stored = String(data.selectedScope ?? "");
      const storedId = stored.startsWith("quiz:") ? stored.slice(5) : "";
      const valid = qs.some((q) => q.id === storedId);
      if (valid) {
        setScope(stored);
      } else if (qs.length > 0 && !initRan.current) {
        // Défaut = quiz le plus récent (liste triée created_at desc côté
        // Tiquiz). Persisté une fois, silencieusement (la synchro des stats
        // se fait sur la page Avancées).
        initRan.current = true;
        const def = `quiz:${qs[0].id}`;
        setScope(def);
        void fetch("/api/me/tiquiz-selection", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: def }),
        });
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeQuiz(next: string) {
    if (!next || next === scope) return;
    setScope(next);
    setBusy(true);
    try {
      await fetch("/api/me/tiquiz-selection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: next }),
      });
      // Recalcule les stats sur le nouveau quiz + prévient le Quiz Doctor.
      await fetch("/api/integrations/tiquiz/sync", { method: "POST" });
      window.dispatchEvent(new Event("tiquiz-scope-changed"));
      router.refresh();
      toast.success("Quiz suivi mis à jour.");
    } catch {
      toast.error("Impossible d'appliquer la sélection.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Relier un AUTRE compte : on coupe la connexion actuelle (ce qui pose
   * l'opt-out, donc la liaison automatique ne reprendra pas la main sur
   * l'ancienne adresse), puis on relance le consentement.
   *
   * Navigation DURE et pas `router.push` : la route de démarrage pose un
   * cookie anti-CSRF et redirige vers un AUTRE domaine.
   */
  async function switchAccount() {
    setBusy(true);
    try {
      const res = await fetch("/api/integrations/tiquiz/disconnect", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      // Un refus doit produire quelque chose à l'écran : un échec
      // silencieux envoie chercher au mauvais endroit.
      if (!data?.ok) {
        toast.error("Impossible de délier le compte pour le moment. Réessaie dans un instant.");
        setBusy(false);
        return;
      }
      window.location.href = `/api/integrations/tiquiz/start${
        provider === "tipote" ? "?provider=tipote" : ""
      }`;
    } catch {
      toast.error("Impossible de délier le compte pour le moment. Réessaie dans un instant.");
      setBusy(false);
    }
  }

  const providerName = provider === "tipote" ? "Tipote" : "Tiquiz";

  const Header = (
    <span className="flex items-center gap-2 font-medium">
      <Target className="size-4 text-primary" />
      Quiz suivi
    </span>
  );

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col gap-3 py-5">
          {Header}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Chargement...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Liste indisponible (API Tiquiz KO / pas encore déployée) : on NE dit PAS
  // "aucun quiz". On propose de réessayer.
  if (loadError) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col gap-3 py-5">
          {Header}
          <p className="text-sm text-muted-foreground">
            Impossible de récupérer tes quiz Tiquiz pour le moment. Réessaie dans un instant.
          </p>
          <Button size="sm" variant="outline" onClick={() => load()} className="mt-auto w-fit">
            <RefreshCw />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Pas connecté : inviter à connecter (1 clic).
  if (!connected) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col gap-3 py-5">
          {Header}
          <p className="text-sm text-muted-foreground">
            Connecte ton compte Tiquiz pour suivre ici le quiz que tu construis dans l'Atelier.
            En lecture seule, 1 clic.
          </p>
          <Button asChild size="sm" className="mt-auto w-fit">
            <a href="/api/integrations/tiquiz/start">
              <Link2 />
              Connecter mon compte Tiquiz
            </a>
          </Button>
          <a
            href="/api/integrations/tiquiz/start?provider=tipote"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Ton quiz est sur Tipote ? Connecte ton compte Tipote
          </a>
        </CardContent>
      </Card>
    );
  }

  // Connecté mais aucun quiz. DEUX SITUATIONS TRÈS DIFFÉRENTES, et on ne
  // peut pas les distinguer depuis ici : une débutante qui n'a vraiment
  // rien créé, et quelqu'un qui a plusieurs adresses email et qu'on a
  // reliée à la mauvaise (drame Jocelyne, 4 août 2026).
  //
  // On nomme donc les deux, et on affiche l'adresse reliée : c'est la
  // seule information qui permet de trancher, et elle était disponible
  // depuis le début sans jamais être montrée.
  if (quizzes.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col gap-3 py-5">
          {Header}
          {account && (
            <div className="flex flex-col gap-0.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Compte {providerName} relié
              </span>
              <strong className="break-all text-sm">{account}</strong>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Ce compte ne contient aucun quiz. Soit c'est le moment d'en créer un, soit tes quiz
            vivent sur un autre compte {providerName}, sous une autre adresse email.
          </p>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href="/api/integrations/tiquiz/go?to=create" target="_blank" rel="noopener noreferrer">
                <Plus />
                Créer mon premier quiz
              </a>
            </Button>
            <Button size="sm" variant="outline" onClick={switchAccount} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Link2 />}
              Changer de compte
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Avant de changer de compte, connecte-toi à {providerName} avec la bonne adresse dans
            cet onglet. L'écran d'autorisation te redemandera confirmation.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedId = scope.startsWith("quiz:") ? scope.slice(5) : "";

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 py-5">
        {Header}
        <p className="text-sm text-muted-foreground">
          L'Atelier analyse un quiz à la fois. Choisis sur quel quiz tu veux bosser, c'est gardé en
          mémoire jusqu'à ce que tu en changes.
        </p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tiquiz-quiz" className="text-xs text-muted-foreground">
            Choisis ton quiz
          </label>
          <select
            id="tiquiz-quiz"
            value={selectedId}
            onChange={(e) => {
              // "Demarrer un nouveau quiz" : ouvre l'outil quiz de l'eleve
              // (Tiquiz ou Tipote via la redirection intelligente) SANS
              // toucher a la selection courante (demande Bene 29/07).
              if (e.target.value === "__new__") {
                e.target.value = selectedId;
                window.open("/api/integrations/tiquiz/go?to=create", "_blank", "noopener");
                return;
              }
              changeQuiz(`quiz:${e.target.value}`);
            }}
            disabled={busy}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {projects.map((p) => {
              const projQuizzes = quizzes.filter((q) => q.project_id === p.id);
              if (projQuizzes.length === 0) return null;
              return (
                <optgroup key={p.id} label={p.name}>
                  {projQuizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
                </optgroup>
              );
            })}
            {quizzes.filter((q) => !q.project_id).length > 0 && (
              <optgroup label="Sans projet">
                {quizzes
                  .filter((q) => !q.project_id)
                  .map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
              </optgroup>
            )}
            <option value="__new__">+ Démarrer un nouveau quiz</option>
          </select>
        </div>
        {/* L'adresse du compte lu, même quand tout va bien. Jocelyne n'a
            jamais eu ce repère : elle ne pouvait pas soupçonner qu'on
            regardait ailleurs. Discret ici (rien ne cloche), mis en avant
            dans la branche "aucun quiz" (là, ça peut clocher). */}
        {account && (
          <p className="text-xs text-muted-foreground">
            Compte {providerName} lu : <span className="break-all">{account}</span>
          </p>
        )}
        <Button asChild variant="ghost" size="sm" className="mt-auto w-fit">
          <a href="/avancees">
            <ExternalLink />
            Voir mes résultats et le Quiz Doctor
          </a>
        </Button>
        {/* Bascule manuelle Tiquiz <-> Tipote : le flux de consentement
            remplace la connexion existante (retour Maurice 29/07). */}
        <a
          href={provider === "tipote" ? "/api/integrations/tiquiz/start" : "/api/integrations/tiquiz/start?provider=tipote"}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {provider === "tipote"
            ? "Ton quiz est plutôt sur Tiquiz ? Basculer"
            : "Ton quiz est plutôt sur Tipote ? Basculer"}
        </a>
      </CardContent>
    </Card>
  );
}
