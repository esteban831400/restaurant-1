import { Onglets } from "@/components/layout/onglets";
import { requireSession } from "@/lib/auth/session";

const ONGLETS = [
  { href: "/parametres/general", label: "Général" },
  { href: "/parametres/utilisateurs", label: "Utilisateurs" },
  { href: "/parametres/horaires", label: "Horaires" },
  { href: "/parametres/adresses", label: "Adresses" },
  { href: "/parametres/journal", label: "Journal et données" },
];

export default async function ParametresLayout({ children }: { children: React.ReactNode }) {
  await requireSession(["gerant"]);
  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">Paramètres</h1>
      <Onglets label="Sections des paramètres" items={ONGLETS} />
      {children}
    </>
  );
}
