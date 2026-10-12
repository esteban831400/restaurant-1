"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { History, Play, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { StatutExecution } from "@/components/automatisations/statut-execution";
import { CANAL_LABELS, CANAUX, CHAMPS, JOURS_SEMAINE, LIBELLES_CHAMPS, reglagesEffectifs, schemaParametres } from "@/lib/automatisations/definitions";
import { basculerAutomatisation, modifierReglages } from "@/server/actions/automatisations";
import type { Automatisation } from "@/server/queries/automatisations";

export function AutomatisationCard({ auto }: { auto: Automatisation }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [valeurs, setValeurs] = useState<Record<string, unknown>>(() => reglagesEffectifs(auto.cle, auto.parametres));
  const [erreur, setErreur] = useState<string | null>(null);
  const champs = CHAMPS[auto.cle];
  const set = (c: string, v: unknown) => setValeurs((x) => ({ ...x, [c]: v }));

  function basculer(actif: boolean) {
    start(async () => {
      const r = await basculerAutomatisation(auto.cle, actif);
      if (!r.ok) toast.error(r.error);
      else toast.success(actif ? `« ${auto.nom} » activée` : `« ${auto.nom} » désactivée`);
      router.refresh();
    });
  }

  function lancer() {
    start(async () => {
      const res = await fetch(`/api/automations/${auto.cle}/run`, { method: "POST" });
      const corps = (await res.json().catch(() => ({}))) as { message?: string };
      if (res.ok) toast.success("Lancée. Le résultat apparaîtra ici dans un instant.");
      else toast.error(corps.message ?? "Lancement impossible.");
      router.refresh();
    });
  }

  function enregistrer() {
    const parsed = schemaParametres(auto.cle).safeParse(valeurs);
    if (!parsed.success) return setErreur(parsed.error.issues[0]?.message ?? "Réglages invalides");
    setErreur(null);
    start(async () => {
      const r = await modifierReglages(auto.cle, parsed.data);
      if (!r.ok) return setErreur(r.error);
      toast.success("Réglages enregistrés");
      setOuvert(false);
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{auto.nom}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{auto.description}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Switch checked={auto.actif} onCheckedChange={basculer} disabled={pending} label={`${auto.nom} : ${auto.actif ? "activée" : "désactivée"}`} />
          <span className="text-xs font-medium">{auto.actif ? "Activée" : "Désactivée"}</span>
        </div>
      </div>

      <div className="text-sm">
        {auto.dernier_statut ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatutExecution statut={auto.dernier_statut} />
            {auto.derniere_execution && <span className="text-muted-foreground">le {new Date(auto.derniere_execution).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" })}</span>}
          </p>
        ) : <p className="text-muted-foreground">Jamais exécutée</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={pending || !auto.actif} onClick={lancer} title={auto.actif ? undefined : "Activez l'automatisation pour la lancer"}>
          <Play className="h-4 w-4" />{pending ? "Veuillez patienter…" : "Lancer maintenant"}
        </Button>
        <ButtonLink variant="outline" size="sm" href={`/automatisations/${auto.cle}/historique`}><History className="h-4 w-4" />Historique</ButtonLink>
        {champs.length > 0 && <Button variant="ghost" size="sm" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}><Settings2 className="h-4 w-4" />Réglages</Button>}
      </div>

      {ouvert && (
        <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
          {champs.map((c) => (
            <div key={c} className={`space-y-2 ${c === "destinataires" ? "sm:col-span-2" : ""}`}>
              <Label htmlFor={`${auto.cle}-${c}`}>{LIBELLES_CHAMPS[c]}</Label>
              {c === "heure" && <Input id={`${auto.cle}-${c}`} type="time" value={String(valeurs[c] ?? "")} onChange={(e) => set(c, e.target.value)} />}
              {c === "jour_semaine" && (
                <Select id={`${auto.cle}-${c}`} value={String(valeurs[c])} onChange={(e) => set(c, Number(e.target.value))}>
                  {JOURS_SEMAINE.map((j, i) => <option key={j} value={i + 1}>{j}</option>)}
                </Select>
              )}
              {(c === "seuil_relance_jours" || c === "seuil_dlc_jours") && (
                <Input id={`${auto.cle}-${c}`} type="number" inputMode="numeric" min={1} max={30} value={String(valeurs[c] ?? "")} onChange={(e) => set(c, e.target.value === "" ? undefined : Number(e.target.value))} />
              )}
              {c === "canal" && (
                <Select id={`${auto.cle}-${c}`} value={String(valeurs[c])} onChange={(e) => set(c, e.target.value)}>
                  {CANAUX.map((k) => <option key={k} value={k}>{CANAL_LABELS[k]}</option>)}
                </Select>
              )}
              {c === "destinataires" && (
                <textarea id={`${auto.cle}-${c}`} rows={3} placeholder="E-mail ou identifiant Telegram" className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={((valeurs[c] as string[]) ?? []).join("\n")} onChange={(e) => set(c, e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))} />
              )}
            </div>
          ))}
          {erreur && <p role="alert" className="text-sm text-destructive sm:col-span-2">{erreur}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button size="sm" disabled={pending} onClick={enregistrer}>Enregistrer</Button>
            <Button size="sm" variant="ghost" onClick={() => setOuvert(false)}>Fermer</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

