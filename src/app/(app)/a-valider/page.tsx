import Link from "next/link";
import { StatutBadge } from "@/components/commandes/statut-badge";
import { ActionButton } from "@/components/ui/action-button";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { validerEtEnvoyer } from "@/server/actions/commandes";
import { confirmerRelance, rejeterLivraison, rejeterRelance, validerLivraison } from "@/server/actions/validation";
import { centreValidation } from "@/server/queries/automatisations";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function Section({ id, titre, nombre, vide, children }: { id: string; titre: string; nombre: number; vide: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-lg font-semibold">{titre} <span className="text-muted-foreground">({nombre})</span></h2>
      {nombre === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">{vide}</p> : <ul className="space-y-3">{children}</ul>}
    </section>
  );
}

export default async function PageAValider() {
  await requireSession(["gerant"]);
  const { commandes, livraisons, relances } = await centreValidation();
  const total = commandes.length + livraisons.length + relances.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">À valider</h1>
        <p className="text-muted-foreground">{total === 0 ? "Tout est à jour : rien n'attend votre validation." : `${total} élément(s) attendent votre validation. Rien n'est envoyé à un fournisseur sans votre accord.`}</p>
      </div>

      <Section id="commandes" titre="Commandes à valider" nombre={commandes.length} vide="Aucune commande en attente.">
        {commandes.map((c) => (
          <li key={c.id}>
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/commandes/${c.id}`} className="font-medium text-secondary hover:underline">Commande n°{c.numero} — {c.fournisseurs?.nom ?? "—"}</Link>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <StatutBadge statut={c.statut} />{c.commande_lignes.length} produit(s) · {euro.format(Number(c.total_estime))}{c.source !== "manuelle" && " · préparée automatiquement"}
                </p>
              </div>
              <div className="flex gap-2">
                <ButtonLink href={`/commandes/${c.id}`} variant="outline" size="sm">Voir</ButtonLink>
                <ActionButton size="sm" action={() => validerEtEnvoyer(c.id)} succes="Commande validée et envoyée" enCours="Envoi…" disabled={c.commande_lignes.length === 0}>Valider et envoyer</ActionButton>
              </div>
            </Card>
          </li>
        ))}
      </Section>

      <Section id="livraisons" titre="Livraisons lues par l'IA à vérifier" nombre={livraisons.length} vide="Aucune livraison à vérifier.">
        {livraisons.map((l) => (
          <li key={l.id}>
            <Card className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{l.fournisseur_nom ?? "Fournisseur inconnu"}</p>
                  <p className="text-sm text-muted-foreground">Reçue le {new Date(l.created_at).toLocaleDateString("fr-FR")}{l.fichier_url && <> · <a href={l.fichier_url} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">Voir le document</a></>}</p>
                </div>
                <div className="flex gap-2">
                  <ActionButton size="sm" variant="outline" action={() => rejeterLivraison(l.id)} succes="Livraison rejetée">Rejeter</ActionButton>
                  <ActionButton size="sm" action={() => validerLivraison(l.id)} succes="Livraison validée : le stock est à jour" enCours="Validation…" disabled={l.livraison_lignes.length === 0}>Valider</ActionButton>
                </div>
              </div>
              {l.livraison_lignes.length > 0 ? (
                <ul className="list-disc pl-5 text-sm">{l.livraison_lignes.map((x, i) => <li key={i}>{x.produits?.nom ?? "Produit"} : {Number(x.qte_recue)} {x.produits?.unite}</li>)}</ul>
              ) : (
                <p role="status" className="text-sm text-orange-800 dark:text-orange-200">Aucune ligne n&apos;a pu être rapprochée d&apos;un produit : cette livraison ne peut pas être validée automatiquement.</p>
              )}
            </Card>
          </li>
        ))}
      </Section>

      <Section id="relances" titre="Relances fournisseurs à confirmer" nombre={relances.length} vide="Aucune relance à confirmer.">
        {relances.map((r) => (
          <li key={r.id}>
            <Card className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.commandes?.fournisseurs?.nom ?? "Fournisseur"} — commande n°{r.commandes?.numero}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{r.message}</p>
              </div>
              <div className="flex gap-2">
                <ActionButton size="sm" variant="outline" action={() => rejeterRelance(r.id)} succes="Relance ignorée">Ignorer</ActionButton>
                <ActionButton size="sm" action={() => confirmerRelance(r.id)} succes="Relance envoyée" enCours="Envoi…">Confirmer et envoyer</ActionButton>
              </div>
            </Card>
          </li>
        ))}
      </Section>
    </div>
  );
}
