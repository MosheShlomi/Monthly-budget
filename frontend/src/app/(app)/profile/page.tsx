"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "sonner";
import { Camera, User } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useFamilyStore } from "@/store/familyStore";
import { apiFetch } from "@/lib/api";
import type { FamilyMember } from "@/types";

const profileSchema = z.object({
  full_name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
});

const passwordSchema = z
  .object({
    password: z.string().min(6, "סיסמה חייבת להכיל לפחות 6 תווים"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "הסיסמאות אינן תואמות",
    path: ["confirmPassword"],
  });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

const FAMILY_STATUS_OPTIONS = [
  { value: "husband", label: "בעל" },
  { value: "wife", label: "אישה" },
  { value: "son", label: "בן" },
  { value: "daughter", label: "בת" },
  { value: "father", label: "אבא" },
  { value: "mother", label: "אמא" },
  { value: "grandfather", label: "סבא" },
  { value: "grandmother", label: "סבתא" },
  { value: "other", label: "אחר" },
];

export default function ProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [familyStatus, setFamilyStatus] = useState<string>("");
  const [savingStatus, setSavingStatus] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentFamily, members, setMembers } = useFamilyStore();

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
  });
  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        profileForm.setValue(
          "full_name",
          user.user_metadata?.full_name ?? ""
        );
        setAvatarUrl(user.user_metadata?.avatar_url ?? null);

        const myMember = members.find((m) => m.user_id === user.id);
        if (myMember?.family_status) setFamilyStatus(myMember.family_status);
      }
    });
  }, [profileForm, members]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: url },
      });
      if (updateError) throw updateError;

      setAvatarUrl(url);
      toast.success("התמונה עודכנה בהצלחה");
    } catch {
      toast.error("שגיאה בהעלאת תמונה");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onSaveProfile(values: ProfileValues) {
    setSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: values.full_name },
      });
      if (error) throw error;
      setUser((prev) =>
        prev
          ? {
              ...prev,
              user_metadata: { ...prev.user_metadata, full_name: values.full_name },
            }
          : prev
      );
      toast.success("הפרופיל עודכן בהצלחה");
    } catch {
      toast.error("שגיאה בעדכון הפרופיל");
    } finally {
      setSavingProfile(false);
    }
  }

  async function onSaveFamilyStatus() {
    if (!currentFamily) return;
    setSavingStatus(true);
    try {
      const updated = await apiFetch<FamilyMember>(
        `/api/v1/families/${currentFamily.id}/members/me`,
        {
          method: "PATCH",
          body: JSON.stringify({ family_status: familyStatus || null }),
        }
      );
      setMembers(members.map((m) => (m.user_id === updated.user_id ? updated : m)));
      toast.success("התפקיד עודכן בהצלחה");
    } catch {
      toast.error("שגיאה בעדכון התפקיד");
    } finally {
      setSavingStatus(false);
    }
  }

  async function onChangePassword(values: PasswordValues) {
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });
      if (error) throw error;
      passwordForm.reset();
      toast.success("הסיסמה עודכנה בהצלחה");
    } catch {
      toast.error("שגיאה בעדכון הסיסמה");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">הפרופיל שלי</h1>

      {/* Avatar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          תמונת פרופיל
        </h2>
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="תמונת פרופיל"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-primary-600" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 left-0 w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-900">
              {user?.user_metadata?.full_name || user?.email}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-primary-600 hover:underline mt-2 disabled:opacity-50"
            >
              {uploading ? "מעלה..." : "שנה תמונה"}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
      </div>

      {/* Personal info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          פרטים אישיים
        </h2>
        <form
          onSubmit={profileForm.handleSubmit(onSaveProfile)}
          className="space-y-4"
        >
          <Input
            label="שם מלא"
            placeholder="ישראל ישראלי"
            error={profileForm.formState.errors.full_name?.message}
            {...profileForm.register("full_name")}
          />
          <Input
            label="אימייל"
            value={user?.email ?? ""}
            disabled
            readOnly
            hint="לא ניתן לשנות את כתובת האימייל"
          />
          <Button type="submit" loading={savingProfile}>
            שמור שינויים
          </Button>
        </form>
      </div>

      {/* Family status */}
      {currentFamily && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            תפקיד במשפחה
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            יוצג כתג ליד שם המשפחה בסרגל הניווט
          </p>
          <div className="space-y-4">
            <Select
              label="תפקיד"
              value={familyStatus}
              options={FAMILY_STATUS_OPTIONS}
              placeholder="בחר תפקיד"
              onChange={setFamilyStatus}
            />
            <Button onClick={onSaveFamilyStatus} loading={savingStatus}>
              שמור תפקיד
            </Button>
          </div>
        </div>
      )}

      {/* Password */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          שינוי סיסמה
        </h2>
        <form
          onSubmit={passwordForm.handleSubmit(onChangePassword)}
          className="space-y-4"
        >
          <Input
            label="סיסמה חדשה"
            type="password"
            placeholder="••••••••"
            error={passwordForm.formState.errors.password?.message}
            {...passwordForm.register("password")}
          />
          <Input
            label="אימות סיסמה חדשה"
            type="password"
            placeholder="••••••••"
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register("confirmPassword")}
          />
          <Button type="submit" loading={savingPassword}>
            עדכן סיסמה
          </Button>
        </form>
      </div>
    </div>
  );
}
