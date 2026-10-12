"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Complexe } from "@/lib/parametres/complexe";
import { verifierCouleurMarque } from "@/lib/theme";
import { enregistrerComplexe } from "@/server/actions/parametres";

function ChampCouleur({ id, label, valeur, onChange }: { id: string; label: string; valeur: string; onChange: (v: string) => void }) {
  const erreur = verifierCouleurMarque(valeur);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <input type="color" aria-label={`${label} : sélecteur`} value={/^#[0-9a-f]{6}$/i.test(valeur) ? valeur : "#000000"} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-12 w-14 cursor-pointer rounded-md border border-input bg-background p-1" />
        <Input id={id} value={valeur} onChange={(e) => onChange(e.target.value.toUpperCase())} maxLength={7} className="w-32 font-mono" aria-invalid={!!erreur} aria-describedby={erreur ? `${id}-erreur` : undefined} />
        <span className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-white" style={{ backgroundColor: erreur ? "#6b7280" : valeur }}>Aperçu</span>
      </div>
      {erreur && <p id={`${id}-erreur`} role="alert" className="text-sm text-destructive">{erreur}</p>}
    </div>
  );
}

export function ComplexeForm({ initial }: { initial: Complexe }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const fichier = useRef<HTMLInputElement>(null);

  async function televerser(f: File) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) return setErreur("Le logo doit être une image PNG, JPEG ou WebP.");
    if (f.size > 1_048_576) return setErreur("Le logo ne doit pas dépasser 1 Mo.");
    setErreur(null);
    setEnvoi(true);
    const supabase = createClient();
    const chemin = `logo-${Date.now()}.${f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg"}`;
    const { error } = await supabase.storage.from("public-assets").upload(chemin, f, { contentType: f.type, upsert: false });
    setEnvoi(false);
    if (error) return setErreur("L'envoi du logo a échoué. Réessayez.");
    setV((x) => ({ ...x, logo: supabase.storage.from("public-assets").getPublicUrl(chemin).data.publicUrl }));
  }

  function enregistrer() {
    setErreur(null);
    start(async () => {
      const r = await enregistrerComplexe(v);
      if (!r.ok) return setErreur(r.error);
      toast.success("Identité du complexe enregistrée");
      router.refresh();
    });
  }

  return (
    <form className="max-w-xl space-y-5" onSubmit={(e) => { e.preventDefault(); enregistrer(); }}>
      <div className="space-y-2">
        <Label htmlFor="nom-complexe">Nom du complexe</Label>
        <Input id="nom-complexe" value={v.nom} maxLength={80} onChange={(e) => setV({ ...v, nom: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="logo">Logo (PNG, JPEG ou WebP, 1 Mo maximum)</Label>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {v.logo ? <img src={v.logo} alt="Logo actuel" className="h-14 w-14 rounded border object-contain" /> : <span className="flex h-14 w-14 items-center justify-center rounded border border-dashed text-muted-foreground"><ImagePlus className="h-6 w-6" aria-hidden /></span>}
          <input ref={fichier} id="logo" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void televerser(f); e.target.value = ""; }} />
          <Button type="button" variant="outline" size="sm" disabled={envoi} onClick={() => fichier.current?.click()}>{envoi ? "Envoi…" : v.logo ? "Changer le logo" : "Ajouter un logo"}</Button>
          {v.logo && <Button type="button" variant="ghost" size="sm" onClick={() => setV({ ...v, logo: null })}><Trash2 className="h-4 w-4" />Retirer</Button>}
        </div>
      </div>
      <ChampCouleur id="couleur-principale" label="Couleur principale" valeur={v.couleur_principale} onChange={(c) => setV({ ...v, couleur_principale: c })} />
      <ChampCouleur id="couleur-secondaire" label="Couleur secondaire" valeur={v.couleur_secondaire} onChange={(c) => setV({ ...v, couleur_secondaire: c })} />
      {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
      <Button type="submit" disabled={pending || envoi}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
    </form>
  );
}
