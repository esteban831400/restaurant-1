import { requireSession } from "@/lib/auth/session";

export default async function FournisseursLayout({ children }: { children: React.ReactNode }) {
  await requireSession(["gerant", "responsable"]);
  return <>{children}</>;
}
