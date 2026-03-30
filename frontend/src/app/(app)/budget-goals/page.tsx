"use client";

import { useEffect, useState, useRef } from "react";
import { useFamilyStore } from "@/store/familyStore";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";
import type { BudgetGoal, Category } from "@/types";
import { clsx } from "clsx";
import { fmt } from "@/lib/format";

type Tab = "expense" | "income";

const MONTH_NAMES = [
  "", "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function nextMonthYear(): { month: number; year: number } {
  const now = new Date();
  const m = now.getMonth() + 2;
  if (m > 12) return { month: 1, year: now.getFullYear() + 1 };
  return { month: m, year: now.getFullYear() };
}

interface GoalRowProps {
  category: Category;
  goal: BudgetGoal | undefined;
  month: number;
  year: number;
  familyId: string;
  onSaved: (goal: BudgetGoal) => void;
}

function GoalRow({ category, goal, month, year, familyId, onSaved }: GoalRowProps) {
  const [value, setValue] = useState(goal ? parseFloat(goal.limit_amount).toFixed(0) : "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset local value when goal or month/year changes
  useEffect(() => {
    setValue(goal ? parseFloat(goal.limit_amount).toFixed(0) : "");
  }, [goal, month, year]);

  async function save() {
    const amount = parseFloat(value);
    if (isNaN(amount) || amount < 0) return;
    // Skip if unchanged
    if (goal && parseFloat(goal.limit_amount) === amount) return;
    // Skip if empty (no goal to create)
    if (!value.trim() && !goal) return;

    setSaving(true);
    try {
      const saved = await apiFetch<BudgetGoal>(`/api/v1/families/${familyId}/budget-goals`, {
        method: "PUT",
        body: JSON.stringify({
          category_id: category.id,
          month,
          year,
          limit_amount: amount || 0,
        }),
      });
      onSaved(saved);
    } catch {
      toast.error("שגיאה בשמירת יעד");
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    }
  }

  const limit = goal ? parseFloat(goal.limit_amount) : 0;
  const spent = goal ? parseFloat(goal.spent || "0") : 0;
  const isIncome = category.type === "income";
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  const isOver = limit > 0 && spent > limit;
  const isUnder = isIncome && limit > 0 && spent < limit;

  return (
    <div className="flex flex-col gap-2 py-3 border-b border-slate-100 last:border-0">
      {/* Top row: color dot + name + input + saving indicator */}
      <div className="flex items-center gap-2">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: category.color || "#6366f1" }}
        />
        <span className="flex-1 text-sm font-medium text-slate-800 truncate">
          {category.name}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-xs text-slate-400">₪</span>
          <input
            ref={inputRef}
            type="number"
            min="0"
            step="1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={save}
            onKeyDown={onKeyDown}
            placeholder="אין יעד"
            className={clsx(
              "w-20 sm:w-24 text-left text-sm border rounded-lg px-2 py-1 outline-none transition",
              "border-slate-200 focus:border-primary-400 focus:ring-1 focus:ring-primary-200",
              "text-slate-800 placeholder-slate-300"
            )}
          />
          {saving && <Spinner size="sm" />}
        </div>
      </div>

      {/* Progress bar — only shown when a goal exists */}
      {goal && limit > 0 && (
        <div className="pl-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400" dir="ltr">
              {fmt(spent)} / {fmt(limit)}
            </span>
            <span
              className={clsx(
                "text-xs font-medium",
                isOver ? "text-red-500" : isUnder ? "text-amber-500" : "text-emerald-600"
              )}
            >
              {pct.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className={clsx(
                "h-1.5 rounded-full transition-all",
                isIncome
                  ? isOver ? "bg-emerald-500" : "bg-amber-400"
                  : isOver ? "bg-red-500" : pct > 80 ? "bg-orange-400" : "bg-primary-500"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          {!isIncome && isOver && (
            <p className="text-xs text-red-500 mt-0.5" dir="ltr">
              חרגת ב-{fmt(spent - limit)}
            </p>
          )}
          {isIncome && isUnder && (
            <p className="text-xs text-amber-500 mt-0.5" dir="ltr">
              חסר {fmt(limit - spent)} ליעד
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  categories: Category[];
  goalsMap: Map<string, BudgetGoal>;
  month: number;
  year: number;
  familyId: string;
  onSaved: (goal: BudgetGoal) => void;
}

function Section({ title, categories, goalsMap, month, year, familyId, onSaved }: SectionProps) {
  if (categories.length === 0) return null;
  return (
    <Card>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">{title}</h2>
      <div>
        {categories.map((cat) => (
          <GoalRow
            key={cat.id}
            category={cat}
            goal={goalsMap.get(cat.id)}
            month={month}
            year={year}
            familyId={familyId}
            onSaved={onSaved}
          />
        ))}
      </div>
    </Card>
  );
}

export default function BudgetGoalsPage() {
  const { currentFamily } = useFamilyStore();
  const { month: defaultMonth, year: defaultYear } = nextMonthYear();
  const [tab, setTab] = useState<Tab>("expense");
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goalsMap, setGoalsMap] = useState<Map<string, BudgetGoal>>(new Map());
  const [loading, setLoading] = useState(false);

  const now = new Date();

  useEffect(() => {
    if (!currentFamily) return;
    apiFetch<Category[]>(`/api/v1/families/${currentFamily.id}/categories`)
      .then(setCategories)
      .catch(() => {});
  }, [currentFamily]);

  useEffect(() => {
    if (!currentFamily) return;
    setLoading(true);
    apiFetch<BudgetGoal[]>(
      `/api/v1/families/${currentFamily.id}/budget-goals?month=${month}&year=${year}`
    )
      .then((goals) => {
        setGoalsMap(new Map(goals.map((g) => [g.category_id, g])));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentFamily, month, year]);

  function handleSaved(goal: BudgetGoal) {
    setGoalsMap((prev) => new Map(prev).set(goal.category_id, goal));
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

  const visibleCategories = categories.filter((c) => c.type === tab);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">יעדי תקציב</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {MONTH_NAMES[month]} {year}
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={String(month)}
            options={monthOptions}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-32"
          />
          <Select
            value={String(year)}
            options={yearOptions}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-24"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab("expense")}
          className={clsx(
            "px-5 py-2 rounded-lg text-sm font-medium transition-all",
            tab === "expense"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          הוצאות
        </button>
        <button
          onClick={() => setTab("income")}
          className={clsx(
            "px-5 py-2 rounded-lg text-sm font-medium transition-all",
            tab === "income"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          הכנסות
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <Section
          title={tab === "expense" ? "יעדי הוצאות" : "יעדי הכנסות"}
          categories={visibleCategories}
          goalsMap={goalsMap}
          month={month}
          year={year}
          familyId={currentFamily.id}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
