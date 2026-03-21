"use client";

import { useEffect, useState } from "react";
import { Users, Mail, Crown, Trash2, Plus, Link2, Copy, Check } from "lucide-react";
import { useFamilyStore } from "@/store/familyStore";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";
import type { Family, FamilyMember, FamilyInvite } from "@/types";

export default function FamilyPage() {
  const { currentFamily, setFamily, setMembers, members, clear } = useFamilyStore();
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joinToken, setJoinToken] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user.id) setCurrentUserId(data.session.user.id);
    });
  }, []);

  const isOwner = members.find((m) => m.user_id === currentUserId)?.role === "owner";

  async function loadData() {
    if (!currentFamily) return;
    setLoading(true);
    try {
      const mems = await apiFetch<FamilyMember[]>(`/api/v1/families/${currentFamily.id}/members`);
      setMembers(mems);
      if (isOwner) {
        // Future: load invites from API
      }
    } catch {
      toast.error("שגיאה בטעינת נתונים");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [currentFamily]);

  async function handleCreateFamily() {
    if (!familyName.trim()) return;
    setSaving(true);
    try {
      const family = await apiFetch<Family>("/api/v1/families", {
        method: "POST",
        body: JSON.stringify({ name: familyName.trim() }),
      });
      setFamily(family);
      const mems = await apiFetch<FamilyMember[]>(`/api/v1/families/${family.id}/members`);
      setMembers(mems);
      setCreateOpen(false);
      toast.success("משפחה נוצרה!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite() {
    if (!currentFamily || !inviteEmail.trim()) return;
    setSaving(true);
    try {
      const invite = await apiFetch<FamilyInvite>(`/api/v1/families/${currentFamily.id}/invites`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim(), family_id: currentFamily.id }),
      });
      const link = `${window.location.origin}/invite/${invite.token}`;
      setGeneratedLink(link);
      toast.success("הזמנה נשלחה בהצלחה!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyLink(link: string) {
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    toast.success("קישור הועתק!");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCloseInviteModal() {
    setInviteOpen(false);
    setInviteEmail("");
    setGeneratedLink(null);
    setCopied(false);
  }

  async function handleJoinWithToken() {
    const raw = joinToken.trim();
    if (!raw) return;
    // Accept both a full URL (http://…/invite/TOKEN) and a bare token
    const token = raw.includes("/invite/") ? raw.split("/invite/")[1].split("?")[0] : raw;
    setJoining(true);
    try {
      await apiFetch<FamilyMember>(`/api/v1/invites/${token}/accept`, { method: "POST" });
      toast.success("הצטרפת למשפחה!");
      // Reload the page so the family store picks up the new membership
      window.location.href = "/dashboard";
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "קישור לא תקין או שפג תוקפו");
    } finally {
      setJoining(false);
    }
  }

  function handleRemoveMember(memberId: string) {
    if (!currentFamily) return;
    toast("להסיר חבר זה מהמשפחה?", {
      action: {
        label: "הסר",
        onClick: async () => {
          try {
            await apiFetch(`/api/v1/families/${currentFamily.id}/members/${memberId}`, {
              method: "DELETE",
            });
            toast.success("חבר הוסר");
            loadData();
          } catch {
            toast.error("שגיאה בהסרת חבר");
          }
        },
      },
      cancel: { label: "ביטול", onClick: () => {} },
    });
  }

  function handleLeaveFamily() {
    if (!currentFamily) return;
    const myMembership = members.find((m) => m.user_id === currentUserId);
    if (!myMembership) return;
    toast("לעזוב את המשפחה?", {
      action: {
        label: "עזוב",
        onClick: async () => {
          try {
            await apiFetch(`/api/v1/families/${currentFamily.id}/members/${myMembership.id}`, {
              method: "DELETE",
            });
            clear();
            toast.success("עזבת את המשפחה");
          } catch {
            toast.error("שגיאה");
          }
        },
      },
      cancel: { label: "ביטול", onClick: () => {} },
    });
  }

  if (!currentFamily) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">משפחה</h1>
        <Card className="text-center py-12">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 mb-2">אין לך משפחה עדיין</p>
          <p className="text-sm text-slate-400 mb-6">צור משפחה חדשה או הצטרף עם קישור הזמנה</p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            צור משפחה
          </Button>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary-500" />
            הצטרף עם קישור הזמנה
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            קיבלת קישור הזמנה? הדבק אותו כאן
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="הדבק קישור או טוקן הזמנה..."
              value={joinToken}
              onChange={(e) => setJoinToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoinWithToken()}
              className="flex-1"
            />
            <Button onClick={handleJoinWithToken} loading={joining} disabled={!joinToken.trim()}>
              הצטרף
            </Button>
          </div>
        </Card>

        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="יצירת משפחה">
          <div className="space-y-4">
            <Input
              label="שם המשפחה"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="לדוגמה: משפחת כהן"
              onKeyDown={(e) => e.key === "Enter" && handleCreateFamily()}
            />
            <div className="flex gap-3">
              <Button onClick={handleCreateFamily} loading={saving} className="flex-1">
                צור
              </Button>
              <Button variant="secondary" onClick={() => setCreateOpen(false)} className="flex-1">
                ביטול
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">משפחה</h1>
          <p className="text-sm text-slate-500 mt-0.5">{currentFamily.name}</p>
        </div>
        {isOwner && (
          <Button onClick={() => { setInviteOpen(true); setGeneratedLink(null); }}>
            <Mail className="w-4 h-4" />
            הזמן חבר
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <Card padding="none">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">
              חברי המשפחה ({members.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 group">
                <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-primary-600">
                    {(member.user_name || member.user_email)?.[0]?.toUpperCase() ?? "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 flex items-center gap-1 flex-wrap">
                    {member.user_name || member.user_email}
                    {member.user_id === currentUserId && (
                      <span className="text-xs text-slate-400">(אתה)</span>
                    )}
                  </p>
                  {member.user_name && (
                    <p className="text-xs text-slate-400 truncate">{member.user_email}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {member.role === "owner" && (
                      <Crown className="w-3 h-3 text-amber-500" />
                    )}
                    <Badge color={member.role === "owner" ? "#f59e0b" : "#6366f1"}>
                      {member.role === "owner" ? "בעלים" : "חבר"}
                    </Badge>
                  </div>
                </div>

                {/* Actions */}
                {member.user_id !== currentUserId && isOwner && member.role !== "owner" && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {!isOwner && (
        <div className="text-center">
          <button
            onClick={handleLeaveFamily}
            className="text-sm text-red-500 hover:underline"
          >
            עזוב את המשפחה
          </button>
        </div>
      )}

      {/* Invite Modal */}
      <Modal open={inviteOpen} onClose={handleCloseInviteModal} title="הזמן חבר למשפחה">
        <div className="space-y-4">
          {!generatedLink ? (
            <>
              <Input
                label="כתובת אימייל"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
              <p className="text-xs text-slate-500">
                קישור הזמנה ישלח לאימייל. תוקפו 7 ימים.
              </p>
              <div className="flex gap-3">
                <Button onClick={handleInvite} loading={saving} className="flex-1">
                  <Mail className="w-4 h-4" />
                  שלח הזמנה
                </Button>
                <Button variant="secondary" onClick={handleCloseInviteModal} className="flex-1">
                  ביטול
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <p className="text-sm text-emerald-700 font-medium">הזמנה נשלחה ל‑{inviteEmail}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">קישור הזמנה</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600 truncate font-mono select-all">
                    {generatedLink}
                  </div>
                  <button
                    onClick={() => handleCopyLink(generatedLink)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copied ? "הועתק" : "העתק"}
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  שלח קישור זה ישירות לחבר שברצונך להוסיף
                </p>
              </div>

              <Button onClick={handleCloseInviteModal} className="w-full">
                סגור
              </Button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
