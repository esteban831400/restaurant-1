import { Pagination } from "@/components/ui/pagination";
import { listAudit, PAGE_AUDIT } from "@/server/queries/parametres";

const ACTIONS: Record<string, string> = { INSERT: "Création", UPDATE: "Modification", DELETE: "Suppression", PURGE: "Purge automatique", RGPD_EXPORT: "Export de données (RGPD)", RGPD_SUPPRESSION: "Suppression de compte (RGPD)" };
const ENTITES: Record<string, string> = { profiles: "Utilisateurs", commandes: "Commandes", fournisseurs: "Fournisseurs", produits: "Produits", parametres: "Paramètres", automatisations: "Automatisations", appels_ia: "Appels IA" };

export default async function PageJournal({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const { lignes, total } = await listAudit(page);
  return (
    <div className="space-y-6">
      <section aria-labelledby="audit">
        <h2 id="audit" className="mb-1 text-lg font-semibold">Journal des actions sensibles</h2>
        <p className="mb-3 max-w-2xl text-sm text-muted-foreground">Changements d&apos;utilisateurs et de droits, statuts de commandes, réglages, suppressions, exports et purges de données. Ce journal ne peut pas être modifié.</p>
        {lignes.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Aucune action enregistrée.</p> : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted"><tr>{["Date", "Qui", "Action", "Sur"].map((h) => <th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody>{lignes.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="whitespace-nowrap px-3 py-3">{new Date(l.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" })}</td>
                  <td className="px-3 py-3">{l.profiles?.nom_complet ?? (l.user_id ? "Compte supprimé" : "Système")}</td>
                  <td className="px-3 py-3">{ACTIONS[l.action] ?? l.action}</td>
                  <td className="px-3 py-3">{ENTITES[l.entite] ?? l.entite}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} pageSize={PAGE_AUDIT} basePath="/parametres/journal" params={{}} />
      </section>
      <section aria-labelledby="donnees" className="max-w-2xl rounded-lg border bg-card p-4">
        <h2 id="donnees" className="mb-1 text-lg font-semibold">Vos obligations RGPD</h2>
        <p className="text-sm text-muted-foreground">Pour exporter ou supprimer les données d&apos;une personne, ouvrez l&apos;onglet « Utilisateurs » : chaque ligne propose « Exporter » (fichier JSON) et la suppression du compte. La durée de conservation des appels se règle dans l&apos;onglet « Général ».</p>
      </section>
    </div>
  );
}
