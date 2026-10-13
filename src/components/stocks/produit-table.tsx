"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type RowSelectionState } from "@tanstack/react-table";
import { toast } from "sonner";
import { Download, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NiveauBadge, PoleBadge } from "@/components/stocks/badges";
import { MouvementDialog } from "@/components/stocks/mouvement-dialog";
import { toCsv } from "@/lib/csv/csv";
import { archiverProduits, restaurerProduits } from "@/server/actions/stock";
import { commanderProduits } from "@/server/actions/commandes";
import type { Pole, ProduitStock } from "@/types/stock";

type Props = { produits: ProduitStock[]; poles: Pole[]; peutGerer: boolean };

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR");

export function ProduitTable({ produits, poles, peutGerer }: Props) {
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [mouvement, setMouvement] = useState<{ produit: ProduitStock; type: "entree" | "sortie" } | null>(null);
  const router = useRouter();
  const [, start] = useTransition();
  const parPole = useMemo(() => new Map(poles.map((p) => [p.id, p])), [poles]);

  const columns = useMemo<ColumnDef<ProduitStock>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <input type="checkbox" className="h-5 w-5" aria-label="Tout sélectionner" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />
      ),
      cell: ({ row }) => (
        <input type="checkbox" className="h-5 w-5" aria-label={`Sélectionner ${row.original.nom}`} checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
      ),
    },
    {
      accessorKey: "nom",
      header: "Produit",
      cell: ({ row }) => (
        <div>
          <Link href={`/stocks/produits/${row.original.id}`} className="font-medium text-secondary underline-offset-2 hover:underline">{row.original.nom}</Link>
          <div className="text-xs text-muted-foreground">{row.original.categorie ?? "—"} · {row.original.lieu_stockage ?? "—"}</div>
        </div>
      ),
    },
    { id: "pole", header: "Pôle", cell: ({ row }) => <PoleBadge pole={parPole.get(row.original.pole_id)} /> },
    {
      id: "stock",
      header: "Stock",
      cell: ({ row }) => (
        <div>
          <span className="font-semibold">{fmt(row.original.stock_actuel)} {row.original.unite}</span>
          <div className="text-xs text-muted-foreground">seuil {fmt(row.original.seuil_min)}</div>
        </div>
      ),
    },
    {
      id: "alerte",
      header: "Alerte",
      cell: ({ row }) => (
        <div className="flex flex-col items-start gap-1">
          <NiveauBadge niveau={row.original.niveau} />
          {row.original.dlc_proche && row.original.prochaine_dlc && (
            <span className="text-xs font-medium text-red-700 dark:text-red-300">DLC {fmtDate(row.original.prochaine_dlc)}</span>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Mouvement",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setMouvement({ produit: row.original, type: "entree" })}><Plus className="h-4 w-4" />Entrée</Button>
          <Button size="sm" variant="outline" onClick={() => setMouvement({ produit: row.original, type: "sortie" })}><Minus className="h-4 w-4" />Sortie</Button>
          {peutGerer && row.original.niveau !== "ok" && (
            <Button size="sm" onClick={() => commander([row.original.id])}><ShoppingCart className="h-4 w-4" />Commander</Button>
          )}
        </div>
      ),
    },
  ], [parPole, peutGerer]); // eslint-disable-line react-hooks/exhaustive-deps

  const table = useReactTable({
    data: produits, columns, getCoreRowModel: getCoreRowModel(), getRowId: (r) => r.id,
    state: { rowSelection: selection }, onRowSelectionChange: setSelection,
  });
  const ids = Object.keys(selection).filter((k) => selection[k]);

  function exporter() {
    const lignes = produits.filter((p) => ids.includes(p.id));
    const csv = toCsv([
      ["nom", "categorie", "unite", "lieu_stockage", "fournisseur", "prix_achat", "seuil_min", "qte_reappro", "dlc_suivie", "stock_actuel"],
      ...lignes.map((p) => [p.nom, p.categorie, p.unite, p.lieu_stockage, p.fournisseur_nom, p.prix_achat, p.seuil_min, p.qte_reappro, p.dlc_suivie ? "oui" : "non", p.stock_actuel]),
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "selection-produits.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  function commander(cibles: string[]) {
    start(async () => {
      const r = await commanderProduits({ ids: cibles });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (r.data.sansFournisseur) toast.warning(`${r.data.sansFournisseur} produit(s) ignoré(s) : pas de fournisseur principal`);
      toast.success("Brouillon de commande prêt");
      router.push(r.data.commandes.length === 1 ? `/commandes/${r.data.commandes[0]}` : "/commandes?statut=brouillon");
    });
  }

  function archiver() {
    const cibles = [...ids];
    start(async () => {
      const r = await archiverProduits(cibles);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setSelection({});
      toast.success(`${cibles.length} produit(s) archivé(s)`, {
        action: { label: "Annuler", onClick: () => void restaurerProduits(cibles).then((x) => (x.ok ? toast.success("Produits restaurés") : toast.error(x.error))) },
        duration: 8000,
      });
    });
  }

  if (!produits.length) {
    return <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Aucun produit ne correspond à votre recherche.</p>;
  }

  return (
    <>
      {ids.length > 0 && (
        <div role="region" aria-label="Actions groupées" className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-muted p-3">
          <span className="text-sm font-medium">{ids.length} sélectionné(s)</span>
          <Button size="sm" variant="outline" onClick={exporter}><Download className="h-4 w-4" />Exporter</Button>
          {peutGerer && <Button size="sm" onClick={() => commander(ids)}><ShoppingCart className="h-4 w-4" />Commander</Button>}
          {peutGerer && <Button size="sm" variant="destructive" onClick={archiver}><Trash2 className="h-4 w-4" />Archiver</Button>}
        </div>
      )}
      <ul aria-label="Produits" className="space-y-3 md:hidden">
        {table.getRowModel().rows.map((row) => {
          const p = row.original;
          return (
            <li key={row.id} className="space-y-3 rounded-lg border bg-card p-3">
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 h-6 w-6 shrink-0" aria-label={`Sélectionner ${p.nom}`} checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
                <div className="min-w-0 flex-1">
                  <Link href={`/stocks/produits/${p.id}`} className="block truncate text-base font-medium text-secondary">{p.nom}</Link>
                  <p className="text-xs text-muted-foreground">{p.categorie ?? "—"} · {p.lieu_stockage ?? "—"}</p>
                </div>
                <p className="shrink-0 text-right text-lg font-semibold">{fmt(p.stock_actuel)} {p.unite}<span className="block text-xs font-normal text-muted-foreground">seuil {fmt(p.seuil_min)}</span></p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PoleBadge pole={parPole.get(p.pole_id)} />
                <NiveauBadge niveau={p.niveau} />
                {p.dlc_proche && p.prochaine_dlc && <span className="text-xs font-medium text-red-700 dark:text-red-300">DLC {fmtDate(p.prochaine_dlc)}</span>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setMouvement({ produit: p, type: "entree" })}><Plus className="h-5 w-5" />Entrée</Button>
                <Button variant="outline" onClick={() => setMouvement({ produit: p, type: "sortie" })}><Minus className="h-5 w-5" />Sortie</Button>
                {peutGerer && p.niveau !== "ok" && <Button className="col-span-2" onClick={() => commander([p.id])}><ShoppingCart className="h-5 w-5" />Commander</Button>}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>{hg.headers.map((h) => <th key={h.id} scope="col" className="px-3 py-3 font-semibold">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}</tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t">
                {row.getVisibleCells().map((c) => <td key={c.id} className="px-3 py-3 align-middle">{flexRender(c.column.columnDef.cell, c.getContext())}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MouvementDialog produit={mouvement?.produit ?? null} typeInitial={mouvement?.type ?? "entree"} onClose={() => setMouvement(null)} />
    </>
  );
}
