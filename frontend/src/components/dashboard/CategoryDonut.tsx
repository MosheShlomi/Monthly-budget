"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CategoryTotal } from "@/types";
import { Card } from "@/components/ui/Card";
import { fmt } from "@/lib/format";

interface Props {
  data: CategoryTotal[];
}

export function CategoryDonut({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.category_name,
    value: parseFloat(d.total),
    color: d.category_color,
  }));

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-900 mb-4">
        הוצאות לפי קטגוריה
      </h3>
      {chartData.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
          אין נתונים לחודש זה
        </div>
      ) : (
        <div dir="ltr">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [fmt(value), ""]}
              contentStyle={{
                fontFamily: "Heebo",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
              }}
            />
            <Legend
              formatter={(value) => (
                <span style={{ fontFamily: "Heebo", fontSize: "11px" }}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
