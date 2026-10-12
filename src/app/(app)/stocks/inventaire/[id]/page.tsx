import { notFound } from "next/navigation";
import { InventaireComptage } from "@/components/stocks/inventaire-comptage";
import { ValiderInventaire } from "@/components/stocks/valider-inventaire";
import { requireSession } from "@/lib/auth/session";
import { getInventaire, STATUT_INVENTAIRE } from "@/server/queries/inventaire";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3, signDisplay: "exceptZero" }).format(n);

export default async function PageInventaire({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const data = await getInventaire(params.id);
  if (!data) notFound();
  const { inventaire, produits, lignes } = data;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Inventaire {inventaire.poles?.nom}</h2>
        <p className="text-sm text-muted-foreground">{STATUT_INVENTAIRE[inventaire.statut]} · {new Date(inventaire.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}</p>
      </div>

      {inventaire.statut === "en_cours" ? (
        <InventaireComptage inventaireId={inventaire.id} produits={produits} initial={Object.fromEntries(lignes.map((l) => [l.produit_id, Number(l.qte_comptee)]))} />
      ) : (
        <>
          {lignes.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">Aucun produit compté.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted"><tr>{["Produit", "Théorique", "Compté", "Écart"].map((h) => <th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
                <tbody>
                  {lignes.map((l) => {
                    const p = produits.find((x) => x.id === l.produit_id);
                    const ecart = Number(l.ecart);
                    return (
                      <tr key={l.produit_id} className="border-t">
                        <td className="px-3 py-3 font-medium">{p?.nom ?? "—"}</td>
                        <td className="px-3 py-3">{fmt(Number(l.qte_theorique))} {p?.unite}</td>
                        <td className="px-3 py-3">{fmt(Number(l.qte_comptee))} {p?.unite}</td>
                        <td className={`px-3 py-3 font-semibold ${ecart < 0 ? "text-red-700 dark:text-red-300" : ecart > 0 ? "text-orange-700 dark:text-orange-300" : ""}`}>{fmt(ecart)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {inventaire.statut === "a_valider" && session.role !== "salarie" && <ValiderInventaire inventaireId={inventaire.id} />}
          {inventaire.statut === "a_valider" && session.role === "salarie" && <p className="text-muted-foreground">En attente de validation par un responsable.</p>}
        </>
      )}
    </div>
  );
}
