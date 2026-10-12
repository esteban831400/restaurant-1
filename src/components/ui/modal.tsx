"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { open: boolean; onClose: () => void; titre: string; children: React.ReactNode };

/** Modale accessible basée sur <dialog> (focus piégé, Échap pour fermer). */
export function Modal({ open, onClose, titre, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border bg-card p-0 text-card-foreground backdrop:bg-black/50"
    >
      {open && (
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{titre}</h2>
            <Button variant="ghost" size="icon" aria-label="Fermer" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
