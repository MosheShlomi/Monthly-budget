"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiFetch } from "@/lib/api";
import type { Category, Card, Spending, SpendingCreate } from "@/types";
import { clsx } from "clsx";
import { Plus } from "lucide-react";

const NEW_CAT = "__new__";

const schema = z.object({
  amount: z.number({ invalid_type_error: "הכנס סכום" }).positive("הסכום חייב להיות חיובי"),
  category_id: z.string().min(1, "בחר קטגוריה"),
  payment_method: z.enum(["cash", "card"]),
  card_id: z.string().optional().nullable(),
  date: z.string().min(1, "בחר תאריך"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: SpendingCreate) => Promise<Spending | null>;
  familyId: string;
  initial?: Spending | null;
}

const AUTO_COLORS = [
  "#6366f1", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#a855f7", "#f59e0b", "#ec4899", "#84cc16",
];

export function SpendingForm({ open, onClose, onSave, familyId, initial }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      payment_method: "cash",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const paymentMethod = watch("payment_method");
  const selectedCategory = watch("category_id");

  useEffect(() => {
    if (open && familyId) {
      apiFetch<Category[]>(`/api/v1/families/${familyId}/categories?type=expense`)
        .then(setCategories)
        .catch(() => {});
      apiFetch<Card[]>(`/api/v1/families/${familyId}/cards`)
        .then((c) => setCards(c.filter((x) => x.is_active)))
        .catch(() => {});
    }
  }, [open, familyId]);

  // Auto-select last used card when switching to card payment
  useEffect(() => {
    if (paymentMethod === "card" && !initial) {
      const lastCard = localStorage.getItem("lastUsedCardId");
      if (lastCard) setValue("card_id", lastCard);
    }
  }, [paymentMethod, initial, setValue]);

  useEffect(() => {
    if (initial) {
      reset({
        amount: parseFloat(initial.amount),
        category_id: initial.category_id,
        payment_method: initial.payment_method,
        card_id: initial.card_id ?? undefined,
        date: initial.date,
        notes: initial.notes ?? "",
      });
    } else {
      reset({
        payment_method: "cash",
        date: new Date().toISOString().split("T")[0],
      });
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
          body: JSON.stringify({ name: newCatName.trim(), color, type: "expense" }),
        }
      );
      setCategories((prev) => [...prev, cat]);
      return cat.id;
    } catch {
      return null;
    } finally {
      setCreatingCat(false);
    }
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);

    let categoryId = values.category_id;
    if (categoryId === NEW_CAT) {
      const id = await createNewCategory();
      if (!id) {
        setLoading(false);
        return;
      }
      categoryId = id;
    }

    const cardId = values.payment_method === "card" ? values.card_id ?? null : null;
    if (cardId) localStorage.setItem("lastUsedCardId", cardId);

    const result = await onSave({
      amount: values.amount,
      category_id: categoryId,
      payment_method: values.payment_method,
      card_id: cardId,
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
    <Modal open={open} onClose={onClose} title={initial ? "עריכת הוצאה" : "הוצאה חדשה"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Amount */}
        <Input
          label="סכום (₪)"
          type="number"
          step="0.01"
          placeholder="0.00"
          error={errors.amount?.message}
          {...register("amount", { valueAsNumber: true })}
        />

        {/* Categories */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">קטגוריה</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => { setValue("category_id", cat.id); setNewCatName(""); }}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all",
                  selectedCategory === cat.id
                    ? "text-white border-transparent"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                )}
                style={
                  selectedCategory === cat.id
                    ? { backgroundColor: cat.color, borderColor: cat.color }
                    : {}
                }
              >
                {cat.name}
              </button>
            ))}

            {/* "New category" button */}
            <button
              type="button"
              onClick={() => setValue("category_id", NEW_CAT)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all flex items-center gap-1",
                selectedCategory === NEW_CAT
                  ? "bg-slate-700 text-white border-slate-700"
                  : "bg-white border-dashed border-slate-300 text-slate-500 hover:border-slate-400"
              )}
            >
              <Plus className="w-3 h-3" />
              חדשה...
            </button>
          </div>

          {/* Inline new category input */}
          {selectedCategory === NEW_CAT && (
            <Input
              placeholder="שם הקטגוריה החדשה"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="mt-2"
              autoFocus
            />
          )}

          {errors.category_id && (
            <p className="text-xs text-red-600">{errors.category_id.message}</p>
          )}
        </div>

        {/* Payment method */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">אמצעי תשלום</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setValue("payment_method", "cash")}
              className={clsx(
                "flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all",
                paymentMethod === "cash"
                  ? "bg-green-50 border-green-500 text-green-700"
                  : "bg-white border-slate-200 text-slate-600"
              )}
            >
              מזומן
            </button>
            <button
              type="button"
              onClick={() => setValue("payment_method", "card")}
              className={clsx(
                "flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all",
                paymentMethod === "card"
                  ? "bg-primary-50 border-primary-500 text-primary-700"
                  : "bg-white border-slate-200 text-slate-600"
              )}
            >
              כרטיס אשראי
            </button>
          </div>
        </div>

        {/* Card select */}
        {paymentMethod === "card" && cards.length > 0 && (
          <Select
            label="כרטיס"
            value={watch("card_id") ?? ""}
            options={[
              { value: "", label: "ללא כרטיס ספציפי" },
              ...cards.map((c) => ({ value: c.id, label: c.name })),
            ]}
            onChange={(v) => setValue("card_id", v || null)}
          />
        )}

        {/* Date */}
        <Input
          label="תאריך"
          type="date"
          error={errors.date?.message}
          {...register("date")}
        />

        {/* Notes */}
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
