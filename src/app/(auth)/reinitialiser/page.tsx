"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/layout/form-field";
import { createClient } from "@/lib/supabase/client";
import { nouveauMotDePasseSchema, type NouveauMotDePasseValues } from "@/lib/validators/auth";

export default function PageReinitialiser() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NouveauMotDePasseValues>({ resolver: zodResolver(nouveauMotDePasseSchema) });

  async function onSubmit(values: NouveauMotDePasseValues) {
    setErreur(null);
    const { error } = await createClient().auth.updateUser({ password: values.motDePasse });
    if (error) {
      setErreur("Impossible de modifier le mot de passe. Le lien a peut-être expiré.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-xl font-semibold">Nouveau mot de passe</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField id="motDePasse" label="Nouveau mot de passe" type="password" autoComplete="new-password" error={errors.motDePasse?.message} registration={register("motDePasse")} />
        <FormField id="confirmation" label="Confirmer le mot de passe" type="password" autoComplete="new-password" error={errors.confirmation?.message} registration={register("confirmation")} />
        {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </Card>
  );
}
