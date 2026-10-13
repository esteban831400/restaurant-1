import { FournisseurForm } from "@/components/fournisseurs/fournisseur-form";
import { requireSession } from "@/lib/auth/session";
import { listPoles } from "@/server/queries/stock";

export default async function PageNouveauFournisseur() {
  const session = await requireSession(["gerant", "responsable"]);
  const poles = await listPoles();
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Nouveau fournisseur</h1>
      <FournisseurForm poles={poles} choixPole={session.role === "gerant"} />
    </>
  );
}
