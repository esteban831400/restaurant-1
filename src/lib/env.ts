import { z } from "zod";

/** Variables publiques (exposées au navigateur). */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

/** Variables serveur uniquement : ne jamais importer depuis un composant client. */
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  N8N_WEBHOOK_SECRET: z.string().min(16),
  N8N_OUTBOUND_SECRET: z.string().min(16),
  N8N_WEBHOOK_ORDER_SEND: z.string().url(),
  N8N_WEBHOOK_ASSISTANT: z.string().url(),
  CRON_SECRET: z.string().min(16),
});

export function publicEnv() {
  return publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function serverEnv() {
  return serverSchema.parse(process.env);
}

/** Diagnostic de configuration : pour chaque variable, « ok », « absente » ou « invalide ». Ne révèle jamais les valeurs. */
export function diagnosticEnv(): { nom: string; etat: "ok" | "absente" | "invalide" }[] {
  const schemas = { ...publicSchema.shape, ...serverSchema.shape } as Record<string, z.ZodType>;
  return Object.entries(schemas).map(([nom, schema]) => {
    const valeur = process.env[nom];
    if (valeur === undefined || valeur === "") return { nom, etat: "absente" as const };
    return { nom, etat: schema.safeParse(valeur).success ? ("ok" as const) : ("invalide" as const) };
  });
}
