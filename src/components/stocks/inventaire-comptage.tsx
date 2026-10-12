"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { enregistrerComptage } from "@/server/actions/stock";

type Produit = { id: string; nom: string; unite: string; categorie: string | null };
type Props = { inventaireId: string; produits: Produit[]; initial: Record<string, number> };

/** Comptage pensé pour le téléphone : une grosse ligne par produit, saisie numérique. */
export function InventaireComptage({ inventaireId, produits, initial }: Props) {
  const router = useRouter();
  const [valeurs, setValeurs] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, String(v)])));
  const [filtre, setFiltre] = useState("");
  const [pending, start] = useTransition();
  const visibles = useMemo(() => produits.filter((p) => p.nom.toLowerCase().includes(filtre.toLowerCase())), [produits, filtre]);
  const comptes = Object.entries(valeurs).filter(([, v]) => v.trim() !== "");

  function enregistrer(terminer: boolean) {
    const payload = comptes.map(([produit_id, v]) => ({ produit_id, qte_comptee: Number(v.replace(",", ".")) }));
    if (payload.some((c) => Number.isNaN(c.qte_comptee) || c.qte_comptee < 0)) {
      toast.error("Une quantité saisie est invalide.");
      return;
    }
    start(async () => {
      const r = await enregistrerComptage(inventaireId, payload, terminer);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success(terminer ? "Comptage envoyé pour validation" : "Comptage enregistré");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 pb-28">
      <div>
        <label htmlFor="filtre" className="mb-1 block text-sm font-medium">Chercher un produit</label>
        <Input id="filtre" value={filtre} onChange={(e) => setFiltre(e.target.value)} />
      </div>
      <ul className="divide-y rounded-lg border">
        {visibles.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <label htmlFor={`c-${p.id}`} className="min-w-0 flex-1">
              <span className="block truncate font-medium">{p.nom}</span>
              <span className="text-xs text-muted-foreground">{p.categorie ?? "—"}</span>
            </label>
            <Input id={`c-${p.id}`} className="w-28 text-right text-lg" type="text" inputMode="decimal" placeholder={p.unite}
              value={valeurs[p.id] ?? ""} onChange={(e) => setValeurs((v) => ({ ...v, [p.id]: e.target.value }))} />
          </li>
        ))}
      </ul>
      <div className="fixed inset-x-0 bottom-0 flex gap-3 border-t bg-card p-3">
        <Button variant="outline" className="flex-1" disabled={pending} onClick={() => enregistrer(false)}>Enregistrer</Button>
        <Button className="flex-1" disabled={pending || comptes.length === 0} onClick={() => enregistrer(true)}>Terminer ({comptes.length})</Button>
      </div>
    </div>
  );
}
