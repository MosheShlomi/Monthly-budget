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
import { Card } from "@/components/ui/Card";
import { fmt } from "@/lib/format";

interface Props {
  data: Record<string, string>;
}

const COLORS: Record<string, string> = { cash: "#22c55e", card: "#6366f1" };
const LABELS: Record<string, string> = { cash: "מזומן", card: "כרטיס אשראי" };

interface ChartEntry {
  name: string;
  value: number;
  fill: string;
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
        <span className="text-xs font-semibold text-slate-700">{entry.name}</span>
      </div>
      <p className="text-xs text-slate-600">{fmt(value)}</p>
      <p className="text-xs text-slate-400">{pct}% מהסך הכולל</p>
    </div>
  );
}

interface CustomLegendProps {
  payload?: Array<{ value: string; color: string }>;
  chartData: ChartEntry[];
  total: number;
}

function CustomLegend({ payload, chartData, total }: CustomLegendProps) {
  if (!payload) return null;

  return (
    <ul dir="rtl" className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
      {payload.map((entry) => {
        const match = chartData.find((d) => d.name === entry.value);
        const value = match?.value ?? 0;
        const pct = total > 0 ? ((value / total) * 100).toFixed(0) : "0";

        return (
          <li key={entry.value} className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "Heebo" }}>
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-600">{entry.value}</span>
            <span className="text-slate-400">({pct}%)</span>
            <span className="text-slate-700 font-medium">{fmt(value)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function PaymentSplit({ data }: Props) {
  const chartData: ChartEntry[] = Object.entries(data).map(([key, value]) => ({
    name: LABELS[key] ?? key,
    value: parseFloat(value),
    fill: COLORS[key] ?? "#6b7280",
  }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-900 mb-4">
        אמצעי תשלום
      </h3>
      {chartData.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
          אין נתונים לחודש זה
        </div>
      ) : (
        <div dir="ltr">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="45%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                content={(props) => <CustomTooltip {...props} total={total} />}
              />
              <Legend
                content={(props) => (
                  <CustomLegend
                    payload={props.payload as Array<{ value: string; color: string }> | undefined}
                    chartData={chartData}
                    total={total}
                  />
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
