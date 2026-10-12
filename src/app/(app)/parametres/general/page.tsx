import { RetentionForm } from "@/components/appels/retention-form";
import { ComplexeForm } from "@/components/parametres/complexe-form";
import { SeuilDlcForm } from "@/components/parametres/seuil-dlc-form";
import { retentionJours } from "@/server/queries/appels";
import { getComplexe, getReglages } from "@/server/queries/parametres";

export default async function PageGeneral() {
  const [complexe, reglages, retention] = await Promise.all([getComplexe(), getReglages(), retentionJours()]);
  return (
    <div className="space-y-10">
      <section aria-labelledby="identite">
        <h2 id="identite" className="mb-1 text-lg font-semibold">Identité du complexe</h2>
        <p className="mb-4 text-sm text-muted-foreground">Le nom, le logo et les couleurs s&apos;appliquent à toute l&apos;application. Les couleurs trop claires sont refusées pour garder un texte lisible.</p>
        <ComplexeForm initial={complexe} />
      </section>
      <section aria-labelledby="dlc">
        <h2 id="dlc" className="mb-1 text-lg font-semibold">Alerte DLC</h2>
        <p className="mb-4 text-sm text-muted-foreground">Les produits dont la date limite approche sont signalés dans les stocks et sur le tableau de bord.</p>
        <SeuilDlcForm jours={reglages.seuilDlc} />
      </section>
      <section aria-labelledby="rgpd">
        <h2 id="rgpd" className="mb-1 text-lg font-semibold">Conservation des appels (RGPD)</h2>
        <p className="mb-4 text-sm text-muted-foreground">Les appels plus anciens sont supprimés automatiquement chaque nuit.</p>
        <RetentionForm jours={retention} />
      </section>
    </div>
  );
}
