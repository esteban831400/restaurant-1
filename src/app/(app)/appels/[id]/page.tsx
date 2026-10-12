import Link from "next/link";
import { notFound } from "next/navigation";
import { IssueBadge } from "@/components/appels/issue-badge";
import { Card } from "@/components/ui/card";
import { formatDuree, masquerNumero, POLE_APPEL_LABELS } from "@/lib/appels/appels";
import { getAppel } from "@/server/queries/appels";

export default async function PageAppel({ params }: { params: { id: string } }) {
  const a = await getAppel(params.id);
  if (!a) notFound();
  const lignes = (a.transcription ?? "").split(/\r?\n/).filter((l: string) => l.trim());

  return (
    <div className="space-y-6">
      <Link href="/appels" className="text-sm text-secondary hover:underline">← Retour au journal</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Appel du {new Date(a.date_appel).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" })}</h1>
        <IssueBadge issue={a.issue} />
      </div>
      <Card className="grid gap-2 p-4 text-sm sm:grid-cols-3">
        <p><strong>Numéro :</strong> {masquerNumero(a.numero)}</p>
        <p><strong>Durée :</strong> {formatDuree(a.duree_secondes)}</p>
        <p><strong>Pôle demandé :</strong> {a.pole ? POLE_APPEL_LABELS[a.pole as keyof typeof POLE_APPEL_LABELS] : "—"}</p>
      </Card>
      <section aria-labelledby="resume">
        <h2 id="resume" className="mb-2 text-lg font-semibold">Résumé</h2>
        <p>{a.resume ?? "Aucun résumé."}</p>
      </section>
      <section aria-labelledby="transcription">
        <h2 id="transcription" className="mb-2 text-lg font-semibold">Transcription</h2>
        {lignes.length === 0 ? <p className="text-muted-foreground">Aucune transcription enregistrée.</p> : (
          <div className="space-y-2 rounded-lg border bg-card p-4">{lignes.map((l: string, i: number) => <p key={i} className="whitespace-pre-wrap">{l}</p>)}</div>
        )}
      </section>
    </div>
  );
}
