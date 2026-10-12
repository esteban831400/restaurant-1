import { requireSession } from "@/lib/auth/session";

export default async function AppelsLayout({ children }: { children: React.ReactNode }) {
  await requireSession(["gerant"]);
  return <>{children}</>;
}
