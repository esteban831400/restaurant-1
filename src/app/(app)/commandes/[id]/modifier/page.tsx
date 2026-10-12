import { notFound, redirect } from "next/navigation";
import { CommandeForm } from "@/components/commandes/commande-form";
import { requireSession } from "@/lib/auth/session";
import { peutEtreModifiee, type StatutCommande } from "@/lib/commandes/statuts";
import { getCommande, produitsPourCommande } from "@/server/queries/commandes";
import { listFournisseursOptions, listPoles } from "@/server/queries/stock";

export default async function PageModifierCommande({ params }: { params: { id: string } }) {
  const session = await requireSession(["gerant", "responsable"]);
  const [c, poles, fournisseurs, produits] = await Promise.all([getCommande(params.id), listPoles(), listFournisseursOptions(), produitsPourCommande()]);
  if (!c) notFound();
  if (!peutEtreModifiee(c.statut as StatutCommande)) redirect(`/commandes/${c.id}`);
  const lignes = c.commande_lignes as unknown as { produit_id: string; quantite: number }[];
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Modifier la commande n°{c.numero}</h1>
      <CommandeForm poles={poles} fournisseurs={fournisseurs} produits={produits} poleParDefaut={c.pole_id} poleFixe={session.role !== "gerant"} commandeId={c.id}
        valeurs={{ fournisseur_id: c.fournisseur_id, pole_id: c.pole_id, date_livraison_prevue: c.date_livraison_prevue ?? "", lignes: lignes.map((l) => ({ produit_id: l.produit_id, quantite: Number(l.quantite) })) }} />
    </>
  );
}
