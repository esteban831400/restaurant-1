import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { NouvelInventaire } from "@/components/stocks/nouvel-inventaire";
import { requireSession } from "@/lib/auth/session";
import { listInventaires, STATUT_INVENTAIRE } from "@/server/queries/inventaire";
import { listPoles } from "@/server/queries/stock";

export default async function PageInventaires() {
  const session = await requireSession();
  const [inventaires, poles] = await Promise.all([listInventaires(), listPoles()]);
  const defaut = session.poleId ?? poles.find((p) => p.cle === "restaurant")?.id ?? poles[0]?.id ?? "";

  return (
    <div className="space-y-6">
      <NouvelInventaire poles={poles} poleParDefaut={defaut} choixPole={session.role === "gerant"} />
      {inventaires.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Aucun inventaire pour le moment. Démarrez-en un pour compter votre stock.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {inventaires.map((i) => (
            <li key={i.id}>
              <Link href={`/stocks/inventaire/${i.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 hover:bg-muted">
                <span className="font-medium">{i.poles?.nom} · {new Date(i.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}</span>
                <Badge className={i.statut === "a_valider" ? "border-orange-500" : i.statut === "valide" ? "border-green-600" : ""}>{STATUT_INVENTAIRE[i.statut]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
