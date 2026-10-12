import { navFor, type Role } from "@/lib/auth/roles";

export type TypeAjout = "produit" | "mouvement" | "commande" | "reception" | "fournisseur";

const GERE: Role[] = ["gerant", "responsable"];
const TOUS: Role[] = ["gerant", "responsable", "salarie"];

export const AJOUTS: { type: TypeAjout; libelle: string; roles: Role[]; mots: string[] }[] = [
  { type: "produit", libelle: "Nouveau produit", roles: GERE, mots: ["ajouter un produit", "creer un produit", "article"] },
  { type: "mouvement", libelle: "Mouvement de stock", roles: TOUS, mots: ["entree", "sortie", "perte", "casse", "ajouter du stock"] },
  { type: "commande", libelle: "Nouvelle commande", roles: GERE, mots: ["commander", "creer une commande", "bon de commande"] },
  { type: "reception", libelle: "Réception de livraison", roles: GERE, mots: ["recevoir", "livraison", "pointer"] },
  { type: "fournisseur", libelle: "Nouveau fournisseur", roles: GERE, mots: ["ajouter un fournisseur", "creer un fournisseur"] },
];

export const ajoutsPour = (role: Role) => AJOUTS.filter((a) => a.roles.includes(role));

export type Entree = { id: string; groupe: "Actions" | "Pages" | "Produits" | "Fournisseurs" | "Commandes"; libelle: string; detail?: string; href?: string; ajout?: TypeAjout; mots?: string[] };

const LIENS: { id: string; libelle: string; href: string; roles: Role[]; mots: string[] }[] = [
  { id: "inventaire", libelle: "Démarrer un inventaire", href: "/stocks/inventaire", roles: TOUS, mots: ["inventaire", "compter", "comptage"] },
  { id: "assistant", libelle: "Ouvrir l'assistant", href: "/assistant", roles: GERE, mots: ["assistant", "ia", "poser une question"] },
  { id: "automatisation", libelle: "Lancer une automatisation", href: "/automatisations", roles: ["gerant"], mots: ["automatisation", "lancer", "relances"] },
  { id: "import", libelle: "Importer ou exporter des produits", href: "/stocks/import", roles: GERE, mots: ["csv", "excel", "import", "export"] },
  { id: "validation", libelle: "Valider les commandes", href: "/a-valider", roles: ["gerant"], mots: ["a valider", "validation", "approuver"] },
];
const PAGES_PARAMETRES = [
  { libelle: "Paramètres : utilisateurs", href: "/parametres/utilisateurs", mots: ["comptes", "roles", "inviter"] },
  { libelle: "Paramètres : horaires", href: "/parametres/horaires", mots: ["ouverture", "fermeture", "saison"] },
];

/** Actions rapides + pages accessibles au rôle (ce que la palette propose avant toute recherche). */
export function entreesStatiques(role: Role): Entree[] {
  return [
    ...ajoutsPour(role).map<Entree>((a) => ({ id: `ajout-${a.type}`, groupe: "Actions", libelle: a.libelle, ajout: a.type, mots: a.mots })),
    ...LIENS.filter((l) => l.roles.includes(role)).map<Entree>((l) => ({ id: `lien-${l.id}`, groupe: "Actions", libelle: l.libelle, href: l.href, mots: l.mots })),
    ...navFor(role).map<Entree>((i) => ({ id: `page-${i.href}`, groupe: "Pages", libelle: i.label, href: i.href })),
    ...(role === "gerant" ? PAGES_PARAMETRES.map<Entree>((p) => ({ id: `page-${p.href}`, groupe: "Pages", libelle: p.libelle, href: p.href, mots: p.mots })) : []),
  ];
}

/** Minuscules sans accents : « Réception » et « reception » se valent. */
export const normaliser = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

/** Tous les mots tapés doivent se retrouver dans le libellé ou les mots-clés (ordre indifférent). */
export function filtrerEntrees(entrees: Entree[], q: string): Entree[] {
  const mots = normaliser(q).split(/\s+/).filter(Boolean);
  if (!mots.length) return entrees;
  return entrees.filter((e) => {
    const texte = normaliser(`${e.libelle} ${(e.mots ?? []).join(" ")}`);
    return mots.every((m) => texte.includes(m));
  });
}

export type ActionN = { type: "ajout"; ajout: TypeAjout } | { type: "lien"; href: string } | null;

/** Touche N : « nouvel élément » de la page en cours, selon le rôle. */
export function actionPourN(pathname: string, role: Role): ActionN {
  const peutGerer = role !== "salarie";
  if (pathname.startsWith("/stocks")) return { type: "ajout", ajout: peutGerer ? "produit" : "mouvement" };
  if (!peutGerer) return null;
  if (pathname.startsWith("/commandes") || pathname.startsWith("/tableau-de-bord") || pathname.startsWith("/a-valider")) return { type: "ajout", ajout: "commande" };
  if (pathname.startsWith("/fournisseurs")) return { type: "ajout", ajout: "fournisseur" };
  if (pathname.startsWith("/assistant")) return { type: "lien", href: "/assistant" };
  return null;
}

/** G puis S / C / A. Renvoie null si la page n'est pas accessible au rôle. */
export function destinationG(touche: string, role: Role): string | null {
  const dest = { s: "/stocks", c: "/commandes", a: "/automatisations" }[touche.toLowerCase()];
  return dest && navFor(role).some((i) => i.href === dest) ? dest : null;
}

export const AIDE_RACCOURCIS: { touches: string[]; libelle: string }[] = [
  { touches: ["Ctrl / ⌘", "K"], libelle: "Rechercher et lancer une action" },
  { touches: ["N"], libelle: "Nouvel élément de la page en cours" },
  { touches: ["/"], libelle: "Aller à la recherche de la page" },
  { touches: ["G", "puis S"], libelle: "Aller aux stocks" },
  { touches: ["G", "puis C"], libelle: "Aller aux commandes" },
  { touches: ["G", "puis A"], libelle: "Aller aux automatisations" },
  { touches: ["Échap"], libelle: "Fermer le panneau ouvert" },
  { touches: ["?"], libelle: "Afficher cette aide" },
];
