import Link from "next/link";
import { MessageSquarePlus } from "lucide-react";
import { Chat } from "@/components/assistant/chat";
import { SupprimerConversation } from "@/components/assistant/supprimer-conversation";
import { ButtonLink } from "@/components/ui/button";
import { requireSession } from "@/lib/auth/session";
import { getConversation, listConversations } from "@/server/queries/assistant";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PageAssistant({ searchParams }: { searchParams: { c?: string } }) {
  const session = await requireSession(["gerant", "responsable"]);
  const [conversations, courante] = await Promise.all([
    listConversations(),
    searchParams.c && UUID.test(searchParams.c) ? getConversation(searchParams.c) : Promise.resolve(null),
  ]);

  return (
    <div className="grid gap-4 md:h-[calc(100vh-8rem)] md:grid-cols-[16rem_1fr]">
      <aside aria-label="Historique des conversations" className="flex flex-col gap-3 md:overflow-y-auto">
        <ButtonLink href="/assistant" variant="secondary"><MessageSquarePlus className="h-5 w-5" />Nouvelle conversation</ButtonLink>
        {conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Vos conversations apparaîtront ici.</p>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto md:max-h-none">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link href={`/assistant?c=${c.id}`} aria-current={c.id === courante?.id ? "page" : undefined}
                  className={`block rounded-md px-3 py-2 text-sm hover:bg-muted ${c.id === courante?.id ? "bg-muted font-medium" : ""}`}>
                  <span className="block truncate">{c.titre}</span>
                  <span className="text-xs text-muted-foreground">{new Date(c.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <section aria-label="Assistant" className="flex min-h-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="truncate text-2xl font-semibold">{courante?.titre ?? "Assistant"}</h1>
          {courante && <SupprimerConversation id={courante.id} />}
        </div>
        <div className="min-h-0 flex-1">
          <Chat key={courante?.id ?? "nouvelle"} conversationId={courante?.id ?? null} initialMessages={courante?.messages ?? []} estGerant={session.role === "gerant"} />
        </div>
      </section>
    </div>
  );
}
