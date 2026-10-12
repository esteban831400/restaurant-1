"use client";

import { Modal } from "@/components/ui/modal";
import { AIDE_RACCOURCIS } from "@/lib/raccourcis";

export function AideRaccourcis({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} titre="Raccourcis clavier">
      <dl className="divide-y">
        {AIDE_RACCOURCIS.map((r) => (
          <div key={r.libelle} className="flex items-center justify-between gap-4 py-2.5">
            <dt>{r.libelle}</dt>
            <dd className="flex shrink-0 items-center gap-1">
              {r.touches.map((t) => <kbd key={t} className="rounded border bg-muted px-2 py-1 font-mono text-xs">{t}</kbd>)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-muted-foreground">Les raccourcis à une touche sont désactivés pendant la saisie dans un champ.</p>
    </Modal>
  );
}
