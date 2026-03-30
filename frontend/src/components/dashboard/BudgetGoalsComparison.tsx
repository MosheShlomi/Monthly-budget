"use client";

import type { BudgetGoal } from "@/types";
import { Card } from "@/components/ui/Card";
import { fmt } from "@/lib/format";

const MONTH_NAMES = [
  "", "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

interface Props {
  goals: BudgetGoal[];
  month: number;
  year: number;
}

function pct(goal: BudgetGoal): number {
  const spent = parseFloat(goal.spent ?? "0");
  const limit = parseFloat(goal.limit_amount);
  if (limit === 0) return 0;
  return (spent / limit) * 100;
}

function barColor(percentage: number): string {
  if (percentage > 100) return "bg-red-400";
  if (percentage >= 70) return "bg-amber-400";
  return "bg-emerald-400";
}

function GoalRow({ goal }: { goal: BudgetGoal }) {
  const percentage = pct(goal);
  const spent = parseFloat(goal.spent ?? "0");
  const limit = parseFloat(goal.limit_amount);
  const barWidth = Math.min(percentage, 100);
  const isOver = percentage > 100;

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Left: dot + name */}
      <div className="flex items-center gap-2 w-28 flex-shrink-0">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: goal.category_color ?? "#94a3b8" }}
        />
        <span className="text-xs text-slate-700 truncate">{goal.category_name ?? "—"}</span>
      </div>

      {/* Middle: progress bar */}
      <div className="flex-1 relative h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`absolute right-0 top-0 h-full rounded-full transition-all ${barColor(percentage)}`}
          style={{ width: `${barWidth}%`, right: "auto", left: 0 }}
        />
        {isOver && (
          <div className="absolute left-0 top-0 h-full w-1 bg-red-600 rounded-r-full" />
        )}
      </div>

      {/* Right: amounts + pct */}
      <div className="flex flex-col items-end w-36 flex-shrink-0" dir="ltr">
        <span className="text-xs font-medium text-slate-700">
          {fmt(spent)} / {fmt(limit)}
        </span>
        <span
          className={`text-xs font-semibold ${
            isOver ? "text-red-500" : percentage >= 70 ? "text-amber-500" : "text-emerald-500"
          }`}
        >
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function GoalSection({ title, goals }: { title: string; goals: BudgetGoal[] }) {
  const sorted = [...goals].sort((a, b) => pct(b) - pct(a));

  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        {title}
      </p>
      <div className="divide-y divide-slate-50">
        {sorted.map((goal) => (
          <GoalRow key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
}

export function BudgetGoalsComparison({ goals, month, year }: Props) {
  if (goals.length === 0) return null;

  const expenseGoals = goals.filter((g) => g.category_type === "expense" || g.category_type === undefined);
  const incomeGoals = goals.filter((g) => g.category_type === "income");
  const hasBoth = expenseGoals.length > 0 && incomeGoals.length > 0;
  const monthLabel = MONTH_NAMES[month] ?? "";

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">תקציב מול בפועל</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          {monthLabel} {year}
        </p>
      </div>

      {hasBoth ? (
        <>
          <GoalSection title="הוצאות" goals={expenseGoals} />
          <GoalSection title="הכנסות" goals={incomeGoals} />
        </>
      ) : (
        <div className="divide-y divide-slate-50">
          {[...goals].sort((a, b) => pct(b) - pct(a)).map((goal) => (
            <GoalRow key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </Card>
  );
}
