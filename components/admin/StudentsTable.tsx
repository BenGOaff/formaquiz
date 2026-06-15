"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface StudentRow {
  userId: string;
  email: string;
  fullName: string | null;
  status: "active" | "revoked" | null;
  completedDays: number;
  createdAt: string;
}

export function StudentsTable({ initialRows }: { initialRows: StudentRow[] }) {
  const [rows, setRows] = useState<StudentRow[]>(initialRows);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = rows.filter(
    (r) =>
      r.email.toLowerCase().includes(query.toLowerCase()) ||
      (r.fullName ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  async function setAccess(row: StudentRow, action: "grant" | "revoke") {
    setBusyId(row.userId);
    const res = await fetch(`/api/admin/students/${row.userId}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    if (!res.ok) {
      toast.error("Action impossible.");
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.userId === row.userId ? { ...r, status: action === "grant" ? "active" : "revoked" } : r,
      ),
    );
    toast.success(action === "grant" ? "Accès accordé." : "Accès révoqué.");
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher par email ou nom"
        className="max-w-sm"
      />

      <div className="flex flex-col gap-2">
        {filtered.map((r) => (
          <Card key={r.userId}>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{r.fullName ?? r.email}</p>
                  {r.status === "active" ? (
                    <Badge variant="success">Actif</Badge>
                  ) : r.status === "revoked" ? (
                    <Badge variant="muted">Révoqué</Badge>
                  ) : (
                    <Badge variant="outline">Sans accès</Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {r.fullName ? `${r.email} · ` : ""}
                  {r.completedDays} jour{r.completedDays > 1 ? "s" : ""} complété
                  {r.completedDays > 1 ? "s" : ""}
                </p>
              </div>
              {r.status === "active" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busyId === r.userId}
                  onClick={() => setAccess(r, "revoke")}
                >
                  Révoquer
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyId === r.userId}
                  onClick={() => setAccess(r, "grant")}
                >
                  Accorder l'accès
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Aucun élève {query ? "ne correspond à ta recherche" : "pour le moment"}.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
