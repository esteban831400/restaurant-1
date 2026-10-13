"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useOutils } from "@/components/ajout-rapide/contexte";
import { actionPourN, destinationG } from "@/lib/raccourcis";

const DELAI_G_MS = 1_500;

function estChampDeSaisie(cible: EventTarget | null): boolean {
  const el = cible as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

/** Raccourcis clavier globaux (ordinateur). Aucun effet visuel : ils pilotent les outils rapides et la navigation. */
export function Raccourcis() {
  const router = useRouter();
  const pathname = usePathname();
  const { utilisateur, ouvrirAjout, ouvrirPalette, ouvrirAide } = useOutils();

  useEffect(() => {
    let attenteG = 0;
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ouvrirPalette();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if (estChampDeSaisie(e.target) || document.querySelector("dialog[open]")) return; // pas pendant la saisie ni dans un panneau

      if (attenteG && Date.now() - attenteG < DELAI_G_MS) {
        attenteG = 0;
        const dest = destinationG(e.key, utilisateur.role);
        if (dest) { e.preventDefault(); router.push(dest); }
        return;
      }
      attenteG = 0;
      switch (e.key) {
        case "g": case "G": attenteG = Date.now(); break;
        case "n": case "N": {
          const a = actionPourN(pathname, utilisateur.role);
          if (!a) break;
          e.preventDefault();
          if (a.type === "ajout") ouvrirAjout(a.ajout); else router.push(a.href);
          break;
        }
        case "/": {
          e.preventDefault();
          const champ = document.querySelector<HTMLElement>("[data-search]");
          if (champ) champ.focus(); else ouvrirPalette();
          break;
        }
        case "?": e.preventDefault(); ouvrirAide(); break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router, utilisateur.role, ouvrirAjout, ouvrirPalette, ouvrirAide]);

  return null;
}
