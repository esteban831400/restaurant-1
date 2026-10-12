"use client";

import { useMemo, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { commandeSchema, type CommandeValues } from "@/lib/validators/commande";
import { creerCommande, modifierCommande } from "@/server/actions/commandes";
import type { FournisseurOption, Pole } from "@/types/stock";

type ProduitOption = { id: string; nom: string; unite: string; prix_achat: number; qte_reappro: number; fournisseur_id: string | null; pole_id: string };
type Props = {
  poles: Pole[]; fournisseurs: FournisseurOption[]; produits: ProduitOption[];
  poleParDefaut: string; poleFixe: boolean; commandeId?: string; valeurs?: Partial<CommandeValues>;
};

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function CommandeForm({ poles, fournisseurs, produits, poleParDefaut, poleFixe, commandeId, valeurs }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CommandeValues>({
    resolver: zodResolver(commandeSchema),
    defaultValues: { fournisseur_id: "", pole_id: poleParDefaut, date_livraison_prevue: "", lignes: [], ...valeurs },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lignes" });
  const fournisseurId = watch("fournisseur_id");
  const poleId = watch("pole_id");
  const lignes = watch("lignes");

  // Produits du pôle ; ceux du fournisseur choisi d'abord.
  const disponibles = useMemo(
    () => produits.filter((p) => p.pole_id === poleId).sort((a, b) => Number(b.fournisseur_id === fournisseurId) - Number(a.fournisseur_id === fournisseurId) || a.nom.localeCompare(b.nom, "fr")),
    [produits, poleId, fournisseurId],
  );
  const parId = useMemo(() => new Map(produits.map((p) => [p.id, p])), [produits]);
  const total = lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (parId.get(l.produit_id)?.prix_achat ?? 0), 0);

  function ajouterTousLesProduitsDuFournisseur() {
    const deja = new Set(lignes.map((l) => l.produit_id));
    disponibles.filter((p) => p.fournisseur_id === fournisseurId && !deja.has(p.id)).forEach((p) => append({ produit_id: p.id, quantite: p.qte_reappro || 1 }));
  }

  const onSubmit = (values: CommandeValues) =>
    start(async () => {
      setErreur(null);
      let destination = commandeId ?? "";
      if (commandeId) {
        const r = await modifierCommande(commandeId, values);
        if (!r.ok) return setErreur(r.error);
      } else {
        const r = await creerCommande(values);
        if (!r.ok) return setErreur(r.error);
        destination = r.data.id;
      }
      toast.success(commandeId ? "Commande modifiée" : "Brouillon enregistré");
      router.push(`/commandes/${destination}`);
      router.refresh();
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="fournisseur_id">Fournisseur</Label>
          <Select id="fournisseur_id" {...register("fournisseur_id")}>
            <option value="">Choisir…</option>
            {fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </Select>
          {errors.fournisseur_id && <p role="alert" className="text-sm text-destructive">{errors.fournisseur_id.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="pole_id">Pôle</Label>
          <Select id="pole_id" disabled={poleFixe || !!commandeId} {...register("pole_id", { onChange: () => setValue("lignes", []) })}>
            {poles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date_livraison_prevue">Livraison souhaitée</Label>
          <Input id="date_livraison_prevue" type="date" {...register("date_livraison_prevue")} />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">Produits</legend>
        {fields.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">Aucun produit. Ajoutez-en ci-dessous.</p>}
        {fields.map((f, i) => {
          const p = parId.get(lignes[i]?.produit_id ?? "");
          return (
            <div key={f.id} className="grid grid-cols-[1fr_7rem_auto] items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor={`produit-${i}`}>Produit</Label>
                <Select id={`produit-${i}`} {...register(`lignes.${i}.produit_id`)}>
                  <option value="">Choisir…</option>
                  {disponibles.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`qte-${i}`}>Qté{p ? ` (${p.unite})` : ""}</Label>
                <Input id={`qte-${i}`} type="number" inputMode="decimal" step="any" {...register(`lignes.${i}.quantite`, { valueAsNumber: true })} />
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Retirer ce produit" onClick={() => remove(i)}><Trash2 className="h-5 w-5" /></Button>
            </div>
          );
        })}
        {errors.lignes && <p role="alert" className="text-sm text-destructive">{errors.lignes.message ?? errors.lignes.root?.message ?? "Vérifiez les lignes de la commande"}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => append({ produit_id: "", quantite: 1 })}><Plus className="h-4 w-4" />Ajouter un produit</Button>
          {fournisseurId && <Button type="button" variant="outline" onClick={ajouterTousLesProduitsDuFournisseur}>Ajouter les produits du fournisseur</Button>}
        </div>
      </fieldset>

      <p className="text-lg font-semibold">Total estimé : {euro.format(total)}</p>
      {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer le brouillon"}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Annuler</Button>
      </div>
    </form>
  );
}
