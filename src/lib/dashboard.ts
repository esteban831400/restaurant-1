export type Compteurs = {
  commandesAValider: number;
  relancesAConfirmer: number;
  livraisonsAVerifier: number;
  livraisonsAttendues: number;
  commandesEnRetard: number;
  sousSeuil: number;
  dlcProche: number;
  inventairesAValider: number;
  messagesLaisses: number;
  automatisationsEnEchec: number;
};

export type Tache = { id: string; libelle: string; lien: string; urgence: "haute" | "normale" };

export const pluriel = (n: number, singulier: string, pluriel = `${singulier}s`) => `${n} ${n > 1 ? pluriel : singulier}`;

/** Liste « À faire aujourd'hui » : uniquement ce qui demande une action, dans l'ordre d'urgence. */
export function construireTaches(c: Compteurs, aujourdhui: string): Tache[] {
  const t: (Tache & { n: number })[] = [
    { id: "commandes", n: c.commandesAValider, urgence: "haute", lien: "/a-valider", libelle: `Valider ${pluriel(c.commandesAValider, "commande")} fournisseur` },
    { id: "relances", n: c.relancesAConfirmer, urgence: "haute", lien: "/a-valider", libelle: `Confirmer ${pluriel(c.relancesAConfirmer, "relance")} fournisseur` },
    { id: "livraisons-ia", n: c.livraisonsAVerifier, urgence: "haute", lien: "/a-valider", libelle: `Vérifier ${pluriel(c.livraisonsAVerifier, "livraison", "livraisons")} lue${c.livraisonsAVerifier > 1 ? "s" : ""} par l'IA` },
    { id: "attendues", n: c.livraisonsAttendues, urgence: "haute", lien: "/commandes?attendues=1", libelle: `Recevoir ${pluriel(c.livraisonsAttendues, "livraison")} attendue${c.livraisonsAttendues > 1 ? "s" : ""} aujourd'hui` },
    { id: "retard", n: c.commandesEnRetard, urgence: "haute", lien: "/commandes?statut=en_retard", libelle: `Relancer ${pluriel(c.commandesEnRetard, "commande")} en retard` },
    { id: "seuil", n: c.sousSeuil, urgence: "normale", lien: "/stocks?niveau=rouge", libelle: `Commander ${pluriel(c.sousSeuil, "produit")} sous le seuil` },
    { id: "dlc", n: c.dlcProche, urgence: "normale", lien: "/stocks?niveau=dlc", libelle: `Surveiller ${pluriel(c.dlcProche, "produit")} à DLC proche` },
    { id: "inventaire", n: c.inventairesAValider, urgence: "normale", lien: "/stocks/inventaire", libelle: `Valider ${pluriel(c.inventairesAValider, "inventaire")}` },
    { id: "messages", n: c.messagesLaisses, urgence: "normale", lien: `/appels?issue=message_laisse&du=${aujourdhui}`, libelle: `Lire ${pluriel(c.messagesLaisses, "message")} laissé${c.messagesLaisses > 1 ? "s" : ""} au standard aujourd'hui` },
    { id: "echecs", n: c.automatisationsEnEchec, urgence: "haute", lien: "/automatisations", libelle: `Vérifier ${pluriel(c.automatisationsEnEchec, "automatisation")} en échec` },
  ];
  return t.filter((x) => x.n > 0).map((x) => ({ id: x.id, libelle: x.libelle, lien: x.lien, urgence: x.urgence })).sort((a, b) => Number(b.urgence === "haute") - Number(a.urgence === "haute"));
}
