import { ImportForm } from "@/components/stocks/import-form";
import { requireSession } from "@/lib/auth/session";
import { listPoles } from "@/server/queries/stock";

export default async function PageImport() {
  const session = await requireSession(["gerant", "responsable"]);
  const poles = await listPoles();
  const defaut = session.poleId ?? poles.find((p) => p.cle === "restaurant")?.id ?? poles[0]?.id ?? "";

  return (
    <div className="space-y-8">
      <section aria-labelledby="export">
        <h2 id="export" className="mb-2 text-xl font-semibold">Exporter le catalogue</h2>
        <a href="/api/stocks/export" className="inline-flex h-12 items-center rounded-md border border-input px-5 font-medium hover:bg-muted">Télécharger le CSV</a>
      </section>
      <section aria-labelledby="import">
        <h2 id="import" className="mb-2 text-xl font-semibold">Importer depuis Excel</h2>
        <p className="mb-4 max-w-xl text-sm text-muted-foreground">
          Première ligne obligatoire avec les colonnes : <code>nom; categorie; unite; lieu_stockage; fournisseur; prix_achat; seuil_min; qte_reappro; dlc_suivie; stock_initial</code>.
          L&apos;unité vaut kg, L ou piece. Le fournisseur doit déjà exister. Si une ligne est invalide, rien n&apos;est importé.
        </p>
        <ImportForm poles={poles} poleParDefaut={defaut} poleFixe={session.role !== "gerant"} />
      </section>
    </div>
  );
}
