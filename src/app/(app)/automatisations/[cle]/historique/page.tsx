import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/automatisations/auto-refresh";
import { StatutExecution } from "@/components/automatisations/statut-execution";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { dureeExecution } from "@/lib/automatisations/definitions";
import { getAutomatisation, listExecutions, PAGE_SIZE } from "@/server/queries/automatisations";

export default async function PageHistorique({ params, searchParams }: { params: { cle: string }; searchParams: { page?: string } }) {
  const auto = await getAutomatisation(params.cle);
  if (!auto) notFound();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const { executions, total } = await listExecutions(auto.cle, page);

  return (
    <>
      <ButtonLink href="/automatisations" variant="ghost" size="sm">← Automatisations</ButtonLink>
      <h1 className="mb-1 mt-2 text-2xl font-semibold">Historique — {auto.nom}</h1>
      <p className="mb-6 text-muted-foreground">{auto.description}</p>
      {executions.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Aucune exécution pour le moment.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted"><tr>{["Début", "Durée", "Déclenchement", "Statut", "Détail"].map((h) => <th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {executions.map((e) => (
                <tr key={e.id} className="border-t align-top">
                  <td className="whitespace-nowrap px-3 py-3">{new Date(e.debut).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Paris" })}</td>
                  <td className="whitespace-nowrap px-3 py-3">{dureeExecution(e.debut, e.fin) ?? "—"}</td>
                  <td className="px-3 py-3">{e.declenche_par === "manuel" ? "Manuel" : "Planifié"}</td>
                  <td className="px-3 py-3"><StatutExecution statut={e.statut} /></td>
                  <td className="px-3 py-3">{e.erreur ? <span className="text-red-700 dark:text-red-300">{e.erreur}</span> : e.resume ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath={`/automatisations/${auto.cle}/historique`} params={{}} />
      <AutoRefresh actif={executions.some((e) => e.statut === "en_cours")} />
    </>
  );
}
