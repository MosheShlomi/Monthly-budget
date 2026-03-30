"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import type { MonthlyBar } from "@/types";
import { Card } from "@/components/ui/Card";
import { fmt } from "@/lib/format";

const MONTH_NAMES = [
  "", "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

const BAR_COLORS: Record<string, string> = {
  הוצאות: "#6366f1",
  הכנסות: "#10b981",
};

function yAxisTickFormatter(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K ₪`;
  return `₪${v}`;
}

function CustomTooltip({ active, payload, label }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      dir="rtl"
      className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 min-w-[140px]"
      style={{ fontFamily: "Heebo" }}
    >
      <p className="text-xs font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={String(entry.name)} className="flex items-center gap-2 text-xs text-slate-600 mb-1">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: BAR_COLORS[String(entry.name)] ?? "#94a3b8" }}
          />
          <span>{entry.name}:</span>
          <span className="font-medium">{fmt(Number(entry.value ?? 0))}</span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  data: MonthlyBar[];
}

export function MonthlyBarChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: MONTH_NAMES[d.month],
    הוצאות: parseFloat(d.total),
    הכנסות: parseFloat(d.income),
  }));

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-900 mb-4">
        הכנסות והוצאות חודשיות
      </h3>
      <div dir="ltr">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fontFamily: "Heebo", fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fontFamily: "Heebo", fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={yAxisTickFormatter}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontFamily: "Heebo", fontSize: 12 }} />
            <Bar dataKey="הוצאות" fill="#6366f1" radius={[6, 6, 0, 0]} />
            <Bar dataKey="הכנסות" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
