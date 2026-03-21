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
import type { MemberTotal } from "@/types";
import { Card } from "@/components/ui/Card";
import { fmt } from "@/lib/format";

interface Props {
  data: MemberTotal[];
}

export function MemberComparison({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.user_name || d.user_email?.split("@")[0],
    סכום: parseFloat(d.total),
  }));

  return (
    <Card>
      <h3 className="text-base font-semibold text-slate-900 mb-4">
        השוואת חברי משפחה
      </h3>
      {chartData.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
          אין נתונים לחודש זה
        </div>
      ) : (
        <div dir="ltr">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical" margin={{ right: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fontFamily: "Heebo" }}
              tickFormatter={(v) => fmt(v)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fontFamily: "Heebo" }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              formatter={(value: number) => [fmt(value), "סכום"]}
              contentStyle={{
                fontFamily: "Heebo",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
              }}
            />
            <Bar dataKey="סכום" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
