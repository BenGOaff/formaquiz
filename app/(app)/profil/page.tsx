import { redirect } from "next/navigation";
import { UserCircle } from "lucide-react";
import { getViewer } from "@/lib/parcours";
import { NoAccess } from "@/components/NoAccess";
import { ProfileTabs } from "./ProfileTabs";

export const dynamic = "force-dynamic";

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.enrolled) return <NoAccess email={viewer.email} />;

  const p = viewer.profile;
  const initialTab = tab === "reglages" ? "reglages" : "profil";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold sm:text-3xl">
          <UserCircle className="size-7 text-primary" />
          Mon profil
        </h1>
        <p className="text-sm text-muted-foreground">
          Tes infos servent à personnaliser ton parcours et ton coach. Tu peux les ajuster quand tu
          veux.
        </p>
      </header>

      <ProfileTabs
        userId={viewer.userId}
        email={viewer.email}
        initialTab={initialTab}
        firstName={p?.full_name?.split(" ")[0] ?? ""}
        niche={p?.niche ?? ""}
        level={(p?.level as "debutant" | "intermediaire" | "avance" | null) ?? null}
        objective={
          (p?.objective as "capter" | "qualifier" | "segmenter" | "vendre" | null) ?? null
        }
        avatarUrl={p?.avatar_url ?? null}
      />
    </div>
  );
}
