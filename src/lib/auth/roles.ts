export type Role = "gerant" | "responsable" | "salarie";

export const ROLE_LABELS: Record<Role, string> = {
  gerant: "Gérant",
  responsable: "Responsable de pôle",
  salarie: "Salarié",
};

export type NavItem = { href: string; label: string; icon: string; roles: Role[] };

/** Navigation principale, filtrée selon le rôle (la RLS reste la vraie barrière). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/tableau-de-bord", label: "Tableau de bord", icon: "layout-dashboard", roles: ["gerant"] },
  { href: "/stocks", label: "Stocks", icon: "package", roles: ["gerant", "responsable", "salarie"] },
  { href: "/commandes", label: "Commandes", icon: "shopping-cart", roles: ["gerant", "responsable"] },
  { href: "/fournisseurs", label: "Fournisseurs", icon: "truck", roles: ["gerant", "responsable"] },
  { href: "/a-valider", label: "À valider", icon: "check-circle", roles: ["gerant"] },
  { href: "/appels", label: "Appels IA", icon: "phone", roles: ["gerant"] },
  { href: "/automatisations", label: "Automatisations", icon: "zap", roles: ["gerant"] },
  { href: "/assistant", label: "Assistant", icon: "bot", roles: ["gerant", "responsable"] },
  { href: "/parametres", label: "Paramètres", icon: "settings", roles: ["gerant"] },
];

export function navFor(role: Role) {
  return NAV_ITEMS.filter((i) => i.roles.includes(role));
}

export function homeFor(role: Role) {
  return role === "gerant" ? "/tableau-de-bord" : "/stocks";
}
