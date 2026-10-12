import { requireSession } from "@/lib/auth/session";

export default async function PageTableauDeBord() {
  const session = await requireSession(["gerant"]);
  return (
    <>
      <h1 className="text-2xl font-semibold">Bonjour {session.nomComplet.split(" ")[0]}</h1>
      <p className="mt-2 text-muted-foreground">Le tableau de bord sera construit à l&apos;étape 7.</p>
    </>
  );
}
