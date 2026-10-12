import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Échange le code du lien e-mail contre une session, puis redirige (chemin interne uniquement). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const { error } = await createClient().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destination}`);
  }
  return NextResponse.redirect(`${origin}/connexion`);
}
