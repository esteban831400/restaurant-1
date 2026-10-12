import { cn } from "@/lib/utils";

export function Badge({ className, style, children }: { className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <span style={style} className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", className)}>
      {children}
    </span>
  );
}
