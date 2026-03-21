"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/Card";
import { fmt } from "@/lib/format";

interface Props {
  data: Record<string, string>;
}

const COLORS = { cash: "#22c55e", card: "#6366f1" };
const LABELS = { cash: "מזומן", card: "כרטיס אשראי" };

export function PaymentSplit({ data }: Props) {
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: LABELS[key as keyof typeof LABELS] || key,
    value: parseFloat(value),
    color: COLORS[key as keyof typeof COLORS] || "#6b7280",
  }));

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
              cy="50%"
              outerRadius={75}
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
