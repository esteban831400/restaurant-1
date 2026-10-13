import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  titre: string;
  valeur: string | number;
  detail?: string;
  lien: string;
  alerte?: boolean;
  action?: React.ReactNode;
};

/** Carte entièrement cliquable (lien étiré) ; l'action associée reste un contrôle distinct, au-dessus du lien. */
export function CarteSynthese({ titre, valeur, detail, lien, alerte, action }: Props) {
  return (
    <div className={cn("relative flex flex-col gap-1 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring", alerte && "border-red-600/60")}>
      <Link href={lien} className="text-sm font-medium text-muted-foreground after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">{titre}</Link>
      <p className={cn("text-3xl font-semibold", alerte && "text-red-700 dark:text-red-300")}>{valeur}</p>
      {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
      {action && <div className="relative z-10 mt-2">{action}</div>}
    </div>
  );
}
