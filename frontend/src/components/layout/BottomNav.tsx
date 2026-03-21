"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Target,
  Users,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/dashboard", label: "ראשי", icon: LayoutDashboard },
  { href: "/spendings", label: "הוצאות", icon: Wallet },
  { href: "/income", label: "הכנסות", icon: TrendingUp },
  { href: "/budget-goals", label: "יעדים", icon: Target },
  { href: "/family", label: "משפחה", icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 right-0 left-0 z-30 bg-white border-t border-slate-200 safe-area-bottom">
      <div className="flex">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors",
                isActive ? "text-primary-600" : "text-slate-400"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
