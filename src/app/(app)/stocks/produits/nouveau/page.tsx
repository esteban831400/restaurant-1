import { ProduitForm } from "@/components/stocks/produit-form";
import { requireSession } from "@/lib/auth/session";
import { listFournisseursOptions, listPoles } from "@/server/queries/stock";

export default async function PageNouveauProduit() {
  const session = await requireSession(["gerant", "responsable"]);
  const [poles, fournisseurs] = await Promise.all([listPoles(), listFournisseursOptions()]);
  const defaut = session.poleId ?? poles.find((p) => p.cle === "restaurant")?.id ?? poles[0]?.id ?? "";
  return (
    <>
      <h2 className="mb-4 text-xl font-semibold">Nouveau produit</h2>
      <ProduitForm poles={poles} fournisseurs={fournisseurs} poleParDefaut={defaut} poleFixe={session.role !== "gerant"} />
    </>
  );
}
