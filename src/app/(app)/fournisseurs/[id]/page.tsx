import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { DupliquerCommande } from "@/components/commandes/dupliquer-commande";
import { StatutBadge } from "@/components/commandes/statut-badge";
import { FournisseurForm } from "@/components/fournisseurs/fournisseur-form";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { commandesDuFournisseur, getFournisseur, produitsDuFournisseur, statistiquesFournisseur } from "@/server/queries/commandes";
import { listPoles } from "@/server/queries/stock";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const JOURS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const joursTexte = (j: number[]) => (j.length ? j.map((n) => JOURS[n - 1]).join(", ") : "—");

export default async function PageFournisseur({ params }: { params: { id: string } }) {
  await requireSession(["gerant", "responsable"]);
  const f = await getFournisseur(params.id);
  if (!f) notFound();
  const [produits, commandes, { stats, prix }, poles] = await Promise.all([
    produitsDuFournisseur(f.id), commandesDuFournisseur(f.id), statistiquesFournisseur(f.id), listPoles(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{f.nom}</h1>
        <div className="flex flex-wrap gap-3">
          <DupliquerCommande fournisseurId={f.id} />
          <ButtonLink href={`/commandes/nouveau?fournisseur=${f.id}`}><Plus className="h-5 w-5" />Nouvelle commande</ButtonLink>
        </div>
      </div>

      <Card className="grid gap-3 p-4 text-sm sm:grid-cols-2">
        <p><strong>Contact :</strong> {f.contact ?? "—"}</p>
        <p><strong>Téléphone :</strong> {f.telephone ?? "—"}</p>
        <p><strong>E-mail :</strong> {f.email ?? "—"}</p>
        <p><strong>Mode de commande :</strong> {{ mail: "E-mail", telephone: "Téléphone", portail: "Portail" }[f.mode_commande as "mail"]}</p>
        <p><strong>Jours de commande :</strong> {joursTexte(f.jours_commande)}</p>
        <p><strong>Jours de livraison :</strong> {joursTexte(f.jours_livraison)}</p>
        <p><strong>Délai annoncé :</strong> {f.delai_jours} jour(s)</p>
        <p><strong>Minimum de commande :</strong> {euro.format(Number(f.minimum_commande))}</p>
      </Card>

      <section aria-labelledby="perf">
        <h2 id="perf" className="mb-3 text-lg font-semibold">Fiabilité</h2>
        {stats.nbLivraisons === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">Pas encore de livraison enregistrée pour ce fournisseur.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4"><p className="text-3xl font-semibold">{stats.delaiMoyenJours ?? "—"} j</p><p className="text-sm text-muted-foreground">Délai réel moyen (annoncé : {f.delai_jours} j)</p></Card>
            <Card className="p-4"><p className="text-3xl font-semibold">{stats.tauxConformes ?? "—"} %</p><p className="text-sm text-muted-foreground">Livraisons conformes</p></Card>
            <Card className="p-4"><p className="text-3xl font-semibold">{stats.nbLivraisons}</p><p className="text-sm text-muted-foreground">Livraisons enregistrées</p></Card>
          </div>
        )}
        {prix.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <caption className="bg-muted px-3 py-2 text-left font-semibold">Évolution des prix</caption>
              <thead><tr>{["Produit", "Premier prix", "Dernier prix", "Variation"].map((h) => <th key={h} scope="col" className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
              <tbody>{prix.map((p) => (
                <tr key={p.produit_id} className="border-t">
                  <td className="px-3 py-2">{p.nom}</td><td className="px-3 py-2">{euro.format(p.premier)}</td><td className="px-3 py-2">{euro.format(p.dernier)}</td>
                  <td className={`px-3 py-2 font-semibold ${(p.variationPct ?? 0) > 0 ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300"}`}>{p.variationPct === null ? "—" : `${p.variationPct > 0 ? "+" : ""}${p.variationPct} %`}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="produits">
        <h2 id="produits" className="mb-3 text-lg font-semibold">Produits associés ({produits.length})</h2>
        {produits.length === 0 ? <p className="text-muted-foreground">Aucun produit n&apos;a ce fournisseur comme fournisseur principal.</p> : (
          <ul className="divide-y rounded-lg border">{produits.map((p) => (
            <li key={p.id}><Link href={`/stocks/produits/${p.id}`} className="flex justify-between px-4 py-3 hover:bg-muted"><span>{p.nom}</span><span className="text-muted-foreground">{Number(p.stock_actuel)} {p.unite}</span></Link></li>
          ))}</ul>
        )}
      </section>

      <section aria-labelledby="cmds">
        <h2 id="cmds" className="mb-3 text-lg font-semibold">Dernières commandes</h2>
        {commandes.length === 0 ? <p className="text-muted-foreground">Aucune commande.</p> : (
          <ul className="divide-y rounded-lg border">{commandes.map((c) => (
            <li key={c.id}><Link href={`/commandes/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-muted">
              <span>n°{c.numero} · {new Date(c.created_at).toLocaleDateString("fr-FR")}</span><span className="flex items-center gap-3">{euro.format(Number(c.total_estime))}<StatutBadge statut={c.statut} /></span>
            </Link></li>
          ))}</ul>
        )}
      </section>

      <section aria-labelledby="modifier">
        <h2 id="modifier" className="mb-3 text-lg font-semibold">Modifier la fiche</h2>
        <FournisseurForm poles={poles} choixPole={false} fournisseurId={f.id} valeurs={{
          nom: f.nom, contact: f.contact ?? "", email: f.email ?? "", telephone: f.telephone ?? "", mode_commande: f.mode_commande,
          jours_commande: f.jours_commande, jours_livraison: f.jours_livraison, delai_jours: f.delai_jours, minimum_commande: Number(f.minimum_commande), pole_id: f.pole_id, notes: f.notes ?? "",
        }} />
      </section>
    </div>
  );
}
