"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const sombre = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={sombre ? "Passer en mode clair" : "Passer en mode sombre"}
      onClick={() => setTheme(sombre ? "light" : "dark")}
    >
      {sombre ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
