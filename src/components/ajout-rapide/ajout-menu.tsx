"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useOutils } from "@/components/ajout-rapide/contexte";
import { Button } from "@/components/ui/button";
import { ajoutsPour } from "@/lib/raccourcis";

function Menu({ variante }: { variante: "bureau" | "mobile" }) {
  const { utilisateur, ouvrirAjout } = useOutils();
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  const ajouts = ajoutsPour(utilisateur.role);

  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => { if (!zone.current?.contains(e.target as Node)) setOuvert(false); };
    const touche = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche);
    return () => { document.removeEventListener("mousedown", clic); document.removeEventListener("keydown", touche); };
  }, [ouvert]);

  const bouton = variante === "mobile"
    ? <Button type="button" aria-haspopup="menu" aria-expanded={ouvert} aria-label="Ajouter" onClick={() => setOuvert((o) => !o)} className="h-14 w-14 rounded-full p-0 shadow-lg"><Plus className="h-7 w-7" /></Button>
    : <Button type="button" aria-haspopup="menu" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}><Plus className="h-5 w-5" />Ajouter</Button>;

  return (
    <div ref={zone} className="relative">
      {bouton}
      {ouvert && (
        <ul role="menu" aria-label="Ajout rapide" className={`absolute z-50 w-64 rounded-lg border bg-card p-1 shadow-lg ${variante === "mobile" ? "bottom-full right-0 mb-2" : "right-0 top-full mt-2"}`}>
          {ajouts.map((a) => (
            <li key={a.type} role="none">
              <button type="button" role="menuitem" className="w-full rounded-md px-3 py-3 text-left text-base hover:bg-muted" onClick={() => { setOuvert(false); ouvrirAjout(a.type); }}>{a.libelle}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Bouton « + Ajouter » en haut à droite sur ordinateur. */
export function AjoutBureau() {
  return <div className="hidden md:block"><Menu variante="bureau" /></div>;
}

/** Bouton flottant sur téléphone (masqué pendant le comptage d'inventaire, qui a sa propre barre fixe). */
export function AjoutMobile() {
  const pathname = usePathname();
  if (/^\/stocks\/inventaire\/[^/]+/.test(pathname)) return null;
  return <div className="fixed bottom-4 right-4 z-40 md:hidden"><Menu variante="mobile" /></div>;
}

/** Ouvre la palette de recherche (équivalent tactile de Ctrl/⌘ + K). */
export function BoutonRecherche() {
  const { ouvrirPalette } = useOutils();
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);
  return (
    <Button type="button" variant="outline" size="sm" onClick={ouvrirPalette} aria-label="Rechercher (Ctrl ou Commande + K)" className="gap-2 text-muted-foreground">
      <Search className="h-4 w-4" /><span className="hidden lg:inline">Rechercher</span><kbd className="hidden rounded border bg-muted px-1.5 font-mono text-xs lg:inline">{mac ? "⌘K" : "Ctrl K"}</kbd>
    </Button>
  );
}
