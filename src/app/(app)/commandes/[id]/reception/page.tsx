import { notFound, redirect } from "next/navigation";
import { ReceptionForm } from "@/components/commandes/reception-form";
import { requireSession } from "@/lib/auth/session";
import { peutEtreRecue, type StatutCommande } from "@/lib/commandes/statuts";
import { getCommande } from "@/server/queries/commandes";

export default async function PageReception({ params }: { params: { id: string } }) {
  await requireSession(["gerant", "responsable"]);
  const c = await getCommande(params.id);
  if (!c) notFound();
  if (!peutEtreRecue(c.statut as StatutCommande)) redirect(`/commandes/${c.id}`);
  const lignes = (c.commande_lignes as unknown as { produit_id: string; quantite: number; produits: { nom: string; unite: string } | null }[]).map((l) => ({
    produit_id: l.produit_id, nom: l.produits?.nom ?? "—", unite: l.produits?.unite ?? "", quantite: Number(l.quantite),
  }));
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Réception — commande n°{c.numero}</h1>
      <p className="mb-4 text-muted-foreground">Pointez ce que vous avez reçu. Le stock est mis à jour automatiquement.</p>
      <ReceptionForm commandeId={c.id} lignes={lignes} />
    </>
  );
}
