import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv/csv";

export async function GET() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  // La RLS limite automatiquement l'export aux pôles autorisés.
  const { data, error } = await supabase
    .from("v_produits_stock")
    .select("nom, categorie, unite, lieu_stockage, fournisseur_nom, prix_achat, seuil_min, qte_reappro, dlc_suivie, stock_actuel")
    .eq("actif", true)
    .order("nom")
    .limit(5000);
  if (error) return NextResponse.json({ error: "Export impossible" }, { status: 500 });

  const csv = toCsv([
    ["nom", "categorie", "unite", "lieu_stockage", "fournisseur", "prix_achat", "seuil_min", "qte_reappro", "dlc_suivie", "stock_initial"],
    ...(data ?? []).map((p) => [p.nom, p.categorie, p.unite, p.lieu_stockage, p.fournisseur_nom, p.prix_achat, p.seuil_min, p.qte_reappro, p.dlc_suivie ? "oui" : "non", p.stock_actuel]),
  ]);
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="produits-palmeraie.csv"' },
  });
}
