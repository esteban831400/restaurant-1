"use client";

import { cn } from "@/lib/utils";

type Props = { checked: boolean; onCheckedChange: (v: boolean) => void; label: string; disabled?: boolean };

/** Interrupteur accessible (role="switch"), avec libellé « Activée / Désactivée » visible. */
export function Switch({ checked, onCheckedChange, label, disabled }: Props) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onCheckedChange(!checked)}
      className={cn("inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50", checked ? "bg-primary" : "bg-muted-foreground/40")}>
      <span className={cn("block h-6 w-6 rounded-full bg-white shadow transition-transform", checked ? "translate-x-6" : "translate-x-0.5")} />
    </button>
  );
}
