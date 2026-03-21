"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Users, CheckCircle, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";
import type { FamilyInvite, FamilyMember } from "@/types";

export default function InvitePageClient() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<FamilyInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch<FamilyInvite>(`/api/v1/invites/${token}`)
      .then(setInvite)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    setAccepting(true);
    try {
      await apiFetch<FamilyMember>(`/api/v1/invites/${token}/accept`, {
        method: "POST",
      });
      toast.success("הצטרפת למשפחה!");
      router.push("/dashboard");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
          {loading ? (
            <div className="py-8">
              <Spinner className="mx-auto" />
              <p className="text-slate-500 mt-3 text-sm">טוען הזמנה...</p>
            </div>
          ) : error ? (
            <>
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">הזמנה לא תקינה</h2>
              <p className="text-slate-500 text-sm mb-6">
                ההזמנה פגה, כבר נוצלה, או שאינה קיימת.
              </p>
              <Link href="/login">
                <Button className="w-full">חזור לכניסה</Button>
              </Link>
            </>
          ) : invite ? (
            <>
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">הזמנה להצטרף!</h2>
              <p className="text-slate-500 text-sm mb-1">
                הוזמנת להצטרף למשפחה בתקציב המשפחתי
              </p>
              <p className="text-xs text-slate-400 mb-6">
                ההזמנה נשלחה ל-{invite.email}
              </p>

              {!isLoggedIn ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 mb-4">
                    יש להתחבר תחילה כדי לקבל את ההזמנה
                  </p>
                  <Button
                    onClick={() => router.push(`/login?redirect=/invite/${token}`)}
                    className="w-full"
                  >
                    התחבר וקבל הזמנה
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/register?redirect=/invite/${token}`)}
                    className="w-full"
                  >
                    הירשם וקבל הזמנה
                  </Button>
                </div>
              ) : (
                <Button onClick={handleAccept} loading={accepting} className="w-full" size="lg">
                  <CheckCircle className="w-5 h-5" />
                  קבל הזמנה
                </Button>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
