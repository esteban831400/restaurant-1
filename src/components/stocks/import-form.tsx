"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { importerProduits } from "@/server/actions/stock";
import type { Pole } from "@/types/stock";

export function ImportForm({ poles, poleParDefaut, poleFixe }: { poles: Pole[]; poleParDefaut: string; poleFixe: boolean }) {
  const [pole, setPole] = useState(poleParDefaut);
  const [fichier, setFichier] = useState<File | null>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function envoyer() {
    if (!fichier) return;
    start(async () => {
      setErreurs([]); setMessage(null);
      const r = await importerProduits(await fichier.text(), pole);
      if (r.ok) { toast.success(`${r.data.crees} produit(s) importé(s)`); setFichier(null); return; }
      setMessage(r.error); setErreurs(r.erreurs ?? []);
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      {!poleFixe && (
        <div>
          <label htmlFor="pole-import" className="mb-1 block text-sm font-medium">Importer dans le pôle</label>
          <Select id="pole-import" value={pole} onChange={(e) => setPole(e.target.value)}>
            {poles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </Select>
        </div>
      )}
      <div>
        <label htmlFor="fichier" className="mb-1 block text-sm font-medium">Fichier CSV (exporté depuis Excel, séparateur « ; »)</label>
        <Input id="fichier" type="file" accept=".csv,text/csv" className="h-auto py-2" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} />
      </div>
      <Button disabled={!fichier || pending} onClick={envoyer}>{pending ? "Import en cours…" : "Importer"}</Button>
      {message && <p role="alert" className="text-sm font-medium text-destructive">{message}</p>}
      {erreurs.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm">{erreurs.map((e) => <li key={e}>{e}</li>)}</ul>}
    </div>
  );
}
