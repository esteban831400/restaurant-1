import { z } from "zod";

export const fournisseurSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est obligatoire").max(120),
  contact: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().email("Adresse e-mail invalide").or(z.literal("")).optional().default(""),
  telephone: z.string().trim().max(30).optional().default(""),
  mode_commande: z.enum(["mail", "telephone", "portail"], { message: "Choisissez un mode de commande" }),
  jours_commande: z.array(z.number().int().min(1).max(7)).default([]),
  jours_livraison: z.array(z.number().int().min(1).max(7)).default([]),
  delai_jours: z.number({ message: "Saisissez un délai" }).int("Nombre entier attendu").min(0).max(60),
  minimum_commande: z.number({ message: "Saisissez un montant" }).min(0),
  pole_id: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(1000).optional().default(""),
});
export type FournisseurValues = z.input<typeof fournisseurSchema>;

export const ligneCommandeSchema = z.object({
  produit_id: z.string().uuid("Choisissez un produit"),
  quantite: z.number({ message: "Saisissez une quantité" }).positive("La quantité doit être supérieure à 0"),
});

export const commandeSchema = z.object({
  fournisseur_id: z.string().uuid("Choisissez un fournisseur"),
  pole_id: z.string().uuid("Choisissez un pôle"),
  date_livraison_prevue: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide").or(z.literal("")).optional(),
  lignes: z.array(ligneCommandeSchema).min(1, "Ajoutez au moins un produit")
    .refine((ls) => new Set(ls.map((l) => l.produit_id)).size === ls.length, "Un produit ne peut apparaître qu'une fois"),
});
export type CommandeValues = z.input<typeof commandeSchema>;

export const receptionSchema = z.object({
  commande_id: z.string().uuid(),
  lignes: z.array(z.object({
    produit_id: z.string().uuid(),
    qte_recue: z.number({ message: "Saisissez une quantité" }).min(0, "Quantité négative impossible"),
    ecart_motif: z.string().trim().max(200).optional().default(""),
  })).min(1),
});
