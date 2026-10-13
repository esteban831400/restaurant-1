import { AutoRefresh } from "@/components/automatisations/auto-refresh";
import { AutomatisationCard } from "@/components/automatisations/automatisation-card";
import { listAutomatisations } from "@/server/queries/automatisations";

export default async function PageAutomatisations() {
  const automatisations = await listAutomatisations();
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Automatisations</h1>
      <p className="mb-6 max-w-2xl text-muted-foreground">Activez ou désactivez chaque tâche automatique, réglez-la, lancez-la à la demande et consultez son historique. Une automatisation désactivée ne fait rien.</p>
      {automatisations.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Aucune automatisation n&apos;est disponible.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {automatisations.map((a) => <AutomatisationCard key={a.cle} auto={a} />)}
        </div>
      )}
      <AutoRefresh actif={automatisations.some((a) => a.dernier_statut === "en_cours")} />
    </>
  );
}
