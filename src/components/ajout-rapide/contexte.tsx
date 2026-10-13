"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Role } from "@/lib/auth/roles";
import type { TypeAjout } from "@/lib/raccourcis";
import { AideRaccourcis } from "@/components/ajout-rapide/aide-raccourcis";
import { PanneauAjout } from "@/components/ajout-rapide/panneau-ajout";
import { Palette } from "@/components/ajout-rapide/palette";
import { Raccourcis } from "@/components/ajout-rapide/raccourcis";

export type UtilisateurApp = { id: string; role: Role };
type Outils = { utilisateur: UtilisateurApp; ouvrirAjout: (t: TypeAjout) => void; ouvrirPalette: () => void; ouvrirAide: () => void };

const Contexte = createContext<Outils | null>(null);

export function useOutils(): Outils {
  const c = useContext(Contexte);
  if (!c) throw new Error("useOutils doit être utilisé dans <OutilsProvider>");
  return c;
}

/** Porte l'utilisateur courant et les trois « outils rapides » : panneau d'ajout, palette Ctrl/⌘ + K, aide des raccourcis. */
export function OutilsProvider({ utilisateur, children }: { utilisateur: UtilisateurApp; children: React.ReactNode }) {
  const [ajout, setAjout] = useState<TypeAjout | null>(null);
  const [palette, setPalette] = useState(false);
  const [aide, setAide] = useState(false);
  const ouvrirAjout = useCallback((t: TypeAjout) => { setPalette(false); setAjout(t); }, []);
  const ouvrirPalette = useCallback(() => setPalette(true), []);
  const ouvrirAide = useCallback(() => setAide(true), []);
  const valeur = useMemo(() => ({ utilisateur, ouvrirAjout, ouvrirPalette, ouvrirAide }), [utilisateur, ouvrirAjout, ouvrirPalette, ouvrirAide]);

  return (
    <Contexte.Provider value={valeur}>
      {children}
      <PanneauAjout type={ajout} onClose={() => setAjout(null)} />
      <Palette open={palette} onClose={() => setPalette(false)} />
      <AideRaccourcis open={aide} onClose={() => setAide(false)} />
      <Raccourcis />
    </Contexte.Provider>
  );
}
