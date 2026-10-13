"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/stock";

export async function supprimerConversation(id: string): Promise<ActionResult> {
  await requireSession(["gerant", "responsable"]);
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Conversation introuvable." };
  const { error } = await createClient().from("conversations_assistant").delete().eq("id", id);
  if (error) return { ok: false, error: "Une erreur est survenue. Réessayez." };
  revalidatePath("/assistant");
  return { ok: true };
}
