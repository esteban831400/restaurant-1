"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recevoirLivraison } from "@/server/actions/commandes";

type Ligne = { produit_id: string; nom: string; unite: string; quantite: number };

/** Pointage ligne par ligne : par défaut tout est reçu, on ne corrige que les écarts. */
export function ReceptionForm({ commandeId, lignes }: { commandeId: string; lignes: Ligne[] }) {
  const router = useRouter();
  const [recu, setRecu] = useState<Record<string, string>>(() => Object.fromEntries(lignes.map((l) => [l.produit_id, String(l.quantite)])));
  const [motifs, setMotifs] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const valeur = (l: Ligne) => Number(recu[l.produit_id]?.replace(",", "."));
  const ecarts = lignes.filter((l) => valeur(l) !== l.quantite);

  function envoyer(toutRecu: boolean) {
    const payload = lignes.map((l) => ({
      produit_id: l.produit_id,
      qte_recue: toutRecu ? l.quantite : valeur(l),
      ecart_motif: toutRecu ? "" : motifs[l.produit_id] ?? "",
    }));
    if (payload.some((p) => Number.isNaN(p.qte_recue) || p.qte_recue < 0)) { toast.error("Une quantité reçue est invalide."); return; }
    start(async () => {
      const r = await recevoirLivraison({ commande_id: commandeId, lignes: payload });
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Livraison enregistrée : le stock est à jour");
      router.push(`/commandes/${commandeId}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Button size="default" className="w-full sm:w-auto" disabled={pending} onClick={() => envoyer(true)}>Tout est reçu, conforme</Button>
      <ul className="divide-y rounded-lg border">
        {lignes.map((l) => {
          const ecart = valeur(l) !== l.quantite;
          return (
            <li key={l.produit_id} className="space-y-2 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={`recu-${l.produit_id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{l.nom}</span>
                  <span className="text-xs text-muted-foreground">Commandé : {l.quantite} {l.unite}</span>
                </label>
                <Input id={`recu-${l.produit_id}`} className="w-28 text-right text-lg" type="text" inputMode="decimal" value={recu[l.produit_id]} onChange={(e) => setRecu((v) => ({ ...v, [l.produit_id]: e.target.value }))} />
              </div>
              {ecart && (
                <div>
                  <label htmlFor={`motif-${l.produit_id}`} className="mb-1 block text-sm font-medium text-orange-700 dark:text-orange-300">Écart : motif (manquant, abîmé…)</label>
                  <Input id={`motif-${l.produit_id}`} value={motifs[l.produit_id] ?? ""} onChange={(e) => setMotifs((v) => ({ ...v, [l.produit_id]: e.target.value }))} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Button variant="outline" className="w-full sm:w-auto" disabled={pending} onClick={() => envoyer(false)}>
        {pending ? "Enregistrement…" : ecarts.length ? `Enregistrer avec ${ecarts.length} écart(s)` : "Enregistrer la réception"}
      </Button>
    </div>
  );
}
