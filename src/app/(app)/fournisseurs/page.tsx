import Link from "next/link";
import { Plus } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { listFournisseurs, PAGE_SIZE } from "@/server/queries/commandes";

const MODES = { mail: "E-mail", telephone: "Téléphone", portail: "Portail" } as const;

export default async function PageFournisseurs({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const { fournisseurs, total, page } = await listFournisseurs({ q: searchParams.q, page: Number(searchParams.page) || 1 });
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Fournisseurs</h1>
        <ButtonLink href="/fournisseurs/nouveau"><Plus className="h-5 w-5" />Nouveau fournisseur</ButtonLink>
      </div>
      <form role="search" className="mb-4 flex gap-3">
        <div className="flex-1">
          <label htmlFor="q" className="mb-1 block text-sm font-medium">Rechercher</label>
          <Input id="q" name="q" defaultValue={searchParams.q} placeholder="Nom ou contact" data-search />
        </div>
        <Button type="submit" className="self-end">Filtrer</Button>
      </form>
      {fournisseurs.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Aucun fournisseur trouvé.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {fournisseurs.map((f) => (
            <li key={f.id}>
              <Link href={`/fournisseurs/${f.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 hover:bg-muted">
                <span><span className="font-medium">{f.nom}</span><span className="block text-sm text-muted-foreground">{f.contact ?? "—"} · {f.telephone ?? "—"}</span></span>
                <span className="text-sm text-muted-foreground">{MODES[f.mode_commande as keyof typeof MODES]} · délai {f.delai_jours} j</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/fournisseurs" params={{ q: searchParams.q }} />
    </>
  );
}
