import { Badge } from "@/components/ui/badge";
import { STATUT_LABELS, type StatutCommande } from "@/lib/commandes/statuts";

const STYLES: Record<StatutCommande, string> = {
  brouillon: "border-slate-400 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
  a_valider: "border-orange-500 bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  envoyee: "border-sky-600 bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  confirmee: "border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
  livree: "border-green-600 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
  cloturee: "border-green-800 bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100",
  annulee: "border-slate-400 bg-transparent text-muted-foreground line-through",
  en_retard: "border-red-600 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
};

export function StatutBadge({ statut }: { statut: StatutCommande }) {
  return <Badge className={STYLES[statut]}>{STATUT_LABELS[statut]}</Badge>;
}
