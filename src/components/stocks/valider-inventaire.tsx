"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { validerInventaire } from "@/server/actions/stock";

export function ValiderInventaire({ inventaireId }: { inventaireId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button disabled={pending} onClick={() => start(async () => {
      const r = await validerInventaire(inventaireId);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Inventaire validé : les écarts ont été corrigés dans le stock");
      router.refresh();
    })}>
      {pending ? "Validation…" : "Valider et corriger le stock"}
    </Button>
  );
}
