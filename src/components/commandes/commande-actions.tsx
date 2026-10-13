"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck, Pencil, Send } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";
import { peutEtreModifiee, peutEtreRecue, peutEtreValideeEtEnvoyee, transitionsManuelles, type StatutCommande } from "@/lib/commandes/statuts";
import type { Role } from "@/lib/auth/roles";
import { changerStatut, validerEtEnvoyer } from "@/server/actions/commandes";

export function CommandeActions({ id, statut, role }: { id: string; statut: StatutCommande; role: Role }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const envoyer = () => start(async () => {
    const r = await validerEtEnvoyer(id);
    if (!r.ok) { toast.error(r.error); router.refresh(); return; }
    toast.success("Commande validée et envoyée");
    router.refresh();
  });
  const changer = (vers: StatutCommande) => start(async () => {
    const r = await changerStatut(id, vers);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Statut mis à jour");
    router.refresh();
  });

  return (
    <div className="flex flex-wrap gap-3">
      {role === "gerant" && peutEtreValideeEtEnvoyee(statut) && (
        <Button onClick={envoyer} disabled={pending}><Send className="h-5 w-5" />{pending ? "Envoi…" : "Valider et envoyer"}</Button>
      )}
      {peutEtreRecue(statut) && role !== "salarie" && (
        <ButtonLink variant="secondary" href={`/commandes/${id}/reception`}><PackageCheck className="h-5 w-5" />Recevoir la livraison</ButtonLink>
      )}
      {peutEtreModifiee(statut) && role !== "salarie" && (
        <ButtonLink variant="outline" href={`/commandes/${id}/modifier`}><Pencil className="h-5 w-5" />Modifier</ButtonLink>
      )}
      {transitionsManuelles(statut, role).map((t) => (
        <Button key={t.vers} variant="outline" disabled={pending} onClick={() => changer(t.vers)}>{t.label}</Button>
      ))}
    </div>
  );
}
