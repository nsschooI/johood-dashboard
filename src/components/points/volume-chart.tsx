"use client";

import { useId, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";
import { useApp, useFormat } from "@/components/providers/app-provider";
import { Card, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import type { TotalsBucket } from "@/lib/types";
import { ChartTooltip } from "./chart-tooltip";

const S1 = "var(--color-series-1)";
const S2 = "var(--color-series-2)";
const AXIS = { fill: "#948da5", fontSize: 11 };

type Metric = "robux" | "pointsEarned" | "pointsRedeemed";
type Grain = "daily" | "weekly";

/** Single-series area chart: one measure at a time (no dual axis). */
export function VolumeChart({ daily, weekly }: { daily: TotalsBucket[]; weekly: TotalsBucket[] }) {
  const { t, dir } = useApp();
  const f = useFormat();
  const gid = useId().replace(/:/g, "");
  const [metric, setMetric] = useState<Metric>("robux");
  const [grain, setGrain] = useState<Grain>("daily");
  const data = grain === "daily" ? daily : weekly;
  const label = metric === "robux" ? t("points.chart.robux") : metric === "pointsEarned" ? t("points.chart.earned") : t("points.chart.redeemed");
  const fmt = (v: number) => (metric === "robux" ? f.robux(v) : f.n(v));
  const total = data.reduce((s, b) => s + b[metric], 0);

  return (
    <Card aria-labelledby={`${gid}-title`} className="flex flex-col">
      <CardHeader
        id={`${gid}-title`}
        title={`${t("points.chart.title")} · ${label}`}
        description={`${grain === "daily" ? t("points.chart.daily") : t("points.chart.weekly")} · ${fmt(total)}`}
        icon={<TrendingUp className="size-4" aria-hidden />}
        actions={
          <>
            <Segmented
              size="sm"
              label={t("points.chart.title")}
              value={metric}
              onChange={setMetric}
              options={[
                { value: "robux", label: t("points.chart.robux") },
                { value: "pointsEarned", label: t("points.chart.earned") },
                { value: "pointsRedeemed", label: t("points.chart.redeemed") },
              ]}
            />
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
          </>
        }
      />
      <div className="min-h-64 flex-1 px-2 pb-4" role="img" aria-label={`${label}: ${data.map((b) => `${f.day(b.start)} ${fmt(b[metric])}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
            <defs>
              <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b06ef2" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#b06ef2" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgb(255 255 255 / 0.06)" />
            <XAxis dataKey="start" tickFormatter={f.day} tick={AXIS} axisLine={false} tickLine={false} reversed={dir === "rtl"} minTickGap={24} />
            <YAxis tickFormatter={f.compact} tick={AXIS} axisLine={false} tickLine={false} width={44} orientation={dir === "rtl" ? "right" : "left"} />
            <Tooltip
              cursor={{ stroke: "rgb(255 255 255 / 0.2)", strokeWidth: 1 }}
              content={({ active, payload, label: l }) => (
                <ChartTooltip active={active} label={l ? f.day(String(l)) : ""} rows={(payload ?? []).map((p) => ({ color: "#b06ef2", name: label, value: fmt(Number(p.value)) }))} />
              )}
            />
            <Area type="monotone" dataKey={metric} stroke={S1} strokeWidth={2} fill={`url(#${gid}-fill)`} activeDot={{ r: 4, strokeWidth: 2, stroke: "#15121d" }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
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
          <span aria-hidden className="size-2.5 rounded-sm" style={{ background: "#b06ef2" }} />
          {earned}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm" style={{ background: "#14a08f" }} />
          {spent}
        </li>
      </ul>
      <div className="h-56 px-2 pt-2 pb-4" role="img" aria-label={data.map((b) => `${f.day(b.start)}: ${earned} ${f.n(b.pointsEarned)}, ${spent} ${f.n(b.pointsRedeemed)}`).join("; ")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 12, left: 12, bottom: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="rgb(255 255 255 / 0.06)" />
            <XAxis dataKey="start" tickFormatter={f.day} tick={AXIS} axisLine={false} tickLine={false} reversed={dir === "rtl"} minTickGap={16} />
            <YAxis tickFormatter={f.compact} tick={AXIS} axisLine={false} tickLine={false} width={40} orientation={dir === "rtl" ? "right" : "left"} />
            <Tooltip
              cursor={{ fill: "rgb(255 255 255 / 0.04)" }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  label={label ? f.day(String(label)) : ""}
                  rows={(payload ?? []).map((p) => ({ color: p.dataKey === "pointsEarned" ? "#b06ef2" : "#14a08f", name: p.dataKey === "pointsEarned" ? earned : spent, value: f.n(Number(p.value)) }))}
                />
              )}
            />
            <Bar dataKey="pointsEarned" fill={S1} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="pointsRedeemed" fill={S2} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
