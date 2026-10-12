"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { commanderProduits } from "@/server/actions/commandes";

/** Crée un brouillon par fournisseur pour tous les produits sous le seuil. */
export function CommanderAlertes({ pole }: { pole?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" disabled={pending} onClick={() => start(async () => {
      const r = await commanderProduits({ tousLesProduitsSousLeSeuil: true, pole });
      if (!r.ok) { toast.error(r.error); return; }
      if (r.data.sansFournisseur) toast.warning(`${r.data.sansFournisseur} produit(s) ignoré(s) : pas de fournisseur principal`);
      toast.success(`${r.data.commandes.length} brouillon(s) de commande prêt(s)`);
      router.push(r.data.commandes.length === 1 ? `/commandes/${r.data.commandes[0]}` : "/commandes?statut=brouillon");
    })}>
      <ShoppingCart className="h-5 w-5" />{pending ? "Préparation…" : "Commander tous les produits en alerte"}
    </Button>
  );
}
