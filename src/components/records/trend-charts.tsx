"use client";

import { format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type TrendRecord = {
  date: string; // ISO
  humidityPct: number | null;
  pitchOffsetCents: number | null;
  temperatureF: number | null;
};

function ChartPanel({
  title,
  unit,
  data,
  dataKey,
  band,
}: {
  title: string;
  unit: string;
  data: { date: string; value: number }[];
  dataKey: string;
  band?: { low: number; high: number };
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Not enough readings yet to show a trend.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => format(new Date(value), "MMM d")}
                fontSize={11}
              />
              <YAxis fontSize={11} width={40} unit={unit} />
              <Tooltip
                labelFormatter={(value) => format(new Date(value as string), "MMMM d, yyyy")}
                formatter={(value) => [`${value}${unit}`, title]}
              />
              {band && (
                <ReferenceArea y1={band.low} y2={band.high} fill="#22c55e" fillOpacity={0.1} strokeOpacity={0} />
              )}
              <Line type="monotone" dataKey={dataKey} stroke="#2563eb" dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function TrendCharts({ records }: { records: TrendRecord[] }) {
  const humidity = records
    .filter((r) => r.humidityPct != null)
    .map((r) => ({ date: r.date, value: r.humidityPct as number }));
  const pitch = records
    .filter((r) => r.pitchOffsetCents != null)
    .map((r) => ({ date: r.date, value: r.pitchOffsetCents as number }));
  const temperature = records
    .filter((r) => r.temperatureF != null)
    .map((r) => ({ date: r.date, value: r.temperatureF as number }));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ChartPanel title="Humidity" unit="%" data={humidity} dataKey="value" band={{ low: 40, high: 60 }} />
      <ChartPanel title="Pitch offset" unit="¢" data={pitch} dataKey="value" band={{ low: -5, high: 5 }} />
      <ChartPanel title="Temperature" unit="°F" data={temperature} dataKey="value" />
    </div>
  );
}
