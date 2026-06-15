"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Film } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
 * Champ vidéo d'un jour. Deux voies :
 *  1. Coller une URL (YouTube, lien direct, ou URL de lecture HLS du
 *     pipeline). Fonctionne tout de suite, c'est le champ enregistré.
 *  2. Uploader un fichier vers le pipeline auto-hébergé (serveur tus du
 *     VPS, namespace formaquiz). Disponible une fois le pipeline branché
 *     (cf. SETUP.md). Le fichier est transcodé en HLS côté serveur.
 */
export function VideoField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function handleFile(file: File) {
    // 1. Demande un token d'upload.
    const tokenRes = await fetch("/api/admin/video/upload-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name }),
    });
    if (tokenRes.status === 503) {
      toast.error("Le pipeline vidéo n'est pas encore branché. Colle une URL pour le moment (voir SETUP).");
      return;
    }
    const token = await tokenRes.json();
    if (!tokenRes.ok) {
      toast.error(token.reason === "bad_ext" ? "Format vidéo non accepté." : "Upload impossible.");
      return;
    }

    // 2. Upload résumable via tus.
    const { Upload: TusUpload } = await import("tus-js-client");
    setProgress(0);
    const upload = new TusUpload(file, {
      endpoint: token.endpoint,
      retryDelays: [0, 1000, 3000, 5000],
      metadata: {
        filename: file.name,
        filetype: file.type,
        videoId: token.videoId,
      },
      headers: { Authorization: `Bearer ${token.token}` },
      onError: () => {
        setProgress(null);
        toast.error("L'upload a échoué. Réessaie.");
      },
      onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
      onSuccess: () => {
        setProgress(null);
        toast.success("Vidéo envoyée. Le serveur la transcode, elle sera prête dans quelques minutes.");
      },
    });
    upload.start();
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="video_url">Vidéo du jour</Label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Film className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="video_url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Colle une URL YouTube ou un lien vidéo"
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={progress !== null}
        >
          <Upload />
          {progress !== null ? `${progress}%` : "Uploader"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
