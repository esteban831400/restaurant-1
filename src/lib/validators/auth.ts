import { z } from "zod";

export const connexionSchema = z.object({
  email: z.string().min(1, "Saisissez votre adresse e-mail").email("Adresse e-mail invalide"),
  motDePasse: z.string().min(1, "Saisissez votre mot de passe"),
});

export const emailSchema = connexionSchema.pick({ email: true });

export const nouveauMotDePasseSchema = z
  .object({
    motDePasse: z.string().min(8, "8 caractères minimum"),
    confirmation: z.string(),
  })
  .refine((v) => v.motDePasse === v.confirmation, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmation"],
  });

export type ConnexionValues = z.infer<typeof connexionSchema>;
export type NouveauMotDePasseValues = z.infer<typeof nouveauMotDePasseSchema>;
