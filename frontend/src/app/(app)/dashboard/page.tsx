"use client";

import { useEffect, useState } from "react";
import { useFamilyStore } from "@/store/familyStore";
import { apiFetch } from "@/lib/api";
import type { DashboardSummary, BudgetGoal } from "@/types";
import { MonthlyBarChart } from "@/components/dashboard/MonthlyBarChart";
import { CategoryDonut } from "@/components/dashboard/CategoryDonut";
import { MemberComparison } from "@/components/dashboard/MemberComparison";
import { PaymentSplit } from "@/components/dashboard/PaymentSplit";
import { BudgetGoalsComparison } from "@/components/dashboard/BudgetGoalsComparison";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { TrendingUp, TrendingDown, Scale } from "lucide-react";
import { fmt } from "@/lib/format";

const MONTH_NAMES = [
  "", "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function periodLabel(months: number[], years: number[]): string {
  const mLabel =
    months.length === 0 ? "כל החודשים"
    : months.length === 1 ? MONTH_NAMES[months[0]]
    : `${months.length} חודשים`;
  const yLabel =
    years.length === 0 ? ""
    : years.length === 1 ? String(years[0])
    : `${years.length} שנים`;
  return [mLabel, yLabel].filter(Boolean).join(" ");
}

export default function DashboardPage() {
  const { currentFamily, members } = useFamilyStore();
  const now = new Date();
  const [months, setMonths] = useState<number[]>([now.getMonth() + 1]);
  const [years, setYears] = useState<number[]>([now.getFullYear()]);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [budgetGoals, setBudgetGoals] = useState<BudgetGoal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentFamily || months.length === 0 || years.length === 0) return;
    setLoading(true);
    const params = new URLSearchParams();
    months.forEach((m) => params.append("months", String(m)));
    years.forEach((y) => params.append("years", String(y)));
    userIds.forEach((id) => params.append("user_ids", id));
    apiFetch<DashboardSummary>(
      `/api/v1/families/${currentFamily.id}/dashboard/summary?${params.toString()}`
    )
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [currentFamily, months, years, userIds]);

  useEffect(() => {
    if (!currentFamily || months.length !== 1 || years.length !== 1) {
      setBudgetGoals([]);
      return;
    }
    apiFetch<BudgetGoal[]>(
      `/api/v1/families/${currentFamily.id}/budget-goals?month=${months[0]}&year=${years[0]}`
    )
      .then(setBudgetGoals)
      .catch(() => setBudgetGoals([]));
  }, [currentFamily, months, years]);

  const monthOptions = MONTH_NAMES.slice(1).map((name, i) => ({
    value: String(i + 1),
    label: name,
  }));

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = now.getFullYear() - 2 + i;
    return { value: String(y), label: String(y) };
  });

  const memberOptions = members.map((m) => ({
    value: m.user_id,
    label: m.user_name || m.user_email,
  }));

  if (!currentFamily) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-slate-500 mb-4">אין משפחה מחוברת</p>
        <a href="/family" className="text-primary-600 hover:underline text-sm">
          צור או הצטרף למשפחה
        </a>
      </div>
    );
  }

  const netSavings = summary ? parseFloat(summary.net_savings) : 0;
  const period = periodLabel(months, years);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">{currentFamily.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MultiSelect
            options={monthOptions}
            selected={months.map(String)}
            onChange={(vals) => setMonths(vals.map(Number))}
            placeholder="כל החודשים"
            className="w-32"
          />
          <MultiSelect
            options={yearOptions}
            selected={years.map(String)}
            onChange={(vals) => setYears(vals.map(Number))}
            placeholder="כל השנים"
            className="w-24"
          />
          <MultiSelect
            options={memberOptions}
            selected={userIds}
            onChange={setUserIds}
            placeholder="כל החברים"
            className="w-36"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : months.length === 0 || years.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-400">בחר חודש ושנה להצגת נתונים</p>
        </Card>
      ) : summary ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {/* Expenses */}
            <Card className="bg-gradient-to-l from-primary-600 to-primary-500 text-white border-0 p-3 sm:p-5">
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium opacity-80 truncate">סה&quot;כ הוצאות</p>
                  <p className="text-base sm:text-3xl font-bold mt-1 truncate" dir="ltr">
                    {fmt(parseFloat(summary.total_spent))}
                  </p>
                  <p className="text-xs opacity-60 mt-1 hidden sm:block">{period}</p>
                </div>
                <TrendingDown className="w-4 h-4 sm:w-6 sm:h-6 opacity-60 flex-shrink-0 mt-0.5" />
              </div>
            </Card>

            {/* Income */}
            <Card className="bg-gradient-to-l from-emerald-600 to-emerald-500 text-white border-0 p-3 sm:p-5">
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium opacity-80 truncate">סה&quot;כ הכנסות</p>
                  <p className="text-base sm:text-3xl font-bold mt-1 truncate" dir="ltr">
                    {fmt(parseFloat(summary.total_income))}
                  </p>
                  <p className="text-xs opacity-60 mt-1 hidden sm:block">{period}</p>
                </div>
                <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 opacity-60 flex-shrink-0 mt-0.5" />
              </div>
            </Card>

            {/* Net savings */}
            <Card
              className={`border-0 text-white p-3 sm:p-5 ${
                netSavings >= 0
                  ? "bg-gradient-to-l from-sky-600 to-sky-500"
                  : "bg-gradient-to-l from-red-600 to-red-500"
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium opacity-80 truncate">חיסכון נטו</p>
                  <p className="text-base sm:text-3xl font-bold mt-1 truncate" dir="ltr">
                    {fmt(netSavings, "auto")}
                  </p>
                  <p className="text-xs opacity-60 mt-1 hidden sm:block">
                    הכנסות פחות הוצאות
                  </p>
                </div>
                <Scale className="w-4 h-4 sm:w-6 sm:h-6 opacity-60 flex-shrink-0 mt-0.5" />
              </div>
            </Card>
          </div>

          {/* Monthly bar - full width */}
          <MonthlyBarChart data={summary.monthly_bars} />

          {/* Category donuts side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <CategoryDonut data={summary.by_category} />
            <CategoryDonut
              data={summary.income_by_category}
              title="הכנסות לפי קטגוריה"
              emptyText="אין הכנסות לחודש זה"
            />
          </div>

          {/* Member + Payment side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <MemberComparison data={summary.by_member} />
            <PaymentSplit data={summary.by_payment_method} />
          </div>

          {/* Budget comparison - full width, only when single month */}
          {budgetGoals.length > 0 && months.length === 1 && years.length === 1 && (
            <BudgetGoalsComparison goals={budgetGoals} month={months[0]} year={years[0]} />
          )}
        </>
      ) : (
        <Card className="text-center py-12">
          <p className="text-slate-400">אין נתונים לתקופה זו</p>
        </Card>
      )}
    </div>
  );
}
