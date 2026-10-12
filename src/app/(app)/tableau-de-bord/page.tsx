import Link from "next/link";
import { CarteSynthese } from "@/components/dashboard/carte-synthese";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { IssueBadge } from "@/components/appels/issue-badge";
import { StatutBadge } from "@/components/commandes/statut-badge";
import { CommanderAlertes } from "@/components/stocks/commander-alertes";
import { ActionButton } from "@/components/ui/action-button";
import { ButtonLink } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { aujourdhuiParis } from "@/lib/dates";
import { construireTaches, pluriel } from "@/lib/dashboard";
import type { StatutCommande } from "@/lib/commandes/statuts";
import type { IssueAppel } from "@/lib/appels/appels";
import { validerEtEnvoyer } from "@/server/actions/commandes";
import { donneesDashboard } from "@/server/queries/dashboard";
import { listPoles } from "@/server/queries/stock";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export default async function PageTableauDeBord({ searchParams }: { searchParams: { pole?: string } }) {
  const session = await requireSession(["gerant"]);
  const poles = await listPoles();
  const pole = poles.find((p) => p.id === searchParams.pole) ?? null;
  const d = await donneesDashboard(pole);
  const c = d.compteurs;
  const taches = construireTaches(c, aujourdhuiParis());
  const aValiderTotal = c.commandesAValider + c.relancesAConfirmer + c.livraisonsAVerifier;
  const filtre = pole ? `&pole=${pole.id}` : "";
  const suffixe = pole ? ` · ${pole.nom}` : "";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bonjour {session.nomComplet.split(" ")[0]}</h1>
          <p className="text-muted-foreground">{new Date().toLocaleDateString("fr-FR", { dateStyle: "full", timeZone: "Europe/Paris" })}{suffixe}</p>
        </div>
        <nav aria-label="Filtrer par pôle" className="flex flex-wrap gap-2">
          {[{ id: "", nom: "Tous les pôles", couleur: "" }, ...poles].map((p) => {
            const actif = (pole?.id ?? "") === p.id;
            return (
              <Link key={p.id || "tous"} href={p.id ? `/tableau-de-bord?pole=${p.id}` : "/tableau-de-bord"} aria-current={actif ? "true" : undefined}
                style={actif && p.couleur ? { backgroundColor: p.couleur, borderColor: p.couleur, color: "#fff" } : undefined}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${actif ? (p.couleur ? "" : "border-primary bg-primary text-primary-foreground") : "hover:bg-muted"}`}>
                {p.nom}
              </Link>
            );
          })}
        </nav>
      </div>

      <section aria-label="Synthèse" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CarteSynthese titre="Produits sous le seuil" valeur={c.sousSeuil} alerte={c.sousSeuil > 0} lien={`/stocks?niveau=rouge${filtre}`}
          detail={c.dlcProche ? `${pluriel(c.dlcProche, "produit")} à DLC proche` : "Aucune DLC proche"} action={c.sousSeuil > 0 ? <CommanderAlertes pole={pole?.id} /> : undefined} />
        <CarteSynthese titre="Commandes à valider" valeur={c.commandesAValider} lien="/a-valider" detail={c.commandesAValider ? "Brouillons et commandes soumises" : "Rien en attente"}
          action={c.commandesAValider > 0 ? <ButtonLink href="/a-valider" size="sm" variant="secondary">Voir et valider</ButtonLink> : undefined} />
        <CarteSynthese titre="Livraisons attendues aujourd'hui" valeur={c.livraisonsAttendues} lien="/commandes?attendues=1" detail={c.commandesEnRetard ? `${pluriel(c.commandesEnRetard, "commande")} en retard` : "Aucun retard"} alerte={c.commandesEnRetard > 0}
          action={c.livraisonsAttendues > 0 ? <ButtonLink href="/commandes?attendues=1" size="sm" variant="secondary">Recevoir</ButtonLink> : undefined} />
        <CarteSynthese titre="Appels IA aujourd'hui" valeur={d.appels.total} lien="/appels"
          detail={d.appels.dernier ? `Dernier : ${new Date(d.appels.dernier.date_appel).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}${c.messagesLaisses ? ` · ${pluriel(c.messagesLaisses, "message")} laissé${c.messagesLaisses > 1 ? "s" : ""}` : ""}` : "Aucun appel enregistré"}
          action={d.appels.dernier ? <IssueBadge issue={d.appels.dernier.issue as IssueAppel} /> : undefined} />
        <CarteSynthese titre="Automatisations en échec" valeur={c.automatisationsEnEchec} alerte={c.automatisationsEnEchec > 0} lien="/automatisations"
          detail={d.automatisationsEnEchec.length ? d.automatisationsEnEchec.join(", ") : "Tout fonctionne"} />
        <CarteSynthese titre="Éléments à valider" valeur={aValiderTotal} lien="/a-valider"
          detail={aValiderTotal ? `${c.commandesAValider} commande(s) · ${c.livraisonsAVerifier} livraison(s) · ${c.relancesAConfirmer} relance(s)` : "Tout est validé"} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="taches">
          <h2 id="taches" className="mb-3 text-lg font-semibold">À faire aujourd&apos;hui</h2>
          {taches.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">Rien d&apos;urgent : tout est à jour.</p>
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {taches.map((t) => (
                <li key={t.id}>
                  <Link href={t.lien} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted">
                    <span>{t.libelle}</span>
                    {t.urgence === "haute" && <span className="shrink-0 rounded-full border border-orange-500 px-2 py-0.5 text-xs font-semibold text-orange-800 dark:text-orange-200">Prioritaire</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="validation">
          <h2 id="validation" className="mb-3 text-lg font-semibold">Commandes à valider</h2>
          {d.commandesAValider.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">Aucune commande en attente.</p>
          ) : (
            <ul className="space-y-2">
              {d.commandesAValider.map((cmd) => (
                <li key={cmd.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
                  <div>
                    <Link href={`/commandes/${cmd.id}`} className="font-medium text-secondary hover:underline">n°{cmd.numero} — {cmd.fournisseur}</Link>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground"><StatutBadge statut={cmd.statut as StatutCommande} />{cmd.nbLignes} produit(s) · {euro.format(cmd.total_estime)}</p>
                  </div>
                  <ActionButton size="sm" action={() => validerEtEnvoyer(cmd.id)} succes="Commande validée et envoyée" enCours="Envoi…" disabled={cmd.nbLignes === 0}>Valider et envoyer</ActionButton>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <DashboardCharts valeurStock={d.valeurStock} top={d.topConsommation} />
    </div>
  );
}
