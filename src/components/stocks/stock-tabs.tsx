"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ONGLETS = [
  { href: "/stocks", label: "Catalogue", exact: true, gerer: false },
  { href: "/stocks/inventaire", label: "Inventaire", exact: false, gerer: false },
  { href: "/stocks/import", label: "Import / export", exact: false, gerer: true },
];

export function StockTabs({ peutGerer }: { peutGerer: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections des stocks" className="mb-4 flex gap-1 overflow-x-auto border-b">
      {ONGLETS.filter((o) => peutGerer || !o.gerer).map((o) => {
        const actif = o.exact ? pathname === o.href : pathname.startsWith(o.href);
        return (
          <Link
            key={o.href}
            href={o.href}
            aria-current={actif ? "page" : undefined}
            className={cn("shrink-0 border-b-2 px-4 py-3 font-medium", actif ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
