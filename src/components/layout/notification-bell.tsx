"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, Phone, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Notification = { id: string; type: string; titre: string; corps: string | null; lien: string | null; lue: boolean; created_at: string };

const ICONES: Record<string, typeof Bell> = {
  commande_a_valider: CheckCircle2, seuil: TrendingDown, dlc: CalendarClock, echec_automatisation: AlertTriangle, message_standard: Phone,
};

function depuis(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (min < 1440) return `il y a ${Math.round(min / 60)} h`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

/** Cloche alimentée en temps réel (Supabase Realtime) par la table notifications ; la RLS décide de ce que chacun reçoit. */
export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient()).current;
  const nonLues = items.filter((n) => !n.lue).length;

  useEffect(() => {
    let actif = true;
    supabase.from("notifications").select("id, type, titre, corps, lien, lue, created_at").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (actif && data) setItems(data as Notification[]); });
    const canal = supabase.channel("notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (p) => setItems((x) => [p.new as Notification, ...x].slice(0, 20)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, (p) => setItems((x) => x.map((n) => (n.id === (p.new as Notification).id ? (p.new as Notification) : n))))
      .subscribe();
    return () => { actif = false; void supabase.removeChannel(canal); };
  }, [supabase]);

  const fermer = useCallback(() => setOuvert(false), []);
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => { if (!zone.current?.contains(e.target as Node)) fermer(); };
    const touche = (e: KeyboardEvent) => { if (e.key === "Escape") fermer(); };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche);
    return () => { document.removeEventListener("mousedown", clic); document.removeEventListener("keydown", touche); };
  }, [ouvert, fermer]);

  async function ouvrir(n: Notification) {
    setItems((x) => x.map((i) => (i.id === n.id ? { ...i, lue: true } : i)));
    await supabase.from("notifications").update({ lue: true }).eq("id", n.id);
    fermer();
    if (n.lien) router.push(n.lien);
  }

  async function toutLire() {
    const ids = items.filter((n) => !n.lue).map((n) => n.id);
    setItems((x) => x.map((n) => ({ ...n, lue: true })));
    if (ids.length) await supabase.from("notifications").update({ lue: true }).in("id", ids);
  }

  return (
    <div ref={zone} className="relative">
      <Button variant="ghost" size="icon" aria-label={`Notifications${nonLues ? `, ${nonLues} non lue${nonLues > 1 ? "s" : ""}` : ""}`} aria-expanded={ouvert} aria-haspopup="true" onClick={() => setOuvert((o) => !o)}>
        <Bell className="h-5 w-5" />
        {nonLues > 0 && <span aria-hidden className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">{nonLues > 9 ? "9+" : nonLues}</span>}
      </Button>
      {ouvert && (
        <div role="region" aria-label="Notifications" className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-lg border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="font-semibold">Notifications</p>
            {nonLues > 0 && <button type="button" onClick={toutLire} className="text-sm text-secondary hover:underline">Tout marquer comme lu</button>}
          </div>
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Aucune notification pour le moment.</p>
          ) : (
            <ul className="max-h-96 divide-y overflow-y-auto">
              {items.map((n) => {
                const Icone = ICONES[n.type] ?? Bell;
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => ouvrir(n)} className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted ${n.lue ? "" : "bg-primary/5"}`}>
                      <Icone className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${n.lue ? "" : "font-semibold"}`}>{n.titre}</span>
                        {n.corps && <span className="block truncate text-sm text-muted-foreground">{n.corps}</span>}
                        <span className="text-xs text-muted-foreground">{depuis(n.created_at)}</span>
                      </span>
                      {!n.lue && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="Non lue" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
