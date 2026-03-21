"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

const schema = z
  .object({
    full_name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
    email: z.string().email("כתובת אימייל לא תקינה"),
    password: z.string().min(6, "סיסמה חייבת להכיל לפחות 6 תווים"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "הסיסמאות אינן תואמות",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectTo}`,
          data: { full_name: values.full_name },
        },
      });
      if (error) throw error;
      setSuccess(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "שגיאה בהרשמה";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">נרשמת בהצלחה!</h2>
        <p className="text-slate-500 text-sm mb-2">
          שלחנו לך אימייל אישור. לחץ על הקישור באימייל כדי להפעיל את החשבון.
        </p>
        {redirectTo !== "/dashboard" && (
          <p className="text-xs text-primary-600 mb-4">
            לאחר האישור תועבר אוטומטית להצטרף למשפחה.
          </p>
        )}
        <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`}>
          <Button className="w-full">התחבר</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary-200">
          <Wallet className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">תקציב משפחתי</h1>
        <p className="text-slate-500 text-sm mt-1">יצירת חשבון חדש</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">
          הרשמה
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="שם מלא"
            type="text"
            placeholder="ישראל ישראלי"
            error={errors.full_name?.message}
            {...register("full_name")}
          />
          <Input
            label="כתובת אימייל"
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="סיסמה"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label="אימות סיסמה"
            type="password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            הירשם
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          כבר יש לך חשבון?{" "}
          <Link
            href="/login"
            className="text-primary-600 font-medium hover:underline"
          >
            התחבר
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-slate-100 flex items-center justify-center p-4">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
