"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { dupliquerDerniereCommande } from "@/server/actions/commandes";

export function DupliquerCommande({ fournisseurId }: { fournisseurId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" disabled={pending} onClick={() => start(async () => {
      const r = await dupliquerDerniereCommande(fournisseurId);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Brouillon créé à partir de la dernière commande");
      router.push(`/commandes/${r.data.id}`);
    })}>
      <Copy className="h-5 w-5" />Dupliquer la dernière commande
    </Button>
  );
}
