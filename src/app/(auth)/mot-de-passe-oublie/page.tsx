"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/layout/form-field";
import { createClient } from "@/lib/supabase/client";
import { emailSchema } from "@/lib/validators/auth";
import type { z } from "zod";

type Values = z.infer<typeof emailSchema>;

export default function PageMotDePasseOublie() {
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(emailSchema) });

  async function onSubmit({ email }: Values) {
    setErreur(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reinitialiser`,
    });
    if (error) setErreur("Envoi impossible pour le moment. Réessayez dans quelques minutes.");
    else setEnvoye(true);
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-xl font-semibold">Mot de passe oublié</h2>
      {envoye ? (
        <p role="status">Si cette adresse est connue, un e-mail de réinitialisation vient d&apos;être envoyé.</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField id="email" label="Adresse e-mail" type="email" autoComplete="email" error={errors.email?.message} registration={register("email")} />
          {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Envoi…" : "Envoyer le lien"}
          </Button>
        </form>
      )}
      <Link href="/connexion" className="mt-4 block text-center text-sm text-secondary underline">
        Retour à la connexion
      </Link>
    </Card>
  );
}
