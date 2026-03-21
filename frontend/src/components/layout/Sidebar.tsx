"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  Tag,
  Wallet,
  Target,
  Users,
  Upload,
  LogOut,
  TrendingUp,
} from "lucide-react";
import { clsx } from "clsx";
import { supabase } from "@/lib/supabase";
import { useFamilyStore } from "@/store/familyStore";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/spendings", label: "הוצאות", icon: Wallet },
  { href: "/income", label: "הכנסות", icon: TrendingUp },
  { href: "/categories", label: "קטגוריות", icon: Tag },
  { href: "/cards", label: "כרטיסי אשראי", icon: CreditCard },
  { href: "/budget-goals", label: "יעדי תקציב", icon: Target },
  { href: "/family", label: "משפחה", icon: Users },
  { href: "/import", label: "ייבוא", icon: Upload },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentFamily, clear } = useFamilyStore();

  async function handleLogout() {
    await supabase.auth.signOut();
    clear();
    router.push("/login");
  }

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-white border-l border-slate-200 fixed right-0 top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
        <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">תקציב משפחתי</p>
          {currentFamily && (
            <p className="text-xs text-slate-500 truncate max-w-[140px]">
              {currentFamily.name}
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon
                    className={clsx(
                      "w-5 h-5 flex-shrink-0",
                      isActive ? "text-primary-600" : "text-slate-400"
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-slate-100 pt-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5 rtl-flip" />
          יציאה
        </button>
      </div>
    </aside>
  );
}
