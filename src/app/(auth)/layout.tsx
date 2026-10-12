import { Marque } from "@/components/layout/marque";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted p-4">
      <h1 className="text-3xl"><Marque /></h1>
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
