import { notFound } from "next/navigation";
import { NiveauBadge, PoleBadge } from "@/components/stocks/badges";
import { ProduitForm } from "@/components/stocks/produit-form";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { requireSession } from "@/lib/auth/session";
import { TYPE_LABELS, type TypeMouvement } from "@/lib/stock/alertes";
import { getProduit, listFournisseursOptions, listMouvements, listPoles, PAGE_SIZE } from "@/server/queries/stock";

type Props = { params: { id: string }; searchParams: { page?: string } };

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(n);

export default async function PageProduit({ params, searchParams }: Props) {
  const session = await requireSession();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const [produit, poles, fournisseurs, { mouvements, total }] = await Promise.all([
    getProduit(params.id), listPoles(), listFournisseursOptions(), listMouvements(params.id, page),
  ]);
  if (!produit) notFound();
  const peutGerer = session.role !== "salarie";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold">{produit.nom}</h2>
        <PoleBadge pole={poles.find((p) => p.id === produit.pole_id)} />
        <NiveauBadge niveau={produit.niveau} />
      </div>
      <Card className="p-4">
        <p className="text-3xl font-semibold">{fmt(produit.stock_actuel)} {produit.unite}</p>
        <p className="text-sm text-muted-foreground">
          Seuil {fmt(produit.seuil_min)} · Réappro conseillé {fmt(produit.qte_reappro)} · Fournisseur : {produit.fournisseur_nom ?? "—"}
          {produit.prochaine_dlc && ` · Prochaine DLC : ${new Date(produit.prochaine_dlc).toLocaleDateString("fr-FR")}`}
        </p>
      </Card>

      <section aria-labelledby="historique">
        <h3 id="historique" className="mb-2 text-lg font-semibold">Historique des mouvements</h3>
        {mouvements.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">Aucun mouvement enregistré.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted"><tr>{["Date", "Type", "Quantité", "Motif", "Utilisateur"].map((h) => <th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {mouvements.map((m) => {
                  const profil = m.profiles as unknown as { nom_complet: string } | null;
                  const q = Number(m.quantite);
                  return (
                    <tr key={m.id} className="border-t">
                      <td className="px-3 py-3">{new Date(m.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td className="px-3 py-3">{TYPE_LABELS[m.type as TypeMouvement]}</td>
                      <td className={`px-3 py-3 font-semibold ${q < 0 ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300"}`}>{q > 0 ? "+" : ""}{fmt(q)} {produit.unite}</td>
                      <td className="px-3 py-3">{m.motif ?? "—"}</td>
                      <td className="px-3 py-3">{profil?.nom_complet ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath={`/stocks/produits/${produit.id}`} params={{}} />
      </section>

      {peutGerer && (
        <section aria-labelledby="modifier">
          <h3 id="modifier" className="mb-3 text-lg font-semibold">Modifier la fiche</h3>
          <ProduitForm
            poles={poles} fournisseurs={fournisseurs} poleParDefaut={produit.pole_id} poleFixe produitId={produit.id}
            valeurs={{ nom: produit.nom, categorie: produit.categorie ?? "", unite: produit.unite, lieu_stockage: produit.lieu_stockage ?? "", fournisseur_id: produit.fournisseur_id, pole_id: produit.pole_id, prix_achat: Number(produit.prix_achat), seuil_min: Number(produit.seuil_min), qte_reappro: Number(produit.qte_reappro), dlc_suivie: produit.dlc_suivie }}
          />
        </section>
      )}
    </div>
  );
}
