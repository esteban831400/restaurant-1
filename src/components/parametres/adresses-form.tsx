"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enregistrerAdresses } from "@/server/actions/parametres";

type Ligne = { cle: string; nom: string; url: string };

export function AdressesForm({ lignes }: { lignes: Ligne[] }) {
  const [valeurs, setValeurs] = useState(() => Object.fromEntries(lignes.map((l) => [l.cle, l.url])));
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="max-w-2xl space-y-4" onSubmit={(e) => {
      e.preventDefault();
      setErreur(null);
      start(async () => {
        const r = await enregistrerAdresses(valeurs);
        if (!r.ok) return setErreur(r.error);
        toast.success("Adresses enregistrées");
      });
    }}>
      {lignes.map((l) => (
        <div key={l.cle} className="space-y-2">
          <Label htmlFor={`adr-${l.cle}`}>{l.nom}</Label>
          <Input id={`adr-${l.cle}`} type="url" inputMode="url" placeholder="https://…" value={valeurs[l.cle] ?? ""} onChange={(e) => setValeurs({ ...valeurs, [l.cle]: e.target.value })} />
        </div>
      ))}
      {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer les adresses"}</Button>
    </form>
  );
}
