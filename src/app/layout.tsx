import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import { cssTheme } from "@/lib/theme";
import { getComplexe } from "@/server/queries/parametres";
import { ThemeProvider } from "@/components/layout/theme-provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const dynamic = "force-dynamic"; // le nom, le logo et les couleurs viennent des paramètres

export async function generateMetadata(): Promise<Metadata> {
  const { nom } = await getComplexe();
  return { title: nom, description: "Gestion interne du complexe de loisirs" };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const complexe = await getComplexe();
  const css = cssTheme(complexe.couleur_principale, complexe.couleur_secondaire);
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>{css && <style dangerouslySetInnerHTML={{ __html: css }} />}</head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>{children}<Toaster richColors position="top-center" /></ThemeProvider>
      </body>
    </html>
  );
}
