"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BandeauBrouillon } from "@/components/ajout-rapide/bandeau-brouillon";
import { useOutils } from "@/components/ajout-rapide/contexte";
import { ecrireDernierFournisseur, lireDernierFournisseur, stockageSur } from "@/lib/brouillon";
import { useBrouillon } from "@/lib/hooks/use-brouillon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { produitSchema, type ProduitValues } from "@/lib/validators/stock";
import { creerProduit, modifierProduit } from "@/server/actions/stock";
import type { FournisseurOption, Pole } from "@/types/stock";

type Props = {
  poles: Pole[];
  fournisseurs: FournisseurOption[];
  poleParDefaut: string;
  poleFixe: boolean;
  produitId?: string;
  valeurs?: Partial<ProduitValues>;
  onTermine?: () => void;
};

function Champ({ id, label, erreur, children }: { id: string; label: string; erreur?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
    </div>
  );
}

export function ProduitForm({ poles, fournisseurs, poleParDefaut, poleFixe, produitId, valeurs, onTermine }: Props) {
  const { utilisateur } = useOutils();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const defaults: ProduitValues = {
    nom: "", categorie: "", unite: "kg", lieu_stockage: "", fournisseur_id: null, pole_id: poleParDefaut,
    prix_achat: 0, seuil_min: 0, qte_reappro: 0, dlc_suivie: false, ...valeurs,
  };
  const form = useForm<ProduitValues>({ resolver: zodResolver(produitSchema), defaultValues: defaults });
  const { register, handleSubmit, reset, setValue, getValues, formState: { errors } } = form;
  // Formulaire prérempli : dernier fournisseur utilisé (un brouillon restauré passe avant)
  useEffect(() => {
    if (produitId || getValues("fournisseur_id")) return;
    const dernier = lireDernierFournisseur(stockageSur(), utilisateur.id);
    if (dernier && fournisseurs.some((f) => f.id === dernier)) setValue("fournisseur_id", dernier);
  }, [produitId, fournisseurs, getValues, setValue, utilisateur.id]);
  const brouillon = useBrouillon("produit", form, !produitId);
  const num = { valueAsNumber: true } as const;

  const soumettre = (autre: boolean) =>
    handleSubmit((values) =>
      start(async () => {
        setErreur(null);
        const payload = { ...values, fournisseur_id: values.fournisseur_id || null };
        const r = produitId ? await modifierProduit(produitId, payload) : await creerProduit(payload);
        if (!r.ok) return setErreur(r.error);
        toast.success(produitId ? "Produit modifié" : "Produit créé");
        brouillon.effacer();
        ecrireDernierFournisseur(stockageSur(), utilisateur.id, values.fournisseur_id);
        if (autre) reset({ ...defaults, fournisseur_id: values.fournisseur_id, categorie: values.categorie, unite: values.unite, lieu_stockage: values.lieu_stockage, nom: "" });
        else if (onTermine) onTermine();
        else router.push(produitId ? `/stocks/produits/${produitId}` : "/stocks");
        router.refresh();
      }),
    );

  return (
    <form onSubmit={soumettre(false)} className="grid max-w-2xl gap-4 sm:grid-cols-2" noValidate>
      <BandeauBrouillon visible={brouillon.restaure} onRepartir={() => { reset(defaults); brouillon.effacer(); }} />
      <div className="sm:col-span-2">
        <Champ id="nom" label="Nom du produit" erreur={errors.nom?.message}><Input id="nom" autoFocus {...register("nom")} /></Champ>
      </div>
      <Champ id="categorie" label="Catégorie"><Input id="categorie" {...register("categorie")} /></Champ>
      <Champ id="unite" label="Unité" erreur={errors.unite?.message}>
        <Select id="unite" {...register("unite")}><option value="kg">Kilogramme (kg)</option><option value="L">Litre (L)</option><option value="piece">Pièce</option></Select>
      </Champ>
      <Champ id="lieu_stockage" label="Lieu de stockage"><Input id="lieu_stockage" {...register("lieu_stockage")} /></Champ>
      <Champ id="fournisseur_id" label="Fournisseur principal">
        <Select id="fournisseur_id" {...register("fournisseur_id")}>
          <option value="">Aucun</option>
          {fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
        </Select>
      </Champ>
      <Champ id="pole_id" label="Pôle" erreur={errors.pole_id?.message}>
        <Select id="pole_id" disabled={poleFixe || !!produitId} {...register("pole_id")}>
          {poles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </Select>
      </Champ>
      <Champ id="prix_achat" label="Prix d'achat (€ par unité)" erreur={errors.prix_achat?.message}><Input id="prix_achat" type="number" inputMode="decimal" step="any" {...register("prix_achat", num)} /></Champ>
      <Champ id="seuil_min" label="Seuil minimum" erreur={errors.seuil_min?.message}><Input id="seuil_min" type="number" inputMode="decimal" step="any" {...register("seuil_min", num)} /></Champ>
      <Champ id="qte_reappro" label="Quantité de réapprovisionnement conseillée" erreur={errors.qte_reappro?.message}><Input id="qte_reappro" type="number" inputMode="decimal" step="any" {...register("qte_reappro", num)} /></Champ>
      <label className="flex items-center gap-3 self-end py-3 text-base">
        <input type="checkbox" className="h-6 w-6" {...register("dlc_suivie")} />
        Suivre la date limite de consommation
      </label>
      {erreur && <p role="alert" className="text-sm text-destructive sm:col-span-2">{erreur}</p>}
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button>
        {!produitId && <Button type="button" variant="outline" disabled={pending} onClick={soumettre(true)}>Enregistrer et ajouter un autre</Button>}
        <Button type="button" variant="ghost" onClick={() => (onTermine ? onTermine() : router.back())}>Annuler</Button>
      </div>
    </form>
  );
}
