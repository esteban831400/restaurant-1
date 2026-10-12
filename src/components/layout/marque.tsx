import { getComplexe } from "@/server/queries/parametres";

/** Nom et logo du complexe, tels que réglés dans Paramètres. */
export async function Marque({ className = "" }: { className?: string }) {
  const { nom, logo } = await getComplexe();
  return (
    <span className={`flex items-center gap-3 font-semibold text-primary ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {logo && <img src={logo} alt="" className="h-9 w-9 rounded object-contain" />}
      {nom}
    </span>
  );
}
