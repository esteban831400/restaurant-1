"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const nombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const axe = { stroke: "hsl(var(--muted-foreground))", fontSize: 12, tickLine: false, axisLine: false } as const;
const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" };

type Props = {
  valeurStock: { jour: string; valeur: number }[];
  top: { produit_id: string; nom: string; unite: string; quantite: number; valeur: number }[];
};

function Carte({ titre, sousTitre, vide, children, tableau }: { titre: string; sousTitre: string; vide: boolean; children: React.ReactNode; tableau: React.ReactNode }) {
  return (
    <section aria-label={titre} className="rounded-lg border bg-card p-4">
      <h2 className="font-semibold">{titre}</h2>
      <p className="mb-3 text-sm text-muted-foreground">{sousTitre}</p>
      {vide ? <p className="rounded-md border border-dashed p-8 text-center text-muted-foreground">Pas encore de données.</p> : <div className="h-64">{children}</div>}
      {!vide && <details className="mt-2 text-sm"><summary className="cursor-pointer text-muted-foreground">Voir en tableau</summary>{tableau}</details>}
    </section>
  );
}

export function DashboardCharts({ valeurStock, top }: Props) {
  const serie = valeurStock.map((v) => ({ ...v, label: new Date(`${v.jour}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) }));
  const premier = serie[0]?.valeur ?? 0;
  const dernier = serie[serie.length - 1]?.valeur ?? 0;
  const variation = dernier - premier;
  const aucuneValeur = serie.every((s) => s.valeur === 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Carte
        titre="Valeur du stock" vide={aucuneValeur}
        sousTitre={`30 derniers jours · ${euro.format(dernier)} (${variation >= 0 ? "+" : "−"}${euro.format(Math.abs(variation))})`}
        tableau={<table className="mt-2 w-full"><thead><tr><th scope="col" className="text-left">Jour</th><th scope="col" className="text-right">Valeur</th></tr></thead><tbody>{serie.slice().reverse().map((s) => <tr key={s.jour}><td>{s.label}</td><td className="text-right">{euro.format(s.valeur)}</td></tr>)}</tbody></table>}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={serie} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" {...axe} interval="preserveStartEnd" minTickGap={32} />
            <YAxis {...axe} width={64} tickFormatter={(v: number) => euro.format(v)} domain={["auto", "auto"]} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 3" }} formatter={(v) => [euro.format(Number(v)), "Valeur du stock"]} />
            <Line type="monotone" dataKey="valeur" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--card))" }} />
          </LineChart>
        </ResponsiveContainer>
      </Carte>

      <Carte
        titre="Produits les plus consommés" vide={top.length === 0} sousTitre="30 derniers jours · classés par valeur consommée"
        tableau={<table className="mt-2 w-full"><thead><tr><th scope="col" className="text-left">Produit</th><th scope="col" className="text-right">Quantité</th><th scope="col" className="text-right">Valeur</th></tr></thead><tbody>{top.map((t) => <tr key={t.produit_id}><td>{t.nom}</td><td className="text-right">{nombre.format(t.quantite)} {t.unite}</td><td className="text-right">{euro.format(t.valeur)}</td></tr>)}</tbody></table>}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
            <XAxis type="number" {...axe} tickFormatter={(v: number) => euro.format(v)} />
            <YAxis type="category" dataKey="nom" width={110} {...axe} interval={0} />
            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle}
              formatter={(v, _n, item) => [`${euro.format(Number(v))} (${nombre.format((item.payload as Props["top"][number]).quantite)} ${(item.payload as Props["top"][number]).unite})`, "Consommé"]} />
            <Bar dataKey="valeur" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </Carte>
    </div>
  );
}
