import { ChevronLeft, ChevronRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

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
          <ButtonLink variant="outline" size="sm" href={href(page - 1)}><ChevronLeft className="h-4 w-4" />Précédent</ButtonLink>
        ) : null}
        {page < pages ? (
          <ButtonLink variant="outline" size="sm" href={href(page + 1)}>Suivant<ChevronRight className="h-4 w-4" /></ButtonLink>
        ) : null}
      </div>
    </div>
  );
}
