import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MessageAssistant } from "@/lib/assistant/assistant";

export async function listConversations() {
  const { data } = await createClient().from("conversations_assistant").select("id, titre, updated_at").order("updated_at", { ascending: false }).limit(30);
  return data ?? [];
}

export async function getConversation(id: string) {
  const { data } = await createClient().from("conversations_assistant").select("id, titre, messages").eq("id", id).maybeSingle();
  return data ? { id: data.id, titre: data.titre, messages: data.messages as MessageAssistant[] } : null;
}
