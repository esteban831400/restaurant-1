"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { JOURS, POLES_CLES, SAISONS, SAISON_LABELS, fermetureSchema, type Fermeture, type Horaires, type PoleCle, type Saisons } from "@/lib/parametres/horaires";
import { enregistrerFermetures, enregistrerHoraires } from "@/server/actions/parametres";

const POLE_NOMS: Record<PoleCle, string> = { restaurant: "Restaurant", minigolf: "Mini-golf", aquatique: "Aires de jeux aquatiques" };
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function HorairesForm({ horaires: h0, saisons: s0, fermetures: f0 }: { horaires: Horaires; saisons: Saisons; fermetures: Fermeture[] }) {
  const [horaires, setHoraires] = useState(h0);
  const [saisons, setSaisons] = useState(s0);
  const [pole, setPole] = useState<PoleCle>("restaurant");
  const [fermetures, setFermetures] = useState(f0);
  const [nouvelle, setNouvelle] = useState({ pole: "tous", du: "", au: "", motif: "" });
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreurFermeture, setErreurFermeture] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const maj = (saison: (typeof SAISONS)[number], jour: (typeof JOURS)[number], champ: "ouvert" | "de" | "a", v: boolean | string) =>
    setHoraires((x) => ({ ...x, [pole]: { ...x[pole], [saison]: { ...x[pole][saison], [jour]: { ...x[pole][saison][jour], [champ]: v } } } }));

  function enregistrer() {
    setErreur(null);
    start(async () => {
      const r = await enregistrerHoraires({ horaires, saisons });
      if (!r.ok) return setErreur(r.error);
      toast.success("Horaires enregistrés");
    });
  }

  function sauverFermetures(liste: Fermeture[], message: string) {
    start(async () => {
      const r = await enregistrerFermetures(liste);
      if (!r.ok) { toast.error(r.error); return; }
      setFermetures(liste);
      toast.success(message);
    });
  }

  function ajouterFermeture() {
    const f = { ...nouvelle, id: crypto.randomUUID() };
    const check = fermetureSchema.safeParse(f);
    if (!check.success) return setErreurFermeture(check.error.issues[0]?.message ?? "Fermeture invalide");
    setErreurFermeture(null);
    setNouvelle({ pole: "tous", du: "", au: "", motif: "" });
    sauverFermetures([...fermetures, check.data].sort((a, b) => a.du.localeCompare(b.du)), "Fermeture ajoutée");
  }

  return (
    <div className="space-y-10">
      <section aria-labelledby="saisons">
        <h2 id="saisons" className="mb-1 text-lg font-semibold">Saisons</h2>
        <p className="mb-3 text-sm text-muted-foreground">La haute saison s&apos;applique chaque année entre ces deux dates (format MM-JJ, par exemple 06-15). Le reste de l&apos;année est la basse saison.</p>
        <div className="flex flex-wrap gap-4">
          <div><Label htmlFor="haute-du">Début de la haute saison</Label><Input id="haute-du" className="w-32" value={saisons.haute_du} placeholder="06-15" onChange={(e) => setSaisons({ ...saisons, haute_du: e.target.value })} /></div>
          <div><Label htmlFor="haute-au">Fin de la haute saison</Label><Input id="haute-au" className="w-32" value={saisons.haute_au} placeholder="09-15" onChange={(e) => setSaisons({ ...saisons, haute_au: e.target.value })} /></div>
        </div>
      </section>

      <section aria-labelledby="horaires">
        <h2 id="horaires" className="mb-3 text-lg font-semibold">Horaires d&apos;ouverture</h2>
        <div role="tablist" aria-label="Pôle" className="mb-4 flex flex-wrap gap-2">
          {POLES_CLES.map((p) => (
            <button key={p} role="tab" type="button" aria-selected={pole === p} onClick={() => setPole(p)} className={`rounded-full border px-4 py-2 text-sm font-medium ${pole === p ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{POLE_NOMS[p]}</button>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {SAISONS.map((saison) => (
            <fieldset key={saison} className="rounded-lg border p-4">
              <legend className="px-2 font-semibold">{SAISON_LABELS[saison]}</legend>
              <ul className="space-y-2">
                {JOURS.map((jour) => {
                  const c = horaires[pole][saison][jour];
                  return (
                    <li key={jour} className="grid grid-cols-[6.5rem_1fr] items-center gap-2 sm:grid-cols-[6.5rem_5.5rem_1fr]">
                      <label className="flex items-center gap-2 font-medium"><input type="checkbox" className="h-5 w-5" checked={c.ouvert} onChange={(e) => maj(saison, jour, "ouvert", e.target.checked)} />{majuscule(jour)}</label>
                      {c.ouvert ? (
                        <div className="col-span-1 flex items-center gap-2 sm:col-span-2">
                          <Input type="time" aria-label={`${majuscule(jour)}, ouverture`} className="h-10 w-28" value={c.de} onChange={(e) => maj(saison, jour, "de", e.target.value)} />
                          <span aria-hidden>→</span>
                          <Input type="time" aria-label={`${majuscule(jour)}, fermeture`} className="h-10 w-28" value={c.a} onChange={(e) => maj(saison, jour, "a", e.target.value)} />
                        </div>
                      ) : <span className="col-span-1 text-muted-foreground sm:col-span-2">Fermé</span>}
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ))}
        </div>
        {erreur && <p role="alert" className="mt-3 text-sm text-destructive">{erreur}</p>}
        <Button className="mt-4" disabled={pending} onClick={enregistrer}>{pending ? "Enregistrement…" : "Enregistrer les horaires"}</Button>
      </section>

      <section aria-labelledby="fermetures">
        <h2 id="fermetures" className="mb-1 text-lg font-semibold">Fermetures exceptionnelles</h2>
        <p className="mb-3 text-sm text-muted-foreground">Jours fériés, travaux, intempéries… Une fermeture l&apos;emporte sur les horaires normaux (et sera annoncée par le standard téléphonique).</p>
        {fermetures.length === 0 ? <p className="mb-4 rounded-lg border border-dashed p-4 text-center text-muted-foreground">Aucune fermeture prévue.</p> : (
          <ul className="mb-4 divide-y rounded-lg border">
            {fermetures.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span><strong>{f.motif}</strong> — {f.pole === "tous" ? "tous les pôles" : POLE_NOMS[f.pole]}<span className="block text-sm text-muted-foreground">du {new Date(`${f.du}T12:00:00`).toLocaleDateString("fr-FR")} au {new Date(`${f.au}T12:00:00`).toLocaleDateString("fr-FR")}</span></span>
                <Button variant="ghost" size="icon" aria-label={`Supprimer la fermeture ${f.motif}`} disabled={pending} onClick={() => sauverFermetures(fermetures.filter((x) => x.id !== f.id), "Fermeture supprimée")}><Trash2 className="h-5 w-5" /></Button>
              </li>
            ))}
          </ul>
        )}
        <form className="grid max-w-3xl gap-3 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); ajouterFermeture(); }}>
          <div className="space-y-1"><Label htmlFor="f-pole">Pôle</Label><Select id="f-pole" value={nouvelle.pole} onChange={(e) => setNouvelle({ ...nouvelle, pole: e.target.value })}><option value="tous">Tous</option>{POLES_CLES.map((p) => <option key={p} value={p}>{POLE_NOMS[p]}</option>)}</Select></div>
          <div className="space-y-1"><Label htmlFor="f-du">Du</Label><Input id="f-du" type="date" value={nouvelle.du} onChange={(e) => setNouvelle({ ...nouvelle, du: e.target.value, au: nouvelle.au || e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="f-au">Au</Label><Input id="f-au" type="date" value={nouvelle.au} onChange={(e) => setNouvelle({ ...nouvelle, au: e.target.value })} /></div>
          <div className="space-y-1"><Label htmlFor="f-motif">Motif</Label><Input id="f-motif" value={nouvelle.motif} onChange={(e) => setNouvelle({ ...nouvelle, motif: e.target.value })} placeholder="Jour férié" /></div>
          {erreurFermeture && <p role="alert" className="text-sm text-destructive sm:col-span-4">{erreurFermeture}</p>}
          <div className="sm:col-span-4"><Button type="submit" variant="secondary" disabled={pending}>Ajouter la fermeture</Button></div>
        </form>
      </section>
    </div>
  );
}
