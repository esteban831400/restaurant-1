"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { ActionResult } from "@/types/stock";

type Props = Omit<ButtonProps, "onClick"> & { action: () => Promise<ActionResult>; succes: string; enCours?: string };

/** Bouton qui lance une action serveur, affiche un toast de succès ou d'erreur, puis rafraîchit la page. */
export function ActionButton({ action, succes, enCours, children, disabled, ...props }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button {...props} disabled={disabled || pending} onClick={() => start(async () => {
      const r = await action();
      if (!r.ok) toast.error(r.error);
      else toast.success(succes);
      router.refresh();
    })}>
      {pending && enCours ? enCours : children}
    </Button>
  );
}
