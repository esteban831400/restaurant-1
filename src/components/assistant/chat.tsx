"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_MESSAGE, SUGGESTIONS, SUGGESTIONS_GERANT, type MessageAssistant } from "@/lib/assistant/assistant";

type Props = { conversationId: string | null; initialMessages: MessageAssistant[]; estGerant: boolean };

const DELAI_CLIENT_MS = 35_000;

export function Chat({ conversationId, initialMessages, estGerant }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [saisie, setSaisie] = useState("");
  const [chargement, setChargement] = useState(false);
  const [secondes, setSecondes] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const bas = useRef<HTMLDivElement>(null);
  const suggestions = estGerant ? [...SUGGESTIONS, ...SUGGESTIONS_GERANT] : SUGGESTIONS;

  useEffect(() => { bas.current?.scrollIntoView({ block: "end" }); }, [messages, chargement]);
  useEffect(() => {
    if (!chargement) return;
    setSecondes(0);
    const t = setInterval(() => setSecondes((s) => s + 1), 1_000);
    return () => clearInterval(t);
  }, [chargement]);

  async function envoyer(texte: string) {
    const question = texte.trim();
    if (!question || chargement) return;
    setErreur(null);
    setChargement(true);
    setSaisie("");
    const optimiste: MessageAssistant = { role: "user", contenu: question, date: new Date().toISOString() };
    setMessages((m) => [...m, optimiste]);

    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), DELAI_CLIENT_MS);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId ?? undefined, message: question }),
        signal: ctrl.signal,
      });
      const corps = (await res.json().catch(() => ({}))) as { message?: unknown; conversation_id?: string };
      if (!res.ok || !corps.message || typeof corps.message !== "object") {
        throw new Error(typeof corps.message === "string" ? corps.message : "L'assistant n'a pas pu répondre. Réessayez.");
      }
      setMessages((m) => [...m, corps.message as MessageAssistant]);
      if (!conversationId && corps.conversation_id) router.replace(`/assistant?c=${corps.conversation_id}`, { scroll: false });
      router.refresh();
    } catch (e) {
      setMessages((m) => m.filter((x) => x !== optimiste));
      setSaisie(question);
      setErreur(e instanceof DOMException && e.name === "AbortError" ? "L'assistant met trop de temps à répondre. Réessayez." : e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      clearTimeout(minuteur);
      setChargement(false);
    }
  }

  return (
    <div className="flex h-full min-h-[28rem] flex-col rounded-lg border bg-card">
      <div role="log" aria-live="polite" aria-label="Conversation avec l'assistant" className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && !chargement && (
          <div className="mx-auto max-w-xl py-8 text-center">
            <Bot className="mx-auto mb-3 h-10 w-10 text-primary" aria-hidden />
            <h2 className="text-lg font-semibold">Comment puis-je vous aider ?</h2>
            <p className="mb-4 text-sm text-muted-foreground">Posez une question sur vos stocks, commandes, fournisseurs ou appels. Rien n&apos;est envoyé à un fournisseur sans votre validation.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => envoyer(s)} className="rounded-full border px-4 py-2 text-sm hover:bg-muted">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}`} aria-hidden>
              {m.role === "user" ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
            </span>
            <div className={`max-w-[85%] rounded-lg px-4 py-3 ${m.role === "user" ? "bg-muted" : "border"}`}>
              <p className="sr-only">{m.role === "user" ? "Vous :" : "Assistant :"}</p>
              <p className="whitespace-pre-wrap break-words">{m.contenu}</p>
              {m.outils && m.outils.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Consulté : {m.outils.join(", ")}</p>}
            </div>
          </div>
        ))}
        {chargement && (
          <div className="flex items-center gap-3 text-muted-foreground" role="status">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span>L&apos;assistant réfléchit… {secondes} s <span className="text-xs">(jusqu&apos;à 30 secondes)</span></span>
          </div>
        )}
        <div ref={bas} />
      </div>

      <form className="border-t p-3" onSubmit={(e) => { e.preventDefault(); void envoyer(saisie); }}>
        {erreur && <p role="alert" className="mb-2 text-sm text-destructive">{erreur}</p>}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="question" className="sr-only">Votre question</label>
            <textarea id="question" rows={2} maxLength={MAX_MESSAGE} value={saisie} disabled={chargement} placeholder="Écrivez votre question…"
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void envoyer(saisie); } }}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" />
          </div>
          <Button type="submit" size="icon" aria-label="Envoyer" disabled={chargement || !saisie.trim()}><Send className="h-5 w-5" /></Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Entrée pour envoyer, Maj+Entrée pour un retour à la ligne.</p>
      </form>
    </div>
  );
}
