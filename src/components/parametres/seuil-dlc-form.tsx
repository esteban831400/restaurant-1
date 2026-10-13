"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { enregistrerSeuilDlc } from "@/server/actions/parametres";

export function SeuilDlcForm({ jours }: { jours: number }) {
  const [valeur, setValeur] = useState(String(jours));
  const [pending, start] = useTransition();
  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        const r = await enregistrerSeuilDlc(Number(valeur));
        if (r.ok) toast.success("Seuil DLC enregistré"); else toast.error(r.error);
      });
    }}>
      <div>
        <label htmlFor="seuil-dlc" className="mb-1 block text-sm font-medium">Alerter à (jours avant la DLC)</label>
        <Input id="seuil-dlc" type="number" inputMode="numeric" min={1} max={30} className="w-40" value={valeur} onChange={(e) => setValeur(e.target.value)} />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
    </form>
  );
}
