import type { Niveau } from "@/lib/stock/alertes";

export type ProduitStock = {
  id: string;
  nom: string;
  categorie: string | null;
  unite: "kg" | "L" | "piece";
  lieu_stockage: string | null;
  fournisseur_id: string | null;
  fournisseur_nom: string | null;
  pole_id: string;
  prix_achat: number;
  seuil_min: number;
  qte_reappro: number;
  dlc_suivie: boolean;
  actif: boolean;
  stock_actuel: number;
  niveau: Niveau;
  prochaine_dlc: string | null;
  dlc_proche: boolean;
};

export type Pole = { id: string; cle: "restaurant" | "minigolf" | "aquatique"; nom: string; couleur: string };
export type FournisseurOption = { id: string; nom: string };
export type ActionResult<T = undefined> = ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };
