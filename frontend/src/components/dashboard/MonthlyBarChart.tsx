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
import type { MonthlyBar } from "@/types";
import { Card } from "@/components/ui/Card";
import { fmt } from "@/lib/format";

const MONTH_NAMES = [
  "", "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

function compactNum(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return String(v);
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
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fontFamily: "Heebo" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fontFamily: "Heebo" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={compactNum}
              width={36}
            />
            <Tooltip
              formatter={(value: number, name: string) => [fmt(value), name]}
              contentStyle={{
                fontFamily: "Heebo",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              }}
            />
            <Legend wrapperStyle={{ fontFamily: "Heebo", fontSize: 12 }} />
            <Bar dataKey="הוצאות" fill="#6366f1" radius={[6, 6, 0, 0]} />
            <Bar dataKey="הכנסות" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
