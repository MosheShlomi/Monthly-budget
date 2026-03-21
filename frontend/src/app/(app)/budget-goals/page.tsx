"use client";

import { useEffect, useState } from "react";
import { Plus, Target } from "lucide-react";
import { useFamilyStore } from "@/store/familyStore";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";
import type { BudgetGoal, Category } from "@/types";
import { clsx } from "clsx";
import { fmt } from "@/lib/format";

const MONTH_NAMES = [
  "", "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export default function BudgetGoalsPage() {
  const { currentFamily } = useFamilyStore();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [goals, setGoals] = useState<BudgetGoal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadGoals() {
    if (!currentFamily) return;
    setLoading(true);
    try {
      const data = await apiFetch<BudgetGoal[]>(
        `/api/v1/families/${currentFamily.id}/budget-goals?month=${month}&year=${year}`
      );
      setGoals(data);
    } catch {
      toast.error("שגיאה בטעינת יעדים");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (currentFamily) {
      apiFetch<Category[]>(`/api/v1/families/${currentFamily.id}/categories`)
        .then(setCategories)
        .catch(() => {});
    }
  }, [currentFamily]);

  useEffect(() => {
    loadGoals();
  }, [currentFamily, month, year]);

  async function handleSave() {
    if (!currentFamily || !selectedCategory || !limitAmount) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/families/${currentFamily.id}/budget-goals`, {
        method: "PUT",
        body: JSON.stringify({
          category_id: selectedCategory,
          month,
          year,
          limit_amount: parseFloat(limitAmount),
        }),
      });
      toast.success("יעד נשמר");
      setFormOpen(false);
      loadGoals();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(goalId: string) {
    if (!currentFamily) return;
    if (!confirm("למחוק יעד זה?")) return;
    try {
      await apiFetch(`/api/v1/families/${currentFamily.id}/budget-goals/${goalId}`, {
        method: "DELETE",
      });
      toast.success("יעד נמחק");
      loadGoals();
    } catch {
      toast.error("שגיאה במחיקת יעד");
    }
  }

  if (!currentFamily) {
    return <div className="text-center py-20 text-slate-400">אין משפחה מחוברת</div>;
  }

  const monthOptions = MONTH_NAMES.slice(1).map((name, i) => ({
    value: String(i + 1),
    label: name,
  }));

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = now.getFullYear() - 2 + i;
    return { value: String(y), label: String(y) };
  });

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">יעדי תקציב</h1>
        <Button onClick={() => { setSelectedCategory(""); setLimitAmount(""); setFormOpen(true); }}>
          <Plus className="w-4 h-4" />
          יעד חדש
        </Button>
      </div>

      <div className="flex gap-3">
        <Select
          value={String(month)}
          options={monthOptions}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="w-36"
        />
        <Select
          value={String(year)}
          options={yearOptions}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-24"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : goals.length === 0 ? (
        <Card className="text-center py-12">
          <Target className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">לא הוגדרו יעדים ל{MONTH_NAMES[month]} {year}</p>
          <Button onClick={() => setFormOpen(true)} className="mt-4" variant="outline">
            הגדר יעד ראשון
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const limit = parseFloat(goal.limit_amount);
            const spent = parseFloat(goal.spent || "0");
            const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
            const isOver = spent > limit;

            return (
              <Card key={goal.id} padding="sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: goal.category_color || "#6366f1" }}
                    />
                    <span className="text-sm font-semibold text-slate-900">
                      {goal.category_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={clsx(
                        "text-sm font-medium",
                        isOver ? "text-red-600" : "text-slate-600"
                      )}
                      dir="ltr"
                    >
                      {fmt(spent)} / {fmt(limit)}
                    </span>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      מחק
                    </button>
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div
                    className={clsx(
                      "h-2.5 rounded-full transition-all",
                      isOver ? "bg-red-500" : pct > 80 ? "bg-orange-400" : "bg-primary-500"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-400">{pct.toFixed(0)}%</span>
                  {isOver && (
                    <span className="text-xs text-red-500 font-medium" dir="ltr">
                      חרגת ב-{fmt(spent - limit)}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="יעד תקציב חדש">
        <div className="space-y-4">
          <Select
            label="קטגוריה"
            value={selectedCategory}
            options={categoryOptions}
            onChange={(e) => setSelectedCategory(e.target.value)}
            placeholder="בחר קטגוריה"
          />
          <Input
            label="סכום מקסימלי (₪)"
            type="number"
            step="0.01"
            value={limitAmount}
            onChange={(e) => setLimitAmount(e.target.value)}
            placeholder="0.00"
          />
          <p className="text-xs text-slate-500">
            יעד ל{MONTH_NAMES[month]} {year}
          </p>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} loading={saving} className="flex-1">
              שמור
            </Button>
            <Button variant="secondary" onClick={() => setFormOpen(false)} className="flex-1">
              ביטול
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
