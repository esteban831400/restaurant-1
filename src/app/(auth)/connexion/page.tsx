"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/layout/form-field";
import { createClient } from "@/lib/supabase/client";
import { connexionSchema, type ConnexionValues } from "@/lib/validators/auth";

function FormulaireConnexion() {
  const router = useRouter();
  const params = useSearchParams();
  const [erreur, setErreur] = useState<string | null>(
    params.get("erreur") === "compte" ? "Ce compte est désactivé. Contactez le gérant." : null,
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConnexionValues>({ resolver: zodResolver(connexionSchema) });

  async function onSubmit(values: ConnexionValues) {
    setErreur(null);
    const { error } = await createClient().auth.signInWithPassword({
      email: values.email,
      password: values.motDePasse,
    });
    if (error) {
      setErreur("Adresse e-mail ou mot de passe incorrect.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-xl font-semibold">Connexion</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField id="email" label="Adresse e-mail" type="email" autoComplete="email" error={errors.email?.message} registration={register("email")} />
        <FormField id="motDePasse" label="Mot de passe" type="password" autoComplete="current-password" error={errors.motDePasse?.message} registration={register("motDePasse")} />
        {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Connexion…" : "Se connecter"}
        </Button>
        <Link href="/mot-de-passe-oublie" className="block text-center text-sm text-secondary underline">
          Mot de passe oublié ?
        </Link>
      </form>
    </Card>
  );
}

export default function PageConnexion() {
  return (
    <Suspense>
      <FormulaireConnexion />
    </Suspense>
  );
}
