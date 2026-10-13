import Link from "next/link";
import { AppelsCharts } from "@/components/appels/appels-charts";
import { IssueBadge } from "@/components/appels/issue-badge";
import { RetentionForm } from "@/components/appels/retention-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { formatDuree, ISSUE_LABELS, ISSUES, masquerNumero, POLE_APPEL_LABELS } from "@/lib/appels/appels";
import { listAppels, PAGE_SIZE, retentionJours, statistiques } from "@/server/queries/appels";

type Props = { searchParams: { du?: string; au?: string; pole?: string; issue?: string; periode?: string; page?: string } };

export default async function PageAppels({ searchParams }: Props) {
  const periode = [7, 30, 90].includes(Number(searchParams.periode)) ? Number(searchParams.periode) : 30;
  const [{ appels, total, page, error }, stats, retention] = await Promise.all([
    listAppels({ du: searchParams.du, au: searchParams.au, pole: searchParams.pole, issue: searchParams.issue, page: Number(searchParams.page) || 1 }),
    statistiques(periode),
    retentionJours(),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Journal des appels IA</h1>

      <section aria-labelledby="stats">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="stats" className="text-lg font-semibold">Statistiques</h2>
          <nav aria-label="Période des statistiques" className="flex gap-2">
            {[7, 30, 90].map((j) => (
              <Link key={j} href={{ query: { ...searchParams, periode: j, page: undefined } }} aria-current={j === periode ? "true" : undefined}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${j === periode ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                {j} jours
              </Link>
            ))}
          </nav>
        </div>
        <AppelsCharts stats={stats} />
      </section>

      <section aria-labelledby="liste">
        <h2 id="liste" className="mb-3 text-lg font-semibold">Appels</h2>
        <form role="search" className="mb-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="periode" value={periode} />
          <div><label htmlFor="du" className="mb-1 block text-sm font-medium">Du</label><Input id="du" name="du" type="date" defaultValue={searchParams.du} /></div>
          <div><label htmlFor="au" className="mb-1 block text-sm font-medium">Au</label><Input id="au" name="au" type="date" defaultValue={searchParams.au} /></div>
          <div>
            <label htmlFor="pole" className="mb-1 block text-sm font-medium">Pôle</label>
            <Select id="pole" name="pole" defaultValue={searchParams.pole ?? ""}>
              <option value="">Tous</option>
              {Object.entries(POLE_APPEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="issue" className="mb-1 block text-sm font-medium">Issue</label>
            <Select id="issue" name="issue" defaultValue={searchParams.issue ?? ""}>
              <option value="">Toutes</option>
              {ISSUES.map((i) => <option key={i} value={i}>{ISSUE_LABELS[i]}</option>)}
            </Select>
          </div>
          <Button type="submit">Filtrer</Button>
        </form>
        {error && <p role="alert" className="mb-3 text-destructive">Impossible de charger les appels. Réessayez.</p>}
        {appels.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Aucun appel pour ces critères.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted"><tr>{["Date", "Numéro", "Durée", "Pôle", "Issue", "Résumé"].map((h) => <th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {appels.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="whitespace-nowrap px-3 py-3"><Link href={`/appels/${a.id}`} className="font-medium text-secondary hover:underline">{new Date(a.date_appel).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" })}</Link></td>
                    <td className="whitespace-nowrap px-3 py-3">{masquerNumero(a.numero)}</td>
                    <td className="whitespace-nowrap px-3 py-3">{formatDuree(a.duree_secondes)}</td>
                    <td className="px-3 py-3">{a.pole ? POLE_APPEL_LABELS[a.pole as keyof typeof POLE_APPEL_LABELS] : "—"}</td>
                    <td className="px-3 py-3"><IssueBadge issue={a.issue} /></td>
                    <td className="max-w-xs truncate px-3 py-3 text-muted-foreground">{a.resume ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/appels" params={{ du: searchParams.du, au: searchParams.au, pole: searchParams.pole, issue: searchParams.issue, periode: String(periode) }} />
      </section>

      <section aria-labelledby="rgpd" className="rounded-lg border bg-card p-4">
        <h2 id="rgpd" className="mb-1 text-lg font-semibold">Conservation des données (RGPD)</h2>
        <p className="mb-3 text-sm text-muted-foreground">Les appels plus anciens sont supprimés automatiquement chaque nuit. Les numéros sont masqués à l&apos;affichage.</p>
        <RetentionForm jours={retention} />
      </section>
    </div>
  );
}
