"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { TYPE_LABELS } from "@/lib/stock/alertes";
import { mouvementSchema, TYPES_MOUVEMENT, type MouvementValues } from "@/lib/validators/stock";
import { enregistrerMouvement } from "@/server/actions/stock";

type Props = {
  produit: { id: string; nom: string; unite: string; dlc_suivie: boolean } | null;
  typeInitial: (typeof TYPES_MOUVEMENT)[number];
  onClose: () => void;
};

export function MouvementDialog({ produit, typeInitial, onClose }: Props) {
  return (
    <Modal open={!!produit} onClose={onClose} titre={produit ? `Mouvement — ${produit.nom}` : ""}>
      {produit && <FormulaireMouvement key={`${produit.id}-${typeInitial}`} produit={produit} typeInitial={typeInitial} onClose={onClose} />}
    </Modal>
  );
}

export function FormulaireMouvement({ produit, typeInitial, onClose }: { produit: NonNullable<Props["produit"]>; typeInitial: Props["typeInitial"]; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const {
    register, handleSubmit, watch,
    formState: { errors },
  } = useForm<MouvementValues>({
    resolver: zodResolver(mouvementSchema),
    defaultValues: { produit_id: produit.id, type: typeInitial, motif: "", dlc: "" },
  });
  const type = watch("type");

  const onSubmit = (values: MouvementValues) =>
    start(async () => {
      setErreur(null);
      const r = await enregistrerMouvement(values);
      if (!r.ok) return setErreur(r.error);
      toast.success("Mouvement enregistré");
      onClose();
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="type">Type de mouvement</Label>
        <Select id="type" {...register("type")}>
          {TYPES_MOUVEMENT.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="quantite">
          {type === "correction" ? `Écart à appliquer (${produit.unite}, + ou −)` : `Quantité (${produit.unite})`}
        </Label>
        <Input id="quantite" type="number" inputMode="decimal" step="any" autoFocus {...register("quantite", { valueAsNumber: true })} />
        {errors.quantite && <p role="alert" className="text-sm text-destructive">{errors.quantite.message}</p>}
      </div>
      {type === "entree" && produit.dlc_suivie && (
        <div className="space-y-2">
          <Label htmlFor="dlc">Date limite de consommation</Label>
          <Input id="dlc" type="date" {...register("dlc")} />
          {errors.dlc && <p role="alert" className="text-sm text-destructive">{errors.dlc.message}</p>}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="motif">Motif{type === "perte" || type === "correction" ? "" : " (facultatif)"}</Label>
        <Input id="motif" {...register("motif")} />
        {errors.motif && <p role="alert" className="text-sm text-destructive">{errors.motif.message}</p>}
      </div>
      {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
    </form>
  );
}
