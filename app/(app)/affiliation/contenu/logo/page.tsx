// Rayon "Logo et branding" : le kit visuel officiel + les visuels
// supplémentaires déposés par Béné via l'admin. Les deux listes
// s'affichent ensemble, dans le même quadrillage.

import { Download, Palette } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { ContentBreadcrumb } from "../../components/ContentNav";
import { getContentContext } from "../context";
import { CONTENT_ROOT, SECTION_LABEL } from "@/lib/affiliateContentSpace";
import { DEFAULT_ASSETS } from "@/lib/affiliateSwipe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const metadata = { title: "Logo et branding - Contenu affilié" };
export const dynamic = "force-dynamic";

type AdminAsset = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  file_type: string | null;
};

function isImage(fileType: string | null | undefined, url: string): boolean {
  if (fileType) return fileType.startsWith("image/");
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(url);
}

function AssetTile({
  url,
  title,
  description,
  fileType,
}: {
  url: string;
  title: string;
  description: string | null;
  fileType: string | null;
}) {
  const image = isImage(fileType, url);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-muted/40">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={title} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">Fichier</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        {description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Button asChild variant="outline" size="sm">
        <a href={url} target="_blank" rel="noopener noreferrer" download>
          <Download className="size-4" />
          Télécharger
        </a>
      </Button>
    </div>
  );
}

export default async function LogoPage() {
  await getContentContext();

  const { data } = await supabaseAdmin
    .from("affiliate_assets")
    .select("id, title, description, url, file_type")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  const adminAssets = (data ?? []) as AdminAsset[];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <ContentBreadcrumb
        trail={[
          { label: "Affiliation", href: "/affiliation" },
          { label: "Contenu", href: CONTENT_ROOT },
          { label: SECTION_LABEL.logo },
        ]}
      />

      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{SECTION_LABEL.logo}</h1>
        <p className="text-sm text-muted-foreground">
          Le kit visuel officiel de l&apos;Atelier du Quiz. Utilise-le tel quel : ne redessine pas
          le logo, ne change pas ses couleurs, ne l&apos;étire pas. Le SVG reste net à toutes les
          tailles, le PNG est fait pour les outils qui n&apos;acceptent pas le vectoriel.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-3 py-5">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Palette className="size-4 text-primary" />
            Kit officiel
          </span>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DEFAULT_ASSETS.map((a) => (
              <AssetTile
                key={a.url}
                url={a.url}
                title={a.title}
                description={a.description}
                fileType={a.fileType ?? null}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {adminAssets.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3 py-5">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Palette className="size-4 text-primary" />
              Visuels supplémentaires
            </span>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {adminAssets.map((a) => (
                <AssetTile
                  key={a.id}
                  url={a.url}
                  title={a.title}
                  description={a.description}
                  fileType={a.file_type}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
