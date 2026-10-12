"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { useOutils } from "@/components/ajout-rapide/contexte";
import { entreesStatiques, filtrerEntrees, type Entree } from "@/lib/raccourcis";
import { rechercheGlobale } from "@/server/actions/ajout-rapide";

const ORDRE = ["Actions", "Pages", "Produits", "Fournisseurs", "Commandes"] as const;

/** Palette de commandes Ctrl/⌘ + K : actions rapides, pages et recherche globale (produits, fournisseurs, commandes). */
export function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { utilisateur, ouvrirAjout } = useOutils();
  const dialogue = useRef<HTMLDialogElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [trouves, setTrouves] = useState<Entree[]>([]);
  const [actif, setActif] = useState(0);
  const statiques = useMemo(() => entreesStatiques(utilisateur.role), [utilisateur.role]);

  useEffect(() => {
    const d = dialogue.current;
    if (!d) return;
    if (open && !d.open) { setQ(""); setTrouves([]); setActif(0); d.showModal(); champ.current?.focus(); }
    if (!open && d.open) d.close();
  }, [open]);

  // Recherche serveur, après 200 ms sans frappe ; une réponse tardive ne remplace jamais une recherche plus récente.
  useEffect(() => {
    if (!open || q.trim().length < 2) { setTrouves([]); return; }
    let courant = true;
    const t = setTimeout(() => {
      rechercheGlobale(q).then((r) => courant && setTrouves(r.map((x) => ({ id: x.id, groupe: x.groupe, libelle: x.libelle, detail: x.detail, href: x.href })))).catch(() => courant && setTrouves([]));
    }, 200);
    return () => { courant = false; clearTimeout(t); };
  }, [q, open]);

  const entrees = useMemo(() => {
    const locales = filtrerEntrees(statiques, q);
    const tout = [...locales, ...trouves];
    return ORDRE.flatMap((g) => tout.filter((e) => e.groupe === g));
  }, [statiques, trouves, q]);
  useEffect(() => setActif(0), [q, trouves.length]);

  function choisir(e: Entree | undefined) {
    if (!e) return;
    onClose();
    if (e.ajout) ouvrirAjout(e.ajout);
    else if (e.href) router.push(e.href);
  }

  function onKeyDown(ev: React.KeyboardEvent) {
    if (ev.key === "ArrowDown") { ev.preventDefault(); setActif((i) => Math.min(i + 1, entrees.length - 1)); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); setActif((i) => Math.max(i - 1, 0)); }
    else if (ev.key === "Enter") { ev.preventDefault(); choisir(entrees[actif]); }
  }

  useEffect(() => { document.getElementById(`palette-option-${actif}`)?.scrollIntoView({ block: "nearest" }); }, [actif]);
  let dernierGroupe = "";

  return (
    <dialog ref={dialogue} onClose={onClose} aria-label="Rechercher ou lancer une action"
      onClick={(e) => { if (e.target === dialogue.current) onClose(); }}
      className="m-auto mt-[10vh] w-[calc(100%-2rem)] max-w-xl rounded-xl border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/50">
      {open && (
        <div>
          <div className="flex items-center gap-3 border-b px-4">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <input ref={champ} role="combobox" aria-expanded="true" aria-controls="palette-liste" aria-activedescendant={entrees[actif] ? `palette-option-${actif}` : undefined} aria-label="Rechercher un produit, un fournisseur, une commande ou une action"
              value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown} placeholder="Rechercher ou taper une action…" autoComplete="off"
              className="h-14 w-full bg-transparent text-base placeholder:text-muted-foreground focus:outline-none" />
          </div>
          <ul id="palette-liste" role="listbox" aria-label="Résultats" className="max-h-[50vh] overflow-y-auto p-2">
            {entrees.length === 0 && <li className="px-3 py-8 text-center text-muted-foreground" role="presentation">Aucun résultat pour « {q} ».</li>}
            {entrees.map((e, i) => {
              const entete = e.groupe !== dernierGroupe ? e.groupe : null;
              dernierGroupe = e.groupe;
              return (
                <li key={e.id} role="presentation">
                  {entete && <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{entete}</p>}
                  <div id={`palette-option-${i}`} role="option" aria-selected={i === actif} onMouseMove={() => setActif(i)} onClick={() => choisir(e)}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2.5 ${i === actif ? "bg-primary text-primary-foreground" : ""}`}>
                    <span className="min-w-0"><span className="block truncate">{e.libelle}</span>{e.detail && <span className={`block truncate text-xs ${i === actif ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{e.detail}</span>}</span>
                    {i === actif && <CornerDownLeft className="h-4 w-4 shrink-0" aria-hidden />}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="border-t px-4 py-2 text-xs text-muted-foreground">↑ ↓ pour naviguer · Entrée pour ouvrir · Échap pour fermer</p>
        </div>
      )}
    </dialog>
  );
}
