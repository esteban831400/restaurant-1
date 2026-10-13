import { z } from "zod";
import { estHex, verifierCouleurMarque } from "@/lib/theme";

export type Complexe = { nom: string; logo: string | null; couleur_principale: string; couleur_secondaire: string };
export const COMPLEXE_PAR_DEFAUT: Complexe = { nom: "La Palmeraie", logo: null, couleur_principale: "#15803D", couleur_secondaire: "#0E7490" };

const couleur = z.string().refine(estHex, "Couleur invalide (format #RRGGBB)").superRefine((v, ctx) => {
  const erreur = verifierCouleurMarque(v);
  if (erreur) ctx.addIssue({ code: "custom", message: erreur });
});

export function complexeSchema(prefixeLogo: string) {
  return z.object({
    nom: z.string().trim().min(1, "Le nom du complexe est obligatoire").max(80),
    logo: z.string().max(500).nullable().refine((u) => u === null || u.startsWith(prefixeLogo), "Logo non reconnu : envoyez-le depuis cette page"),
    couleur_principale: couleur,
    couleur_secondaire: couleur,
  });
}

/** Lecture tolérante du paramètre stocké : toute valeur invalide retombe sur la valeur par défaut. */
export function lireComplexe(brut: unknown): Complexe {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const hex = (v: unknown, defaut: string) => (typeof v === "string" && !verifierCouleurMarque(v) ? v : defaut);
  return {
    nom: typeof o.nom === "string" && o.nom.trim() ? o.nom.slice(0, 80) : COMPLEXE_PAR_DEFAUT.nom,
    logo: typeof o.logo === "string" && /^https?:\/\//.test(o.logo) ? o.logo : null,
    couleur_principale: hex(o.couleur_principale, COMPLEXE_PAR_DEFAUT.couleur_principale),
    couleur_secondaire: hex(o.couleur_secondaire, COMPLEXE_PAR_DEFAUT.couleur_secondaire),
  };
}
