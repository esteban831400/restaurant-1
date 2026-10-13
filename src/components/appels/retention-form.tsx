"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { modifierRetention } from "@/server/actions/appels";

export function RetentionForm({ jours }: { jours: number }) {
  const [valeur, setValeur] = useState(String(jours));
  const [pending, start] = useTransition();
  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        const r = await modifierRetention(Number(valeur));
        if (r.ok) toast.success("Durée de conservation enregistrée");
        else toast.error(r.error);
      });
    }}>
      <div>
        <label htmlFor="retention" className="mb-1 block text-sm font-medium">Conserver les appels pendant (jours)</label>
        <Input id="retention" type="number" inputMode="numeric" min={7} max={3650} className="w-40" value={valeur} onChange={(e) => setValeur(e.target.value)} />
      </div>
      <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
    </form>
  );
}
