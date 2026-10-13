"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Onglets de navigation entre sous-pages (le lien actif est annoncé aux lecteurs d'écran). */
export function Onglets({ label, items }: { label: string; items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="mb-4 flex gap-1 overflow-x-auto border-b">
      {items.map((o) => {
        const actif = pathname.startsWith(o.href);
        return (
          <Link key={o.href} href={o.href} aria-current={actif ? "page" : undefined}
            className={cn("shrink-0 border-b-2 px-4 py-3 font-medium", actif ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
