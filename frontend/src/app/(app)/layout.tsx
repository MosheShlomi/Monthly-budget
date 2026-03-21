"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useFamilyStore } from "@/store/familyStore";
import { apiFetch } from "@/lib/api";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { Spinner } from "@/components/ui/Spinner";
import type { Family, FamilyMember } from "@/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setFamily, setMembers } = useFamilyStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const hasName = session.user.user_metadata?.full_name?.trim();
      if (!hasName && window.location.pathname !== "/profile") {
        router.replace("/profile");
        return;
      }

      try {
        const family = await apiFetch<Family>("/api/v1/families/me");
        setFamily(family);
        const members = await apiFetch<FamilyMember[]>(
          `/api/v1/families/${family.id}/members`
        );
        setMembers(members);
      } catch {
        // User has no family yet - that's ok, they'll see the family page
        setFamily(null);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router, setFamily, setMembers]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="md:mr-64">
        <TopBar />
        <main className="p-4 md:p-6 pb-24 md:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
