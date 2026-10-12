import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionOrNull } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { erreurJson } from "@/lib/webhooks/verify";

export const dynamic = "force-dynamic";

/** Export RGPD (droit d'accès) : toutes les données personnelles d'un utilisateur. Le gérant pour n'importe qui, chacun pour soi. */
export async function GET(request: Request) {
  const session = await getSessionOrNull();
  if (!session) return erreurJson(401, "non_connecte", "Connectez-vous pour continuer.");
  const demande = new URL(request.url).searchParams.get("user") ?? session.id;
  if (!z.string().uuid().safeParse(demande).success) return erreurJson(400, "donnees_invalides", "Identifiant invalide.");
  if (demande !== session.id && session.role !== "gerant") return erreurJson(403, "acces_refuse", "Vous ne pouvez exporter que vos propres données.");

  const db = createAdminClient();
  const [profil, compte, conversations, actions, notifications, audit, mouvements, commandes] = await Promise.all([
    db.from("profiles").select("*").eq("id", demande).maybeSingle(),
    db.auth.admin.getUserById(demande),
    db.from("conversations_assistant").select("id, titre, messages, created_at").eq("user_id", demande),
    db.from("actions_agent").select("date, demande, reponse, outils_utilises").eq("user_id", demande),
    db.from("notifications").select("type, titre, corps, lue, created_at").eq("user_id", demande),
    db.from("audit_log").select("action, entite, entite_id, created_at").eq("user_id", demande).order("created_at", { ascending: false }).limit(5000),
    db.from("mouvements_stock").select("produit_id, type, quantite, motif, created_at").eq("user_id", demande).limit(20000),
    db.from("commandes").select("id, numero, statut, created_at").eq("cree_par", demande).limit(5000),
  ]);
  if (!profil.data) return erreurJson(404, "utilisateur_introuvable", "Utilisateur introuvable.");

  await db.from("audit_log").insert({ user_id: session.id, action: "RGPD_EXPORT", entite: "profiles", entite_id: demande });
  const corps = {
    exporte_le: new Date().toISOString(),
    compte: { email: compte.data.user?.email ?? null, cree_le: compte.data.user?.created_at ?? null },
    profil: profil.data,
    conversations_assistant: conversations.data ?? [],
    questions_assistant: actions.data ?? [],
    notifications: notifications.data ?? [],
    journal_audit: audit.data ?? [],
    mouvements_stock: mouvements.data ?? [],
    commandes_creees: commandes.data ?? [],
  };
  return new NextResponse(JSON.stringify(corps, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="donnees-utilisateur-${demande.slice(0, 8)}.json"`, "Cache-Control": "no-store" },
  });
}
