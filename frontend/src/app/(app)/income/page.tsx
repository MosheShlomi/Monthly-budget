"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { clsx } from "clsx";
import { useFamilyStore } from "@/store/familyStore";
import { fmt, fmtStr } from "@/lib/format";
import { useIncomes } from "@/hooks/useIncomes";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { MultiSelect } from "@/components/ui/MultiSelect";
import type { Category, Income, IncomeCreate, IncomeFilters } from "@/types";

const MONTH_NAMES = [
  "", "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

const NEW_CAT = "__new__";
const AUTO_COLORS = [
  "#10b981", "#0ea5e9", "#8b5cf6", "#f59e0b", "#06b6d4",
  "#22c55e", "#f97316", "#a855f7", "#ec4899", "#6366f1",
];

const schema = z.object({
  amount: z.number({ invalid_type_error: "הכנס סכום" }).positive("הסכום חייב להיות חיובי"),
  category_id: z.string().optional().nullable(),
  date: z.string().min(1, "בחר תאריך"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface FormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: IncomeCreate) => Promise<Income | null>;
  familyId: string;
  initial?: Income | null;
  categories: Category[];
  onCategoryCreated: (cat: Category) => void;
}

function IncomeForm({ open, onClose, onSave, familyId, initial, categories, onCategoryCreated }: FormProps) {
  const [loading, setLoading] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().split("T")[0] },
  });

  const watchedCategory = watch("category_id");

  useEffect(() => {
    if (initial) {
      reset({
        amount: parseFloat(initial.amount),
        category_id: initial.category_id ?? undefined,
        date: initial.date,
        notes: initial.notes ?? "",
      });
    } else {
      reset({ date: new Date().toISOString().split("T")[0] });
    }
    setNewCatName("");
  }, [initial, reset, open]);

  async function createNewCategory(): Promise<string | null> {
    if (!newCatName.trim()) return null;
    setCreatingCat(true);
    try {
      const color = AUTO_COLORS[Math.floor(Math.random() * AUTO_COLORS.length)];
      const cat = await apiFetch<Category>(
        `/api/v1/families/${familyId}/categories`,
        {
          method: "POST",
          body: JSON.stringify({ name: newCatName.trim(), color, type: "income" }),
        }
      );
      onCategoryCreated(cat);
      return cat.id;
    } catch {
      return null;
    } finally {
      setCreatingCat(false);
    }
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    let categoryId = values.category_id ?? null;

    if (categoryId === NEW_CAT) {
      const id = await createNewCategory();
      categoryId = id;
    }

    const result = await onSave({
      amount: values.amount,
      category_id: categoryId || null,
      date: values.date,
      notes: values.notes || undefined,
    });
    setLoading(false);
    if (result) {
      onClose();
      reset();
      setNewCatName("");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? "עריכת הכנסה" : "הכנסה חדשה"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="סכום (₪)"
          type="number"
          step="0.01"
          placeholder="0.00"
          error={errors.amount?.message}
          {...register("amount", { valueAsNumber: true })}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">קטגוריה (אופציונלי)</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setValue("category_id", null); setNewCatName(""); }}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all",
                !watchedCategory || watchedCategory === ""
                  ? "bg-slate-700 text-white border-slate-700"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              )}
            >
              ללא קטגוריה
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { setValue("category_id", cat.id); setNewCatName(""); }}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all",
                  watchedCategory === cat.id
                    ? "text-white border-transparent"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                )}
                style={
                  watchedCategory === cat.id
                    ? { backgroundColor: cat.color, borderColor: cat.color }
                    : {}
                }
              >
                {cat.name}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setValue("category_id", NEW_CAT)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all flex items-center gap-1",
                watchedCategory === NEW_CAT
                  ? "bg-slate-700 text-white border-slate-700"
                  : "bg-white border-dashed border-slate-300 text-slate-500 hover:border-slate-400"
              )}
            >
              <Plus className="w-3 h-3" />
              חדשה...
            </button>
          </div>

          {watchedCategory === NEW_CAT && (
            <Input
              placeholder="שם הקטגוריה החדשה"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="mt-2"
              autoFocus
            />
          )}
        </div>

        <Input
          label="תאריך"
          type="date"
          error={errors.date?.message}
          {...register("date")}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">הערות (אופציונלי)</label>
          <textarea
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            rows={2}
            placeholder="הערה..."
            {...register("notes")}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" className="flex-1" loading={loading || creatingCat}>
            {initial ? "עדכן" : "הוסף"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            ביטול
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function IncomePage() {
  const { currentFamily, members } = useFamilyStore();
  const { incomes, loading, fetchIncomes, createIncome, updateIncome, deleteIncome } =
    useIncomes(currentFamily?.id ?? null);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Income | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const now = new Date();
  const [filters, setFilters] = useState<IncomeFilters>({
    months: [now.getMonth() + 1],
    years: [now.getFullYear()],
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user.id) setCurrentUserId(data.session.user.id);
    });
  }, []);

  useEffect(() => {
    if (currentFamily) {
      apiFetch<Category[]>(`/api/v1/families/${currentFamily.id}/categories?type=income`)
        .then(setCategories)
        .catch(() => {});
    }
  }, [currentFamily]);

  useEffect(() => {
    fetchIncomes(filters);
  }, [fetchIncomes, filters]);

  const isOwner = members.find((m) => m.user_id === currentUserId)?.role === "owner";
  const total = incomes.reduce((sum, i) => sum + parseFloat(i.amount), 0);

  async function handleSave(data: IncomeCreate): Promise<Income | null> {
    if (editTarget) {
      const ok = await updateIncome(editTarget.id, data);
      return ok ? { ...editTarget, ...data, amount: String(data.amount) } as Income : null;
    }
    return createIncome(data);
  }

  function handleEdit(income: Income) {
    setEditTarget(income);
    setFormOpen(true);
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditTarget(null);
  }

  const monthOptions = MONTH_NAMES.slice(1).map((name, i) => ({ value: String(i + 1), label: name }));
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = now.getFullYear() - 2 + i;
    return { value: String(y), label: String(y) };
  });
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const memberOptions = members.map((m) => ({ value: m.user_id, label: m.user_name || m.user_email }));

  if (!currentFamily) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p>אין משפחה מחוברת. <a href="/family" className="text-primary-600">צור משפחה</a></p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">הכנסות</h1>
          {incomes.length > 0 && (
            <p className="text-sm text-slate-500 mt-0.5">
              {incomes.length} רשומות · סה&quot;כ <span dir="ltr">{fmt(total, "+")}</span>
            </p>
          )}
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          הכנסה חדשה
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <MultiSelect
          options={monthOptions}
          selected={filters.months?.map(String) ?? []}
          onChange={(vals) =>
            setFilters((f) => ({ ...f, months: vals.length ? vals.map(Number) : undefined }))
          }
          placeholder="כל החודשים"
          className="w-36"
        />
        <MultiSelect
          options={yearOptions}
          selected={filters.years?.map(String) ?? []}
          onChange={(vals) =>
            setFilters((f) => ({ ...f, years: vals.length ? vals.map(Number) : undefined }))
          }
          placeholder="כל השנים"
          className="w-28"
        />
        <MultiSelect
          options={categoryOptions}
          selected={filters.category_ids ?? []}
          onChange={(vals) =>
            setFilters((f) => ({ ...f, category_ids: vals.length ? vals : undefined }))
          }
          placeholder="כל הקטגוריות"
          className="w-40"
        />
        <MultiSelect
          options={memberOptions}
          selected={filters.user_ids ?? []}
          onChange={(vals) =>
            setFilters((f) => ({ ...f, user_ids: vals.length ? vals : undefined }))
          }
          placeholder="כל החברים"
          className="w-40"
        />
      </div>

      <Card padding="none">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : incomes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingUp className="w-10 h-10 text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm">אין הכנסות לתקופה זו</p>
            <button
              onClick={() => setFormOpen(true)}
              className="mt-3 text-sm text-primary-600 hover:underline"
            >
              הוסף הכנסה ראשונה
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {incomes.map((income) => {
              const canEdit = isOwner || income.user_id === currentUserId;
              return (
                <li
                  key={income.id}
                  className="flex items-center gap-3 px-4 py-3 group hover:bg-slate-50 transition-colors"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: income.category_color ?? "#10b981" }}
                  />
                  <span className="text-base font-semibold text-emerald-600 min-w-[80px]" dir="ltr">
                    {fmtStr(income.amount, "+")}
                  </span>
                  {income.category_name && (
                    <span
                      className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: income.category_color ?? "#10b981" }}
                    >
                      {income.category_name}
                    </span>
                  )}
                  {income.notes && (
                    <span className="text-sm text-slate-500 truncate flex-1">{income.notes}</span>
                  )}
                  {!income.notes && <span className="flex-1" />}
                  <span className="text-xs text-slate-400 hidden sm:block flex-shrink-0">{income.date}</span>
                  <span className="text-xs text-slate-400 hidden md:block flex-shrink-0 max-w-[120px] truncate">
                    {income.user_name || income.user_email?.split("@")[0]}
                  </span>
                  {canEdit && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(income)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteIncome(income.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <IncomeForm
        open={formOpen}
        onClose={handleCloseForm}
        onSave={handleSave}
        familyId={currentFamily.id}
        initial={editTarget}
        categories={categories}
        onCategoryCreated={(cat) => setCategories((prev) => [...prev, cat])}
      />
    </div>
  );
}
