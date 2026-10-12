"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, CheckCircle, LayoutDashboard, Package, Phone, Settings, ShoppingCart, Truck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/auth/roles";

const ICONS = {
  "layout-dashboard": LayoutDashboard,
  package: Package,
  "shopping-cart": ShoppingCart,
  truck: Truck,
  "check-circle": CheckCircle,
  phone: Phone,
  zap: Zap,
  bot: Bot,
  settings: Settings,
} as const;

export function NavLinks({ items, orientation }: { items: NavItem[]; orientation: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation principale" className={cn("flex gap-1", orientation === "vertical" ? "flex-col" : "overflow-x-auto")}>
      {items.map((item) => {
        const Icon = ICONS[item.icon as keyof typeof ICONS];
        const actif = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={actif ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-md px-3 py-3 text-base font-medium hover:bg-muted",
              actif && "bg-primary text-primary-foreground hover:bg-primary",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
