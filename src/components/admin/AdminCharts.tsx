"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendDatum = {
  label: string;
  value: number;
};

type AdminChartsProps = {
  data: TrendDatum[];
};

export function AdminSignupTrendChart({ data }: AdminChartsProps) {
  return (
    <div className="h-44 w-full" aria-label="Signup trend placeholder chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -24, right: 4, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--divider)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--tertiary)" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 9, fill: "var(--tertiary)" }} tickLine={false} axisLine={false} width={32} />
          <Tooltip
            contentStyle={{
              border: "1px solid var(--hairline)",
              borderRadius: 3,
              color: "var(--ink)",
              fontSize: 10,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--ink)"
            fill="var(--surface-muted)"
            strokeWidth={1.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
