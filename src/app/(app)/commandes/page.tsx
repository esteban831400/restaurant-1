import Link from "next/link";
import { Plus } from "lucide-react";
import { StatutBadge } from "@/components/commandes/statut-badge";
import { PoleBadge } from "@/components/stocks/badges";
import { Button, ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { requireSession } from "@/lib/auth/session";
import { STATUT_LABELS, STATUTS } from "@/lib/commandes/statuts";
import { listCommandes, PAGE_SIZE } from "@/server/queries/commandes";
import { listPoles } from "@/server/queries/stock";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

export default async function PageCommandes({ searchParams }: { searchParams: { statut?: string; pole?: string; attendues?: string; page?: string } }) {
  const session = await requireSession(["gerant", "responsable"]);
  const [{ commandes, total, page, error }, poles] = await Promise.all([
    listCommandes({ statut: searchParams.statut, pole: searchParams.pole, attendues: searchParams.attendues === "1", page: Number(searchParams.page) || 1 }),
    listPoles(),
  ]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Commandes</h1>
        <ButtonLink href="/commandes/nouveau"><Plus className="h-5 w-5" />Nouvelle commande</ButtonLink>
      </div>
      <form role="search" className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="statut" className="mb-1 block text-sm font-medium">Statut</label>
          <Select id="statut" name="statut" defaultValue={searchParams.statut ?? ""}>
            <option value="">Tous les statuts</option>
            {STATUTS.map((s) => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
          </Select>
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
        <Button type="submit">Filtrer</Button>
      </form>
      {searchParams.attendues === "1" && (
        <p role="status" className="mb-3 flex flex-wrap items-center gap-3 rounded-md bg-muted p-3 text-sm">
          Livraisons attendues aujourd&apos;hui <Link href="/commandes" className="font-medium text-secondary hover:underline">Retirer le filtre</Link>
        </p>
      )}
      {error && <p role="alert" className="mb-3 text-destructive">Impossible de charger les commandes. Réessayez.</p>}
      {commandes.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Aucune commande pour ces critères.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted"><tr>{["N°", "Fournisseur", "Pôle", "Statut", "Livraison prévue", "Total"].map((h) => <th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {commandes.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-3"><Link href={`/commandes/${c.id}`} className="font-medium text-secondary hover:underline">n°{c.numero}</Link></td>
                  <td className="px-3 py-3">{c.fournisseurs?.nom ?? "—"}{c.source !== "manuelle" && <span className="ml-2 text-xs text-muted-foreground">(auto)</span>}</td>
                  <td className="px-3 py-3"><PoleBadge pole={poles.find((p) => p.id === c.pole_id)} /></td>
                  <td className="px-3 py-3"><StatutBadge statut={c.statut} /></td>
                  <td className="px-3 py-3">{date(c.date_livraison_prevue)}</td>
                  <td className="px-3 py-3">{euro.format(Number(c.total_estime))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/commandes" params={{ statut: searchParams.statut, pole: searchParams.pole, attendues: searchParams.attendues }} />
    </>
  );
}
