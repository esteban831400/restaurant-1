import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeFor, type Role } from "@/lib/auth/roles";

export type Session = {
  id: string;
  email: string;
  nomComplet: string;
  role: Role;
  poleId: string | null;
};

/** Utilisateur connecté et actif, sinon redirection vers la connexion. */
export async function requireSession(allowed?: Role[]): Promise<Session> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const { data: profil } = await supabase
    .from("profiles")
    .select("nom_complet, role, pole_id, actif")
    .eq("id", auth.user.id)
    .single();
  if (!profil || !profil.actif) {
    await supabase.auth.signOut();
    redirect("/connexion?erreur=compte");
  }

  const session: Session = {
    id: auth.user.id,
    email: auth.user.email ?? "",
    nomComplet: profil.nom_complet,
    role: profil.role as Role,
    poleId: profil.pole_id,
  };
  if (allowed && !allowed.includes(session.role)) redirect(homeFor(session.role));
  return session;
}

/** Pour les routes API : utilisateur actif ou null (jamais de redirection). */
export async function getSessionOrNull(): Promise<Session | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profil } = await supabase.from("profiles").select("nom_complet, role, pole_id, actif").eq("id", auth.user.id).single();
  if (!profil || !profil.actif) return null;
  return { id: auth.user.id, email: auth.user.email ?? "", nomComplet: profil.nom_complet, role: profil.role as Role, poleId: profil.pole_id };
}
