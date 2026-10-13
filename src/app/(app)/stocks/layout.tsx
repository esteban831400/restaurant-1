import { StockTabs } from "@/components/stocks/stock-tabs";
import { requireSession } from "@/lib/auth/session";

export default async function StocksLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold">Stocks</h1>
      <StockTabs peutGerer={session.role !== "salarie"} />
      {children}
    </>
  );
}
