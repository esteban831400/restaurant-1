import { CommandeForm } from "@/components/commandes/commande-form";
import { requireSession } from "@/lib/auth/session";
import { produitsPourCommande } from "@/server/queries/commandes";
import { listFournisseursOptions, listPoles } from "@/server/queries/stock";

export default async function PageNouvelleCommande({ searchParams }: { searchParams: { fournisseur?: string } }) {
  const session = await requireSession(["gerant", "responsable"]);
  const [poles, fournisseurs, produits] = await Promise.all([listPoles(), listFournisseursOptions(), produitsPourCommande()]);
  const defaut = session.poleId ?? poles.find((p) => p.cle === "restaurant")?.id ?? poles[0]?.id ?? "";
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Nouvelle commande</h1>
      <CommandeForm poles={poles} fournisseurs={fournisseurs} produits={produits} poleParDefaut={defaut} poleFixe={session.role !== "gerant"}
        valeurs={searchParams.fournisseur ? { fournisseur_id: searchParams.fournisseur } : undefined} />
    </>
  );
}
