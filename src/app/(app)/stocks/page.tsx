import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { ProduitTable } from "@/components/stocks/produit-table";
import { requireSession } from "@/lib/auth/session";
import { listPoles, listProduits, PAGE_SIZE } from "@/server/queries/stock";

type Props = { searchParams: { q?: string; pole?: string; niveau?: string; page?: string } };

export default async function PageStocks({ searchParams }: Props) {
  const session = await requireSession();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [{ produits, total, error }, poles] = await Promise.all([
    listProduits({ q: searchParams.q, pole: searchParams.pole, niveau: searchParams.niveau, page }),
    listPoles(),
  ]);
  const peutGerer = session.role !== "salarie";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <form className="flex flex-1 flex-wrap items-end gap-3" role="search">
          <div className="min-w-48 flex-1">
            <label htmlFor="q" className="mb-1 block text-sm font-medium">Rechercher</label>
            <Input id="q" name="q" defaultValue={searchParams.q} placeholder="Nom ou catégorie" data-search />
          </div>
          {session.role === "gerant" && (
            <div>
              <label htmlFor="pole" className="mb-1 block text-sm font-medium">Pôle</label>
              <Select id="pole" name="pole" defaultValue={searchParams.pole ?? ""}>
                <option value="">Tous les pôles</option>
                {poles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </Select>
            </div>
          )}
          <div>
            <label htmlFor="niveau" className="mb-1 block text-sm font-medium">Alerte</label>
            <Select id="niveau" name="niveau" defaultValue={searchParams.niveau ?? ""}>
              <option value="">Tous</option>
              <option value="alerte">Sous ou proche du seuil</option>
              <option value="rouge">Sous le seuil</option>
              <option value="orange">Proche du seuil</option>
              <option value="dlc">DLC proche</option>
            </Select>
          </div>
          <Button type="submit">Filtrer</Button>
        </form>
        {peutGerer && (
          <Button>
            <Link href="/stocks/produits/nouveau"><Plus className="mr-1 inline h-5 w-5" />Nouveau produit</Link>
          </Button>
        )}
      </div>
      {error && <p role="alert" className="mb-3 text-destructive">Impossible de charger les produits. Réessayez.</p>}
      <ProduitTable produits={produits} poles={poles} peutGerer={peutGerer} />
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/stocks" params={{ q: searchParams.q, pole: searchParams.pole, niveau: searchParams.niveau }} />
    </>
  );
}
