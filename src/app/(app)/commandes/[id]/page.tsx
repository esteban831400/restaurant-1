import Link from "next/link";
import { notFound } from "next/navigation";
import { CommandeActions } from "@/components/commandes/commande-actions";
import { StatutBadge } from "@/components/commandes/statut-badge";
import { PoleBadge } from "@/components/stocks/badges";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import type { StatutCommande } from "@/lib/commandes/statuts";
import { getCommande } from "@/server/queries/commandes";
import { listPoles } from "@/server/queries/stock";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

type Ligne = { id: string; produit_id: string; quantite: number; prix_unitaire: number; produits: { nom: string; unite: string } | null };

export default async function PageCommande({ params }: { params: { id: string } }) {
  const session = await requireSession(["gerant", "responsable"]);
  const [c, poles] = await Promise.all([getCommande(params.id), listPoles()]);
  if (!c) notFound();
  const f = c.fournisseurs as { id: string; nom: string; email: string | null; minimum_commande: number; mode_commande: string } | null;
  const lignes = c.commande_lignes as unknown as Ligne[];
  const statut = c.statut as StatutCommande;
  const sousMinimum = f && Number(c.total_estime) < Number(f.minimum_commande);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Commande n°{c.numero}</h1>
        <StatutBadge statut={statut} />
        <PoleBadge pole={poles.find((p) => p.id === c.pole_id)} />
        {c.source !== "manuelle" && <span className="text-sm text-muted-foreground">Préparée automatiquement</span>}
      </div>

      <Card className="grid gap-2 p-4 text-sm sm:grid-cols-2">
        <p><strong>Fournisseur :</strong> {f ? <Link href={`/fournisseurs/${f.id}`} className="text-secondary hover:underline">{f.nom}</Link> : "—"}</p>
        <p><strong>Mode de commande :</strong> {f ? { mail: "E-mail", telephone: "Téléphone", portail: "Portail" }[f.mode_commande as "mail"] : "—"}</p>
        <p><strong>Envoyée le :</strong> {date(c.date_envoi)}</p>
        <p><strong>Livraison prévue :</strong> {date(c.date_livraison_prevue)}</p>
        <p><strong>Dernière relance :</strong> {date(c.derniere_relance)}</p>
        <p><strong>Total estimé :</strong> {euro.format(Number(c.total_estime))}</p>
      </Card>

      {sousMinimum && f && (
        <p role="status" className="rounded-md border border-orange-500 bg-orange-50 p-3 text-sm text-orange-900 dark:bg-orange-950 dark:text-orange-100">
          Le total est inférieur au minimum de commande de ce fournisseur ({euro.format(Number(f.minimum_commande))}).
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted"><tr>{["Produit", "Quantité", "Prix unitaire", "Sous-total"].map((h) => <th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-3 py-3">{l.produits?.nom ?? "—"}</td>
                <td className="px-3 py-3">{Number(l.quantite)} {l.produits?.unite}</td>
                <td className="px-3 py-3">{euro.format(Number(l.prix_unitaire))}</td>
                <td className="px-3 py-3">{euro.format(Number(l.quantite) * Number(l.prix_unitaire))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CommandeActions id={c.id} statut={statut} role={session.role} />
    </div>
  );
}
