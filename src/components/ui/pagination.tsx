import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { page: number; total: number; pageSize: number; params: Record<string, string | undefined>; basePath: string };

/** Pagination par liens (rendue côté serveur). */
export function Pagination({ page, total, pageSize, params, basePath }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && sp.set(k, v));
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };
  return (
    <div className="mt-4 flex items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">{total} résultat(s) · page {page} sur {pages}</p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button variant="outline" size="sm"><Link href={href(page - 1)}><ChevronLeft className="inline h-4 w-4" />Précédent</Link></Button>
        ) : null}
        {page < pages ? (
          <Button variant="outline" size="sm"><Link href={href(page + 1)}>Suivant<ChevronRight className="inline h-4 w-4" /></Link></Button>
        ) : null}
      </div>
    </div>
  );
}
