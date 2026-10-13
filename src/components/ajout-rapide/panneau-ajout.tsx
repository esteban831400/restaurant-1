"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CommandeForm } from "@/components/commandes/commande-form";
import { ReceptionForm } from "@/components/commandes/reception-form";
import { FournisseurForm } from "@/components/fournisseurs/fournisseur-form";
import { FormulaireMouvement } from "@/components/stocks/mouvement-dialog";
import { ProduitForm } from "@/components/stocks/produit-form";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { normaliser, AJOUTS, type TypeAjout } from "@/lib/raccourcis";
import { chargerCommandesAReceptionner, chargerDonneesAjout, chargerLignesReception, chargerProduitsMouvement } from "@/server/actions/ajout-rapide";
import type { CommandeAReceptionner, DonneesFormulaires, LigneReception, ProduitMouvement } from "@/types/ajout-rapide";

const TITRES = Object.fromEntries(AJOUTS.map((a) => [a.type, a.libelle])) as Record<TypeAjout, string>;

function Chargement() {
  return <div role="status" aria-label="Chargement" className="space-y-3"><div className="h-12 animate-pulse rounded-md bg-muted" /><div className="h-12 animate-pulse rounded-md bg-muted" /><div className="h-12 animate-pulse rounded-md bg-muted" /></div>;
}

/** Contenu d'un formulaire de création : les données sont chargées à l'ouverture, jamais avant. */
function Formulaire({ type, fermer }: { type: TypeAjout; fermer: () => void }) {
  const router = useRouter();
  const fini = () => { fermer(); router.refresh(); };
  const [donnees, setDonnees] = useState<DonneesFormulaires | null>(null);
  const [produits, setProduits] = useState<ProduitMouvement[] | null>(null);
  const [commandes, setCommandes] = useState<CommandeAReceptionner[] | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let actif = true;
    const echec = () => { if (actif) setErreur(true); };
    if (type === "mouvement") chargerProduitsMouvement().then((d) => actif && setProduits(d)).catch(echec);
    else if (type === "reception") chargerCommandesAReceptionner().then((d) => actif && setCommandes(d)).catch(echec);
    else chargerDonneesAjout(type === "commande").then((d) => actif && setDonnees(d)).catch(echec);
    return () => { actif = false; };
  }, [type]);

  if (erreur) return <p role="alert" className="text-destructive">Impossible de charger le formulaire. Fermez ce panneau et réessayez.</p>;

  if (type === "mouvement") return produits ? <ChoixMouvement produits={produits} fermer={fini} /> : <Chargement />;
  if (type === "reception") return commandes ? <ChoixReception commandes={commandes} fermer={fini} /> : <Chargement />;
  if (!donnees) return <Chargement />;
  if (type === "produit") return <ProduitForm poles={donnees.poles} fournisseurs={donnees.fournisseurs} poleParDefaut={donnees.poleParDefaut} poleFixe={donnees.poleFixe} onTermine={fini} />;
  if (type === "fournisseur") return <FournisseurForm poles={donnees.poles} choixPole={!donnees.poleFixe} onTermine={fini} />;
  return <CommandeForm poles={donnees.poles} fournisseurs={donnees.fournisseurs} produits={donnees.produits} poleParDefaut={donnees.poleParDefaut} poleFixe={donnees.poleFixe} onTermine={fini} />;
}

function ChoixMouvement({ produits, fermer }: { produits: ProduitMouvement[]; fermer: () => void }) {
  const [q, setQ] = useState("");
  const [choisi, setChoisi] = useState<ProduitMouvement | null>(null);
  const visibles = useMemo(() => produits.filter((p) => normaliser(p.nom).includes(normaliser(q))).slice(0, 30), [produits, q]);
  if (choisi) {
    return (
      <div className="space-y-4">
        <p className="font-medium">{choisi.nom}</p>
        <FormulaireMouvement produit={choisi} typeInitial="entree" onClose={fermer} />
        <Button variant="ghost" size="sm" onClick={() => setChoisi(null)}>← Changer de produit</Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="space-y-2"><Label htmlFor="mvt-produit">Quel produit ?</Label><Input id="mvt-produit" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tapez le nom du produit" autoFocus /></div>
      {visibles.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">Aucun produit trouvé.</p> : (
        <ul className="divide-y rounded-lg border">{visibles.map((p) => <li key={p.id}><button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted" onClick={() => setChoisi(p)}><span>{p.nom}</span><span className="text-sm text-muted-foreground">{p.unite}</span></button></li>)}</ul>
      )}
    </div>
  );
}

function ChoixReception({ commandes, fermer }: { commandes: CommandeAReceptionner[]; fermer: () => void }) {
  const [choisie, setChoisie] = useState<CommandeAReceptionner | null>(null);
  const [lignes, setLignes] = useState<LigneReception[] | null>(null);

  function choisir(c: CommandeAReceptionner) {
    setChoisie(c);
    setLignes(null);
    chargerLignesReception(c.id).then((l) => {
      if (l) setLignes(l);
      else { toast.error("Cette commande n'est plus en attente de livraison."); setChoisie(null); }
    }).catch(() => { toast.error("Chargement impossible."); setChoisie(null); });
  }

  if (choisie) {
    return (
      <div className="space-y-4">
        <p className="font-medium">Commande n°{choisie.numero} — {choisie.fournisseur}</p>
        {lignes ? <ReceptionForm commandeId={choisie.id} lignes={lignes} onTermine={fermer} /> : <Chargement />}
        <Button variant="ghost" size="sm" onClick={() => setChoisie(null)}>← Autre commande</Button>
      </div>
    );
  }
  if (commandes.length === 0) return <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">Aucune livraison n&apos;est attendue pour le moment.</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Quelle livraison venez-vous de recevoir ?</p>
      <ul className="divide-y rounded-lg border">{commandes.map((c) => (
        <li key={c.id}><button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted" onClick={() => choisir(c)}>
          <span><span className="font-medium">n°{c.numero} — {c.fournisseur}</span></span>
          <span className="shrink-0 text-sm text-muted-foreground">{c.date_livraison_prevue ? `prévue le ${new Date(`${c.date_livraison_prevue}T12:00:00`).toLocaleDateString("fr-FR")}` : "sans date"}</span>
        </button></li>
      ))}</ul>
    </div>
  );
}

export function PanneauAjout({ type, onClose }: { type: TypeAjout | null; onClose: () => void }) {
  return (
    <Drawer open={!!type} onClose={onClose} titre={type ? TITRES[type] : ""}>
      {type && <Formulaire key={type} type={type} fermer={onClose} />}
    </Drawer>
  );
}
