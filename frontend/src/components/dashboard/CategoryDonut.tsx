"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import type { CategoryTotal } from "@/types";
import { Card } from "@/components/ui/Card";
import { fmt } from "@/lib/format";

interface Props {
  data: CategoryTotal[];
  title?: string;
  emptyText?: string;
}

interface TooltipWithTotal extends TooltipProps<ValueType, NameType> {
  total: number;
}

function CustomTooltip({ active, payload, total }: TooltipWithTotal) {
  if (!active || !payload || payload.length === 0) return null;

  const entry = payload[0];
  const value = Number(entry.value ?? 0);
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";

  return (
    <div
      dir="rtl"
      className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 min-w-[160px]"
      style={{ fontFamily: "Heebo" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: String((entry.payload as Record<string, unknown>)?.fill ?? "#94a3b8") }}
        />
        <span className="text-xs font-semibold text-slate-700 truncate">{entry.name}</span>
      </div>
      <p className="text-xs text-slate-600">{fmt(value)}</p>
      <p className="text-xs text-slate-400">{pct}% מהסך הכולל</p>
    </div>
  );
}

function renderLegendText(value: string): React.ReactNode {
  if (!value) return null;
  const truncated = value.length > 12 ? value.slice(0, 12) + "…" : value;
  return (
    <span style={{ fontFamily: "Heebo", fontSize: 11, color: "#64748b" }}>
      {truncated}
    </span>
  );
}

export function CategoryDonut({
  data,
  title = "הוצאות לפי קטגוריה",
  emptyText = "אין נתונים לחודש זה",
}: Props) {
  const total = data.reduce((sum, d) => sum + parseFloat(d.total), 0);
  const displayData = data.slice(0, 6);

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[240px]">
          <p className="text-sm text-slate-400">{emptyText}</p>
        </div>
      ) : (
        <div className="relative" style={{ height: 240 }}>
          {/* Center label overlay */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"
            style={{ paddingBottom: "2.5rem" }}
          >
            <span className="text-sm font-bold text-slate-800">{fmt(total)}</span>
            <span className="text-xs text-slate-400">סה&quot;כ</span>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={displayData}
                dataKey="total"
                nameKey="category_name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                startAngle={90}
                endAngle={-270}
              >
                {displayData.map((entry) => (
                  <Cell key={entry.category_id} fill={entry.category_color} />
                ))}
              </Pie>
              <Tooltip
                content={(props) => (
                  <CustomTooltip {...props} total={total} />
                )}
              />
              <Legend
                formatter={renderLegendText}
                wrapperStyle={{ fontFamily: "Heebo", fontSize: 11 }}
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
