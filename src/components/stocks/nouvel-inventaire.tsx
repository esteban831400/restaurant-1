"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { creerInventaire } from "@/server/actions/stock";
import type { Pole } from "@/types/stock";

export function NouvelInventaire({ poles, poleParDefaut, choixPole }: { poles: Pole[]; poleParDefaut: string; choixPole: boolean }) {
  const router = useRouter();
  const [pole, setPole] = useState(poleParDefaut);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-end gap-3">
      {choixPole && (
        <div>
          <label htmlFor="pole-inv" className="mb-1 block text-sm font-medium">Pôle</label>
          <Select id="pole-inv" value={pole} onChange={(e) => setPole(e.target.value)}>
            {poles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </Select>
        </div>
      )}
      <Button
        disabled={pending || !pole}
        onClick={() => start(async () => {
          const r = await creerInventaire(pole);
          if (!r.ok) { toast.error(r.error); return; }
          router.push(`/stocks/inventaire/${r.data.id}`);
        })}
      >
        {pending ? "Création…" : "Démarrer un inventaire"}
      </Button>
    </div>
  );
}
