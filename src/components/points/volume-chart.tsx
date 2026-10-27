"use client";

import { useId, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";
import { useApp, useFormat } from "@/components/providers/app-provider";
import { Card, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import type { TotalsBucket } from "@/lib/types";
import { ChartTooltip } from "./chart-tooltip";

const S1 = "#b06ef2";
const S2 = "#14a08f";
const AXIS = { fill: "#948da5", fontSize: 11 };
type Grain = "daily" | "weekly";

/**
 * Revenue: Robux and points earned as two aligned panels (small multiples,
 * shared time axis) — never one chart with two y-scales.
 */
export function VolumeChart({ daily, weekly }: { daily: TotalsBucket[]; weekly: TotalsBucket[] }) {
  const { t } = useApp();
  const f = useFormat();
  const [grain, setGrain] = useState<Grain>("daily");
  const data = grain === "daily" ? daily : weekly;
  const sum = (k: "robux" | "pointsEarned") => data.reduce((s, b) => s + b[k], 0);

  return (
    <Card aria-labelledby="revenue-title" className="flex flex-col">
      <CardHeader
        id="revenue-title"
        title={t("points.revenue")}
        description={grain === "daily" ? t("points.chart.daily") : t("points.chart.weekly")}
        icon={<TrendingUp className="size-4" aria-hidden />}
        actions={
          <Segmented
            size="sm"
            label={t("points.chart.daily")}
            value={grain}
            onChange={setGrain}
            options={[
              { value: "daily", label: t("points.chart.daily") },
              { value: "weekly", label: t("points.chart.weekly") },
            ]}
          />
        }
      />
      <div className="flex flex-1 flex-col gap-1 px-2 pb-4">
        <Panel data={data} metric="robux" color={S1} label={t("points.chartRobux")} total={f.robux(sum("robux"))} format={f.robux} />
        <Panel data={data} metric="pointsEarned" color={S2} label={t("points.chartPoints")} total={f.n(sum("pointsEarned"))} format={f.n} showAxis />
      </div>
    </Card>
  );
}

function Panel({
  data,
  metric,
  color,
  label,
  total,
  format,
  showAxis,
}: {
  data: TotalsBucket[];
  metric: "robux" | "pointsEarned";
  color: string;
  label: string;
  total: string;
  format: (n: number) => string;
  showAxis?: boolean;
}) {
  const { dir } = useApp();
  const f = useFormat();
  const gid = useId().replace(/:/g, "");
  return (
    <div className="min-h-0 flex-1">
      <p className="flex items-center gap-2 px-3 pt-1 text-xs text-ink-3">
        <span aria-hidden className="size-2 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
        <span className="text-ink-2">{label}</span>
        <span className="tabular ms-auto font-medium text-ink">{total}</span>
      </p>
      <div className={showAxis ? "h-36" : "h-28"} role="img" aria-label={`${label}: ${data.map((b) => `${f.day(b.start)} ${format(b[metric])}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 0 }} syncId="revenue">
            <defs>
              <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.38} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
              <filter id={`${gid}-glow`} x="-10%" y="-40%" width="120%" height="180%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid vertical={false} stroke="rgb(255 255 255 / 0.06)" />
            <XAxis dataKey="start" hide={!showAxis} tickFormatter={f.day} tick={AXIS} axisLine={false} tickLine={false} reversed={dir === "rtl"} minTickGap={24} />
            <YAxis tickFormatter={f.compact} tick={AXIS} axisLine={false} tickLine={false} width={dir === "rtl" ? 60 : 44} orientation={dir === "rtl" ? "right" : "left"} tickCount={3} />
            <Tooltip
              cursor={{ stroke: "rgb(255 255 255 / 0.2)", strokeWidth: 1 }}
              content={({ active, payload, label: l }) => (
                <ChartTooltip active={active} label={l ? f.day(String(l)) : ""} rows={(payload ?? []).map((p) => ({ color, name: label, value: format(Number(p.value)) }))} />
              )}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gid}-fill)`}
              filter={`url(#${gid}-glow)`}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "#15121d" }}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Earned vs spent points: same unit, two series, legend + direct colours. */
export function PointsFlowChart({ daily }: { daily: TotalsBucket[] }) {
  const { t, dir } = useApp();
  const f = useFormat();
  const data = daily.slice(-10);
  const earned = t("points.chart.earned");
  const spent = t("points.chart.redeemed");

  return (
    <Card aria-labelledby="flow-title" className="flex flex-col">
      <CardHeader id="flow-title" title={`${earned} / ${spent}`} description={t("points.chart.daily")} icon={<BarChart3 className="size-4" aria-hidden />} />
      <ul className="flex gap-4 px-5 text-xs text-ink-2" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm" style={{ background: S1 }} />
          {earned}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm" style={{ background: S2 }} />
          {spent}
        </li>
      </ul>
      <div className="h-56 px-2 pt-2 pb-4" role="img" aria-label={data.map((b) => `${f.day(b.start)}: ${earned} ${f.n(b.pointsEarned)}, ${spent} ${f.n(b.pointsRedeemed)}`).join("; ")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 12, left: 12, bottom: 0 }} barGap={2} barCategoryGap="28%">
            <defs>
              <linearGradient id="flow-a" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={S1} />
                <stop offset="1" stopColor={S1} stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id="flow-b" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={S2} />
                <stop offset="1" stopColor={S2} stopOpacity={0.55} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgb(255 255 255 / 0.06)" />
            <XAxis dataKey="start" tickFormatter={f.day} tick={AXIS} axisLine={false} tickLine={false} reversed={dir === "rtl"} minTickGap={16} />
            <YAxis tickFormatter={f.compact} tick={AXIS} axisLine={false} tickLine={false} width={dir === "rtl" ? 56 : 40} orientation={dir === "rtl" ? "right" : "left"} />
            <Tooltip
              cursor={{ fill: "rgb(255 255 255 / 0.04)" }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  label={label ? f.day(String(label)) : ""}
                  rows={(payload ?? []).map((p) => ({ color: p.dataKey === "pointsEarned" ? S1 : S2, name: p.dataKey === "pointsEarned" ? earned : spent, value: f.n(Number(p.value)) }))}
                />
              )}
            />
            <Bar dataKey="pointsEarned" fill="url(#flow-a)" radius={[4, 4, 0, 0]} animationDuration={700} />
            <Bar dataKey="pointsRedeemed" fill="url(#flow-b)" radius={[4, 4, 0, 0]} animationDuration={700} animationBegin={120} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
