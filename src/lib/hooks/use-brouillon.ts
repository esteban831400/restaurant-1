"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DefaultValues, FieldValues, UseFormReturn } from "react-hook-form";
import { useOutils } from "@/components/ajout-rapide/contexte";
import { effacerBrouillon, ecrireBrouillon, lireBrouillon, stockageSur } from "@/lib/brouillon";

/**
 * Sauvegarde automatique d'un formulaire de création (600 ms après la dernière frappe) et restauration à la réouverture.
 * `effacer()` après un enregistrement réussi ; les brouillons sont propres à l'utilisateur et supprimés à la déconnexion.
 */
export function useBrouillon<T extends FieldValues>(formulaire: string, form: UseFormReturn<T>, actif: boolean) {
  const { utilisateur } = useOutils();
  const [restaure, setRestaure] = useState(false);
  const dejaRestaure = useRef(false);
  const ignorerJusqua = useRef(0);

  useEffect(() => {
    if (!actif || dejaRestaure.current) return;
    dejaRestaure.current = true;
    const b = lireBrouillon(stockageSur(), utilisateur.id, formulaire);
    if (b && typeof b === "object") {
      form.reset(b as DefaultValues<T>);
      setRestaure(true);
    }
  }, [actif, form, formulaire, utilisateur.id]);

  useEffect(() => {
    if (!actif) return;
    let minuteur: ReturnType<typeof setTimeout> | undefined;
    const abonnement = form.watch((valeurs) => {
      clearTimeout(minuteur);
      minuteur = setTimeout(() => {
        if (Date.now() >= ignorerJusqua.current) ecrireBrouillon(stockageSur(), utilisateur.id, formulaire, valeurs);
      }, 600);
    });
    return () => { abonnement.unsubscribe(); clearTimeout(minuteur); };
  }, [actif, form, formulaire, utilisateur.id]);

  const effacer = useCallback(() => {
    ignorerJusqua.current = Date.now() + 1_500; // le reset du formulaire ne doit pas recréer un brouillon vide
    effacerBrouillon(stockageSur(), utilisateur.id, formulaire);
    setRestaure(false);
  }, [formulaire, utilisateur.id]);

  return { restaure, effacer };
}
