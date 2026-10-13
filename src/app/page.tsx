export const dynamic = "force-dynamic";

import { requireSession } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/roles";
import { redirect } from "next/navigation";

export default async function Accueil() {
  const session = await requireSession();
  redirect(homeFor(session.role));
}
