import type { FournisseurOption, Pole } from "@/types/stock";

export type ProduitCommande = { id: string; nom: string; unite: string; prix_achat: number; qte_reappro: number; fournisseur_id: string | null; pole_id: string };
export type DonneesFormulaires = { poles: Pole[]; fournisseurs: FournisseurOption[]; produits: ProduitCommande[]; poleParDefaut: string; poleFixe: boolean };
export type ProduitMouvement = { id: string; nom: string; unite: string; dlc_suivie: boolean };
export type CommandeAReceptionner = { id: string; numero: number; fournisseur: string; date_livraison_prevue: string | null };
export type LigneReception = { produit_id: string; nom: string; unite: string; quantite: number };
export type ResultatRecherche = { id: string; groupe: "Produits" | "Fournisseurs" | "Commandes"; libelle: string; detail?: string; href: string };
