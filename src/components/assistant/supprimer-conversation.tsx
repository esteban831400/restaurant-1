"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supprimerConversation } from "@/server/actions/assistant";

export function SupprimerConversation({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => {
      if (!window.confirm("Supprimer cette conversation ? Cette action est définitive.")) return;
      start(async () => {
        const r = await supprimerConversation(id);
        if (!r.ok) { toast.error(r.error); return; }
        toast.success("Conversation supprimée");
        router.replace("/assistant");
        router.refresh();
      });
    }}>
      <Trash2 className="h-4 w-4" />Supprimer
    </Button>
  );
}
