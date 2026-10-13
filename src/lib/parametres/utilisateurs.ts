import { z } from "zod";
import type { Role } from "@/lib/auth/roles";

const base = z.object({
  nom_complet: z.string().trim().min(1, "Le nom est obligatoire").max(120),
  role: z.enum(["gerant", "responsable", "salarie"], { message: "Choisissez un rôle" }),
  pole_id: z.string().uuid().nullable(),
  saisonnier: z.boolean().default(false),
});
const pole = (v: { role: string; pole_id: string | null }, ctx: z.RefinementCtx) => {
  if (v.role !== "gerant" && !v.pole_id) ctx.addIssue({ code: "custom", path: ["pole_id"], message: "Choisissez un pôle pour ce rôle" });
};

export const utilisateurSchema = base.extend({ actif: z.boolean() }).superRefine(pole);
export const invitationSchema = base.extend({ email: z.string().trim().email("Adresse e-mail invalide").max(200) }).superRefine(pole);

type Etat = { role: Role; actif: boolean };

/** Empêche de se retirer l'accès ou de supprimer le dernier gérant actif. Renvoie un message d'erreur ou null. */
export function verifierModification(p: { acteurId: string; cibleId: string; actuel: Etat; nouveau: Etat; gerantsActifs: number }): string | null {
  const perdLaGestion = p.actuel.role === "gerant" && p.actuel.actif && (p.nouveau.role !== "gerant" || !p.nouveau.actif);
  if (perdLaGestion && p.acteurId === p.cibleId) return "Vous ne pouvez pas retirer vos propres droits de gérant ni désactiver votre compte.";
  if (perdLaGestion && p.gerantsActifs <= 1) return "Il doit rester au moins un gérant actif.";
  return null;
}

export function verifierSuppression(p: { acteurId: string; cibleId: string; cible: Etat; gerantsActifs: number }): string | null {
  if (p.acteurId === p.cibleId) return "Vous ne pouvez pas supprimer votre propre compte.";
  if (p.cible.role === "gerant" && p.cible.actif && p.gerantsActifs <= 1) return "Il doit rester au moins un gérant actif.";
  return null;
}
