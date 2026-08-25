"use client";

import type { ReactElement, ReactNode } from "react";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/utils";
import type { MarginMonth, MonthBucket, SeasonalityMonth, ServiceRevenue } from "@/lib/insights";

const EMPTY_COPY = "Not enough history yet — insights fill in as you complete bookings.";

function ChartFrame({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="text-sm text-muted-foreground">{EMPTY_COPY}</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {children as ReactElement}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RevenueTrendChart({ data }: { data: MonthBucket[] }) {
  const empty = data.every((d) => d.revenueCents === 0);
  return (
    <ChartFrame title="Revenue trend (last 12 months)" empty={empty}>
      <LineChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="date" tickFormatter={(v: string) => format(new Date(v), "MMM yyyy")} fontSize={11} />
        <YAxis fontSize={11} width={64} tickFormatter={(v: number) => formatCents(v)} />
        <Tooltip
          labelFormatter={(v) => format(new Date(v as string), "MMMM yyyy")}
          formatter={(v) => [formatCents(v as number), "Revenue"]}
        />
        <Line type="monotone" dataKey="revenueCents" stroke="#2563eb" dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ChartFrame>
  );
}

export function MarginTrendChart({ data }: { data: MarginMonth[] }) {
  const empty = data.every((d) => d.revenueCents === 0);
  const chartData = data.map((d) => ({
    date: d.date,
    marginPct: d.marginPct == null ? null : Math.round(d.marginPct * 100),
  }));
  return (
    <ChartFrame title="Profit margin trend (last 12 months)" empty={empty}>
      <LineChart data={chartData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="date" tickFormatter={(v: string) => format(new Date(v), "MMM yyyy")} fontSize={11} />
        <YAxis fontSize={11} width={48} unit="%" />
        <Tooltip
          labelFormatter={(v) => format(new Date(v as string), "MMMM yyyy")}
          formatter={(v) => [v == null ? "—" : `${v}%`, "Margin"]}
        />
        <Line type="monotone" dataKey="marginPct" stroke="#16a34a" dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ChartFrame>
  );
}

export function RevenueByServiceChart({ data }: { data: ServiceRevenue[] }) {
  const empty = data.length === 0;
  return (
    <ChartFrame title="Revenue by service type" empty={empty}>
      <BarChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="serviceName" fontSize={11} interval={0} angle={-15} textAnchor="end" height={50} />
        <YAxis fontSize={11} width={64} tickFormatter={(v: number) => formatCents(v)} />
        <Tooltip formatter={(v) => [formatCents(v as number), "Revenue"]} />
        <Bar dataKey="revenueCents" fill="#2563eb" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartFrame>
  );
}

export function SeasonalityChart({ data }: { data: SeasonalityMonth[] }) {
  const empty = data.every((d) => d.revenueCents === 0);
  return (
    <ChartFrame title="Seasonality (revenue by month, all years)" empty={empty}>
      <BarChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="label" fontSize={11} />
        <YAxis fontSize={11} width={64} tickFormatter={(v: number) => formatCents(v)} />
        <Tooltip formatter={(v) => [formatCents(v as number), "Revenue"]} />
        <Bar dataKey="revenueCents" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.month} fill={d.isBusiest ? "#2563eb" : "#93c5fd"} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}
