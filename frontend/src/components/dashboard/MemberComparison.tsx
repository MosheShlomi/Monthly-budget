"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import type { MemberTotal } from "@/types";
import { Card } from "@/components/ui/Card";
import { fmt } from "@/lib/format";

function xAxisTickFormatter(v: number): string {
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
        <div key={String(entry.name)} className="flex items-center gap-2 text-xs text-slate-600">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: "#8b5cf6" }}
          />
          <span>{entry.name}:</span>
          <span className="font-medium">{fmt(Number(entry.value ?? 0))}</span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  data: MemberTotal[];
}

export function MemberComparison({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.user_name ?? d.user_email.split("@")[0],
    סכום: parseFloat(d.total),
  }));

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-900 mb-4">
        השוואה בין חברי משפחה
      </h3>
      {chartData.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
          אין נתונים לחודש זה
        </div>
      ) : (
        <div dir="ltr">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ right: 12, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fontFamily: "Heebo", fill: "#94a3b8" }}
                tickFormatter={xAxisTickFormatter}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fontFamily: "Heebo", fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="סכום" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
