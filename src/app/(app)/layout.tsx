export const dynamic = "force-dynamic";

import { Marque } from "@/components/layout/marque";
import { AjoutBureau, AjoutMobile, BoutonRecherche } from "@/components/ajout-rapide/ajout-menu";
import { OutilsProvider } from "@/components/ajout-rapide/contexte";
import { LogoutButton } from "@/components/layout/logout-button";
import { NotificationBell } from "@/components/layout/notification-bell";
import { NavLinks } from "@/components/layout/nav-links";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { navFor, ROLE_LABELS } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const items = navFor(session.role);

  return (
    <OutilsProvider utilisateur={{ id: session.id, role: session.role }}>
    <div className="min-h-screen md:grid md:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r bg-card p-4 md:flex md:flex-col md:gap-6">
        <Marque className="px-3 text-xl" />
        <NavLinks items={items} orientation="vertical" />
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-2 border-b bg-card px-4 py-2">
          <Marque className="md:hidden" />
          <div className="ml-auto flex items-center gap-2">
            <BoutonRecherche />
            <AjoutBureau />
            <div className="hidden text-right text-sm leading-tight sm:block">
              <p className="font-medium">{session.nomComplet}</p>
              <p className="text-muted-foreground">{ROLE_LABELS[session.role]}</p>
            </div>
            {session.role !== "salarie" && <NotificationBell />}
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>
        <div className="border-b bg-card p-2 md:hidden">
          <NavLinks items={items} orientation="horizontal" />
        </div>
        <main className="flex-1 p-4 pb-24 md:p-6">{children}</main>
      </div>
      <AjoutMobile />
    </div>
    </OutilsProvider>
  );
}
