import { AppHeader } from "@/components/AppHeader";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <AppHeader />
      <main className="container flex-1 py-8">{children}</main>
    </div>
  );
}
