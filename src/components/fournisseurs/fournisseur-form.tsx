"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { fournisseurSchema, type FournisseurValues } from "@/lib/validators/commande";
import { creerFournisseur, modifierFournisseur } from "@/server/actions/commandes";
import type { Pole } from "@/types/stock";

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function JoursPicker({ legende, valeur, onChange }: { legende: string; valeur: number[]; onChange: (v: number[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legende}</legend>
      <div className="flex flex-wrap gap-2">
        {JOURS.map((j, i) => {
          const n = i + 1;
          const actif = valeur.includes(n);
          return (
            <button key={j} type="button" aria-pressed={actif} onClick={() => onChange(actif ? valeur.filter((x) => x !== n) : [...valeur, n].sort())}
              className={`h-11 min-w-12 rounded-md border px-3 text-sm font-medium ${actif ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>
              {j}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

type Props = { poles: Pole[]; choixPole: boolean; fournisseurId?: string; valeurs?: Partial<FournisseurValues> };

export function FournisseurForm({ poles, choixPole, fournisseurId, valeurs }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const defaults: FournisseurValues = { nom: "", contact: "", email: "", telephone: "", mode_commande: "mail", jours_commande: [], jours_livraison: [], delai_jours: 2, minimum_commande: 0, pole_id: null, notes: "", ...valeurs };
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FournisseurValues>({ resolver: zodResolver(fournisseurSchema), defaultValues: defaults });
  const num = { valueAsNumber: true } as const;

  const soumettre = (autre: boolean) => handleSubmit((values) => start(async () => {
    setErreur(null);
    const payload = { ...values, pole_id: values.pole_id || null };
    let destination = "/fournisseurs";
    if (fournisseurId) {
      const r = await modifierFournisseur(fournisseurId, payload);
      if (!r.ok) return setErreur(r.error);
      destination = `/fournisseurs/${fournisseurId}`;
    } else {
      const r = await creerFournisseur(payload);
      if (!r.ok) return setErreur(r.error);
      destination = `/fournisseurs/${r.data.id}`;
    }
    toast.success(fournisseurId ? "Fournisseur modifié" : "Fournisseur créé");
    if (autre) reset({ ...defaults, mode_commande: values.mode_commande, pole_id: values.pole_id });
    else router.push(destination);
    router.refresh();
  }));

  const champ = (id: keyof FournisseurValues, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, reg: object = {}) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} {...register(id as never, reg)} />
      {errors[id] && <p role="alert" className="text-sm text-destructive">{String(errors[id]?.message)}</p>}
    </div>
  );

  return (
    <form onSubmit={soumettre(false)} className="grid max-w-2xl gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">{champ("nom", "Nom du fournisseur", { autoFocus: true })}</div>
      {champ("contact", "Personne à contacter")}
      {champ("telephone", "Téléphone", { type: "tel", inputMode: "tel" })}
      <div className="sm:col-span-2">{champ("email", "Adresse e-mail", { type: "email" })}</div>
      <div className="space-y-2">
        <Label htmlFor="mode_commande">Mode de commande</Label>
        <Select id="mode_commande" {...register("mode_commande")}>
          <option value="mail">Par e-mail</option><option value="telephone">Par téléphone</option><option value="portail">Via un portail</option>
        </Select>
      </div>
      {choixPole && (
        <div className="space-y-2">
          <Label htmlFor="pole_id">Pôle</Label>
          <Select id="pole_id" {...register("pole_id")}>
            <option value="">Commun à tous les pôles</option>
            {poles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </Select>
        </div>
      )}
      <JoursPicker legende="Jours de commande" valeur={watch("jours_commande") ?? []} onChange={(v) => setValue("jours_commande", v)} />
      <JoursPicker legende="Jours de livraison" valeur={watch("jours_livraison") ?? []} onChange={(v) => setValue("jours_livraison", v)} />
      {champ("delai_jours", "Délai de livraison (jours)", { type: "number", inputMode: "numeric" }, num)}
      {champ("minimum_commande", "Minimum de commande (€)", { type: "number", inputMode: "decimal", step: "any" }, num)}
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea id="notes" rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register("notes")} />
      </div>
      {erreur && <p role="alert" className="text-sm text-destructive sm:col-span-2">{erreur}</p>}
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
        {!fournisseurId && <Button type="button" variant="outline" disabled={pending} onClick={soumettre(true)}>Enregistrer et ajouter un autre</Button>}
        <Button type="button" variant="ghost" onClick={() => router.back()}>Annuler</Button>
      </div>
    </form>
  );
}
