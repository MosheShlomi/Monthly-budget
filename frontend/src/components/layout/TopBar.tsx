"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, User, UserCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useFamilyStore } from "@/store/familyStore";

const STATUS_LABELS: Record<string, string> = {
  husband: "בעל",
  wife: "אישה",
  son: "בן",
  daughter: "בת",
  father: "אבא",
  mother: "אמא",
  grandfather: "סבא",
  grandmother: "סבתא",
  other: "אחר",
};

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const router = useRouter();
  const { members, clear } = useFamilyStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [myStatus, setMyStatus] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setDisplayName(user.user_metadata?.full_name ?? user.email ?? null);
        setAvatarUrl(user.user_metadata?.avatar_url ?? null);
        const myMember = members.find((m) => m.user_id === user.id);
        setMyStatus(myMember?.family_status ?? null);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user;
        if (user) {
          setDisplayName(user.user_metadata?.full_name ?? user.email ?? null);
          setAvatarUrl(user.user_metadata?.avatar_url ?? null);
          const myMember = members.find((m) => m.user_id === user.id);
          setMyStatus(myMember?.family_status ?? null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [members]);

  async function handleLogout() {
    await supabase.auth.signOut();
    clear();
    router.push("/login");
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-2">
        {title && (
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="פרופיל"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-primary-600" />
            )}
          </div>
          {displayName && (
            <span className="hidden md:block text-sm font-medium text-slate-700 max-w-[140px] truncate">
              {displayName}
            </span>
          )}
          {myStatus && STATUS_LABELS[myStatus] && (
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
              {STATUS_LABELS[myStatus]}
            </span>
          )}
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute left-0 top-12 z-20 bg-white rounded-xl shadow-lg border border-slate-100 py-1 min-w-[160px]">
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <UserCircle className="w-4 h-4 text-slate-400" />
                הפרופיל שלי
              </Link>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 rtl-flip" />
                יציאה
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
