"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { open: boolean; onClose: () => void; titre: string; children: React.ReactNode };

/** Panneau latéral accessible basé sur <dialog> (focus piégé, Échap pour fermer, plein écran sur téléphone). */
export function Drawer({ open, onClose, titre, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} onClose={onClose} aria-label={titre}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="m-0 ml-auto h-full max-h-full w-full max-w-xl bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/50">
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-2 border-b px-5 py-4">
            <h2 className="text-lg font-semibold">{titre}</h2>
            <Button variant="ghost" size="icon" aria-label="Fermer le panneau" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
