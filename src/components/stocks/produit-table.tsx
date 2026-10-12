"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type RowSelectionState } from "@tanstack/react-table";
import { toast } from "sonner";
import { Download, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NiveauBadge, PoleBadge } from "@/components/stocks/badges";
import { MouvementDialog } from "@/components/stocks/mouvement-dialog";
import { toCsv } from "@/lib/csv/csv";
import { archiverProduits, restaurerProduits } from "@/server/actions/stock";
import type { Pole, ProduitStock } from "@/types/stock";

type Props = { produits: ProduitStock[]; poles: Pole[]; peutGerer: boolean };

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR");

export function ProduitTable({ produits, poles, peutGerer }: Props) {
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [mouvement, setMouvement] = useState<{ produit: ProduitStock; type: "entree" | "sortie" } | null>(null);
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
        </div>
      ),
    },
  ], [parPole]);

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
          {peutGerer && <Button size="sm" variant="destructive" onClick={archiver}><Trash2 className="h-4 w-4" />Archiver</Button>}
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border">
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
