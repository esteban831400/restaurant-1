import { CheckCircle2, XCircle } from "lucide-react";
import { AdressesForm } from "@/components/parametres/adresses-form";
import { Card } from "@/components/ui/card";
import { etatConfigurationServeur, getReglages } from "@/server/queries/parametres";
import { listAutomatisations } from "@/server/queries/automatisations";

function Etat({ ok, libelle }: { ok: boolean; libelle: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? <CheckCircle2 className="h-5 w-5 text-green-700 dark:text-green-300" aria-hidden /> : <XCircle className="h-5 w-5 text-red-700 dark:text-red-300" aria-hidden />}
      <span>{libelle} : <strong>{ok ? "configuré" : "manquant"}</strong></span>
    </li>
  );
}

export default async function PageAdresses() {
  const [{ adresses }, automatisations] = await Promise.all([getReglages(), listAutomatisations()]);
  const etat = etatConfigurationServeur();
  const lignes = automatisations.filter((a) => a.cle !== "envoi_commandes" && a.cle !== "assistant_ia").map((a) => ({ cle: a.cle, nom: a.nom, url: adresses[a.cle] ?? "" }));

  return (
    <div className="space-y-10">
      <section aria-labelledby="serveur">
        <h2 id="serveur" className="mb-1 text-lg font-semibold">Sécurité des échanges</h2>
        <p className="mb-3 max-w-2xl text-sm text-muted-foreground">Les clés secrètes ne sont jamais affichées ni enregistrées dans l&apos;application : elles sont configurées sur le serveur par votre prestataire. Ici, seul leur état est visible.</p>
        <Card className="p-4">
          <ul className="space-y-2 text-sm">
            <Etat ok={etat.secretEntrant} libelle="Clé de signature des messages reçus" />
            <Etat ok={etat.secretSortant} libelle="Clé de signature des messages envoyés" />
            <Etat ok={etat.cron} libelle="Clé des tâches planifiées" />
            <Etat ok={etat.envoiCommandes} libelle="Adresse de l'envoi des commandes aux fournisseurs" />
            <Etat ok={etat.assistant} libelle="Adresse de l'assistant IA" />
          </ul>
        </Card>
      </section>
      <section aria-labelledby="adresses">
        <h2 id="adresses" className="mb-1 text-lg font-semibold">Adresses des automatisations</h2>
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">Renseignez l&apos;adresse communiquée par votre prestataire pour chaque automatisation : c&apos;est ce qui permet le bouton « Lancer maintenant ». Seules les adresses https publiques sont acceptées.</p>
        <AdressesForm lignes={lignes} />
      </section>
    </div>
  );
}
