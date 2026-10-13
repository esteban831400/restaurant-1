import { CheckCircle2, Loader2, XCircle } from "lucide-react";

const CONFIG = {
  succes: { label: "Réussie", classe: "text-green-700 dark:text-green-300", Icone: CheckCircle2 },
  echec: { label: "Échec", classe: "text-red-700 dark:text-red-300", Icone: XCircle },
  en_cours: { label: "En cours", classe: "text-orange-700 dark:text-orange-300", Icone: Loader2 },
} as const;

/** Statut d'exécution : icône + texte, jamais la couleur seule. */
export function StatutExecution({ statut }: { statut: keyof typeof CONFIG }) {
  const { label, classe, Icone } = CONFIG[statut];
  return <span className={`inline-flex items-center gap-1.5 font-medium ${classe}`}><Icone className={`h-4 w-4 ${statut === "en_cours" ? "animate-spin" : ""}`} aria-hidden />{label}</span>;
}
