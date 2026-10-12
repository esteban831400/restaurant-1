import { Badge } from "@/components/ui/badge";
import { NIVEAU_LABELS, type Niveau } from "@/lib/stock/alertes";
import type { Pole } from "@/types/stock";

const STYLES: Record<Niveau, string> = {
  rouge: "border-red-600 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
  orange: "border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  ok: "border-green-600 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
};

export function NiveauBadge({ niveau }: { niveau: Niveau }) {
  return <Badge className={STYLES[niveau]}>{NIVEAU_LABELS[niveau]}</Badge>;
}

export function PoleBadge({ pole }: { pole?: Pick<Pole, "nom" | "couleur"> }) {
  if (!pole) return null;
  return (
    <Badge style={{ borderColor: pole.couleur, color: pole.couleur }} className="bg-transparent">
      {pole.nom}
    </Badge>
  );
}
