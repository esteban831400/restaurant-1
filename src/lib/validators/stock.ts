import { z } from "zod";

const nombrePositif = (msg: string) => z.number({ message: msg }).min(0, "Doit être positif ou nul");

export const produitSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est obligatoire").max(120),
  categorie: z.string().trim().max(80).optional().default(""),
  unite: z.enum(["kg", "L", "piece"], { message: "Choisissez une unité" }),
  lieu_stockage: z.string().trim().max(80).optional().default(""),
  fournisseur_id: z.string().uuid().nullable().optional(),
  pole_id: z.string().uuid("Choisissez un pôle"),
  prix_achat: nombrePositif("Saisissez un prix"),
  seuil_min: nombrePositif("Saisissez un seuil"),
  qte_reappro: nombrePositif("Saisissez une quantité"),
  dlc_suivie: z.boolean().default(false),
});
export type ProduitValues = z.input<typeof produitSchema>;

export const TYPES_MOUVEMENT = ["entree", "sortie", "perte", "correction"] as const;

export const mouvementSchema = z
  .object({
    produit_id: z.string().uuid(),
    type: z.enum(TYPES_MOUVEMENT, { message: "Choisissez un type" }),
    quantite: z.number({ message: "Saisissez une quantité" }).refine((n) => n !== 0, "La quantité ne peut pas être nulle"),
    motif: z.string().trim().max(200).optional().default(""),
    dlc: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide").optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.type !== "correction" && v.quantite < 0) {
      ctx.addIssue({ code: "custom", path: ["quantite"], message: "Saisissez une quantité positive" });
    }
    if ((v.type === "perte" || v.type === "correction") && !v.motif) {
      ctx.addIssue({ code: "custom", path: ["motif"], message: "Le motif est obligatoire" });
    }
  });
export type MouvementValues = z.input<typeof mouvementSchema>;

export const ligneImportSchema = z.object({
  nom: z.string().trim().min(1, "nom manquant"),
  categorie: z.string().trim().default(""),
  unite: z.enum(["kg", "L", "piece"], { message: "unité invalide (kg, L ou piece)" }),
  lieu_stockage: z.string().trim().default(""),
  prix_achat: z.number().min(0, "prix invalide"),
  seuil_min: z.number().min(0, "seuil invalide"),
  qte_reappro: z.number().min(0, "quantité de réappro invalide"),
  dlc_suivie: z.boolean(),
  stock_initial: z.number().min(0, "stock initial invalide"),
});
