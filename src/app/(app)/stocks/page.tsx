import { requireSession } from "@/lib/auth/session";

export default async function PageStocks() {
  await requireSession();
  return (
    <>
      <h1 className="text-2xl font-semibold">Stocks</h1>
      <p className="mt-2 text-muted-foreground">Le catalogue et les mouvements arrivent à l&apos;étape 2.</p>
    </>
  );
}
