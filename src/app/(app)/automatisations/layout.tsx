import { requireSession } from "@/lib/auth/session";

export default async function AutomatisationsLayout({ children }: { children: React.ReactNode }) {
  await requireSession(["gerant"]);
  return <>{children}</>;
}
