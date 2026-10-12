"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  async function deconnecter() {
    await createClient().auth.signOut();
    router.replace("/connexion");
    router.refresh();
  }
  return (
    <Button variant="ghost" size="icon" aria-label="Se déconnecter" onClick={deconnecter}>
      <LogOut className="h-5 w-5" />
    </Button>
  );
}
