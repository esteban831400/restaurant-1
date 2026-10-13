import { UtilisateursPanel } from "@/components/parametres/utilisateurs-panel";
import { requireSession } from "@/lib/auth/session";
import { listUtilisateurs } from "@/server/queries/parametres";
import { listPoles } from "@/server/queries/stock";

export default async function PageUtilisateurs() {
  const session = await requireSession(["gerant"]);
  const [utilisateurs, poles] = await Promise.all([listUtilisateurs(), listPoles()]);
  return (
    <>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">Invitez vos équipes (un e-mail leur permet de choisir leur mot de passe), attribuez un rôle et un pôle, désactivez un compte saisonnier en fin de saison. Un compte désactivé perd tout accès immédiatement.</p>
      <UtilisateursPanel utilisateurs={utilisateurs} poles={poles} moi={session.id} />
    </>
  );
}
