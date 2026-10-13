"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { POLE_APPEL_LABELS } from "@/lib/appels/appels";

type Stats = {
  total: number;
  tauxTransfert: number | null;
  parJour: { jour: string; appels: number }[];
  parHeure: { heure: string; appels: number }[];
  parPole: { pole: string; appels: number }[];
};

// Couleurs d'identité des pôles (le nom est toujours affiché sur l'axe : la couleur n'est jamais seule).
const COULEURS_POLE: Record<string, string> = { restaurant: "#EA580C", minigolf: "#16A34A", aquatique: "#0284C7", autre: "#78716C" };
const nomPole = (p: string) => (p in POLE_APPEL_LABELS ? POLE_APPEL_LABELS[p as keyof typeof POLE_APPEL_LABELS] : "Non précisé");

const axe = { stroke: "hsl(var(--muted-foreground))", fontSize: 12, tickLine: false, axisLine: false } as const;
const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" };

function Carte({ titre, children, tableau }: { titre: string; children: React.ReactNode; tableau: { libelle: string; valeur: number }[] }) {
  return (
    <section aria-label={titre} className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 font-semibold">{titre}</h3>
      <div className="h-56">{children}</div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted-foreground">Voir en tableau</summary>
        <table className="mt-2 w-full">
          <thead><tr><th scope="col" className="text-left">Période</th><th scope="col" className="text-right">Appels</th></tr></thead>
          <tbody>{tableau.map((l) => <tr key={l.libelle}><td>{l.libelle}</td><td className="text-right">{l.valeur}</td></tr>)}</tbody>
        </table>
      </details>
    </section>
  );
}

export function AppelsCharts({ stats }: { stats: Stats }) {
  const jours = stats.parJour.map((j) => ({ ...j, label: new Date(`${j.jour}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) }));
  const poles = stats.parPole.map((p) => ({ ...p, label: nomPole(p.pole) }));
  const heures = stats.parHeure.filter((h, i) => h.appels > 0 || (i >= 8 && i <= 21));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4"><p className="text-3xl font-semibold">{stats.total}</p><p className="text-sm text-muted-foreground">Appels sur la période</p></div>
        <div className="rounded-lg border bg-card p-4"><p className="text-3xl font-semibold">{stats.tauxTransfert === null ? "—" : `${stats.tauxTransfert} %`}</p><p className="text-sm text-muted-foreground">Transférés à un humain</p></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Carte titre="Appels par jour" tableau={jours.map((j) => ({ libelle: j.label, valeur: j.appels }))}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={jours} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" {...axe} interval="preserveStartEnd" minTickGap={24} />
              <YAxis allowDecimals={false} {...axe} />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} formatter={(v) => [v, "Appels"]} />
              <Bar dataKey="appels" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </Carte>
        <Carte titre="Appels par heure" tableau={heures.map((h) => ({ libelle: h.heure, valeur: h.appels }))}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={heures} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="heure" {...axe} interval="preserveStartEnd" minTickGap={16} />
              <YAxis allowDecimals={false} {...axe} />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} formatter={(v) => [v, "Appels"]} />
              <Bar dataKey="appels" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </Carte>
        <Carte titre="Appels par pôle" tableau={poles.map((p) => ({ libelle: p.label, valeur: p.appels }))}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={poles} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 24 }}>
              <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" allowDecimals={false} {...axe} />
              <YAxis type="category" dataKey="label" width={90} {...axe} />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} formatter={(v) => [v, "Appels"]} />
              <Bar dataKey="appels" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {poles.map((p) => <Cell key={p.pole} fill={COULEURS_POLE[p.pole] ?? COULEURS_POLE.autre} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Carte>
      </div>
    </div>
  );
}
