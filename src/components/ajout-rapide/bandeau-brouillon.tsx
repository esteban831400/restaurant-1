import { Button } from "@/components/ui/button";

export function BandeauBrouillon({ visible, onRepartir }: { visible: boolean; onRepartir: () => void }) {
  if (!visible) return null;
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-600 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-100 sm:col-span-2">
      <span>Votre brouillon a été restauré.</span>
      <Button type="button" size="sm" variant="outline" onClick={onRepartir}>Repartir de zéro</Button>
    </div>
  );
}
