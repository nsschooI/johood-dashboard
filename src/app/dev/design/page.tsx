"use client";

import { useState, type ReactNode } from "react";
import { Scene, type SceneName } from "@/components/art/scenes";
import { Icon, ICON_NAMES } from "@/components/icons/icon";
import { useApp, useFormat } from "@/components/providers/app-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge, Chip, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, IconTile, PageHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import { EmptyState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { useTheme } from "@/lib/client/theme";

const SWATCHES = [
  ["bg", "Canvas"],
  ["surface", "Surface"],
  ["surface-2", "Surface 2"],
  ["surface-3", "Surface 3"],
  ["ink", "Ink"],
  ["ink-2", "Ink 2"],
  ["ink-3", "Ink 3 (min. text)"],
  ["ink-4", "Ink 4 (decor)"],
  ["accent-500", "Brand red"],
  ["accent-300", "Red ink"],
  ["good", "Good"],
  ["warn", "Warning"],
  ["bad", "Critical"],
  ["info", "Info"],
  ["series-1", "Series 1"],
  ["series-2", "Series 2"],
  ["series-3", "Series 3"],
] as const;

const SCENES: SceneName[] = ["welcome", "allClear", "search", "quiet", "locked", "lost", "crash", "botDown", "safety", "points", "tickets", "giveaways", "emptyGift", "audit", "people"];

function Section({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {note && <p className="mt-0.5 text-sm text-ink-3">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default function DesignPage() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useApp();
  const f = useFormat();
  const toast = useToast();
  const [tab, setTab] = useState<"a" | "b" | "c">("a");
  const [on, setOn] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [chips, setChips] = useState<string[]>(["open"]);

  return (
    <main className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-8" data-guild="main">
      <PageHeader
        eyebrow={<Badge tone="accent">/dev/design · not linked from the app</Badge>}
        title="JoHood design system"
        subtitle="Tokens, icons, components and illustrations of the staff dashboard. Flip the theme and language to check both."
        art={<Scene name="welcome" className="h-24 w-auto" />}
        actions={
          <>
            <Segmented
              label="Theme"
              value={theme}
              onChange={setTheme}
              options={[
                { value: "light", label: "Light", icon: <Icon name="sun" size={16} /> },
                { value: "dark", label: "Dark", icon: <Icon name="moon" size={16} /> },
                { value: "system", label: "System", icon: <Icon name="monitor" size={16} /> },
              ]}
            />
            <Button variant="secondary" onClick={() => setLocale(locale === "ar" ? "en" : "ar")}>
              <Icon name="languages" size={18} />
              {locale === "ar" ? "English" : "العربية"}
            </Button>
          </>
        }
      />

      <Section title="Colour" note="Every token is a light/dark pair. Ink 3 is the lightest colour allowed for text (≥ 4.5:1).">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {SWATCHES.map(([k, label]) => (
            <div key={k} className="glass overflow-hidden rounded-2xl">
              <div className="h-14" style={{ background: `var(--color-${k})` }} />
              <div className="px-3 py-2">
                <p className="text-xs font-semibold">{label}</p>
                <p className="font-mono text-[11px] text-ink-3">--color-{k}</p>
              </div>
            </div>
          ))}
          {(["main", "catalog"] as const).map((g) => (
            <div key={g} data-guild={g} className="glass overflow-hidden rounded-2xl">
              <div className="h-14 bg-guild" />
              <div className="px-3 py-2">
                <p className="text-xs font-semibold">Server accent · {g}</p>
                <p className="font-mono text-[11px] text-guild-ink">--color-guild</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type" note="Rubik for display and numbers, Inter for UI text, IBM Plex Sans Arabic for Arabic.">
        <Card className="space-y-3 p-6">
          <p className="font-display text-4xl font-bold">Display 36 · سحوبات جوهود</p>
          <p className="font-display text-[2rem] leading-tight font-bold">Page title 32 · نظرة عامة</p>
          <p className="font-display text-xl font-semibold">Section 20 · التذاكر</p>
          <p className="font-display text-[15px] font-semibold">Card title 15 · البوتات</p>
          <p className="text-sm">Body 14 — Staff use this all day: calm, fast to scan. نص أساسي للقراءة اليومية.</p>
          <p className="text-xs text-ink-3">Caption 12 — secondary information · معلومات ثانوية</p>
          <p className="font-display tabular text-[1.85rem] font-bold">{f.n(1287450)} · {f.robux(12500)}</p>
        </Card>
      </Section>

      <Section title="Radius, elevation, spacing">
        <div className="flex flex-wrap gap-4">
          {[
            ["8", "rounded-lg"],
            ["12", "rounded-xl"],
            ["16", "rounded-2xl"],
            ["20 (card)", "rounded-[var(--radius-card)]"],
            ["full", "rounded-full"],
          ].map(([l, c]) => (
            <div key={l} className={`glass grid size-24 place-items-center text-xs font-semibold ${c}`}>
              {l}
            </div>
          ))}
          <div className="grid size-24 place-items-center rounded-2xl bg-surface text-xs font-semibold shadow-[var(--shadow-pop)]">pop</div>
          <div className="flex items-end gap-1">
            {[4, 8, 12, 16, 24, 32].map((s) => (
              <div key={s} className="flex flex-col items-center gap-1">
                <div className="bg-accent-500/70" style={{ width: s, height: s }} />
                <span className="text-[10px] text-ink-3">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Icons" note="One family on one 24px grid. Optical stroke ≈1.5px at 16, 20 and 24. Duotone = active / selected.">
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-6 lg:grid-cols-10">
            {ICON_NAMES.map((n) => (
              <Tooltip key={n} content={n}>
                <div tabIndex={0} className="flex flex-col items-center gap-1.5 rounded-xl py-2.5 text-ink-2 hover:bg-surface-2">
                  <div className="flex items-end gap-2">
                    <Icon name={n} size={16} />
                    <Icon name={n} size={20} />
                    <Icon name={n} size={24} duo className="text-accent-400" />
                  </div>
                  <span className="max-w-full truncate px-1 text-[10px] text-ink-3">{n}</span>
                </div>
              </Tooltip>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Buttons, inputs, selection">
        <Card className="space-y-5 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary">
              <Icon name="plus" size={18} />
              Primary
            </Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="soft">Soft</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger" onClick={() => setConfirm(true)}>
              Danger (confirm)
            </Button>
            <Button variant="primary" loading>
              Saving
            </Button>
            <Button variant="primary" disabledReason="Needs the Manager role">
              Disabled with reason
            </Button>
            <Button size="icon" tip="Refresh" aria-label="Refresh">
              <Icon name="refresh" size={18} />
            </Button>
            <Button size="sm" variant="secondary">
              Small
            </Button>
            <Button size="lg" variant="primary">
              Large
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Search" htmlFor="d-search" hint="Name, Discord or Roblox">
              <Input id="d-search" placeholder="Search members…" leading={<Icon name="search" size={16} />} />
            </Field>
            <Field label="Server" htmlFor="d-sel">
              <Select id="d-sel" defaultValue="main">
                <option value="main">JoHood</option>
                <option value="catalog">JoHood Catalog</option>
              </Select>
            </Field>
            <Field label="Reason" htmlFor="d-reason" error="At least 5 characters">
              <Textarea id="d-reason" aria-invalid="true" defaultValue="oops" />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Segmented
              label="Tabs"
              value={tab}
              onChange={setTab}
              options={[
                { value: "a", label: "Open", count: 4 },
                { value: "b", label: "Claimed", count: 2 },
                { value: "c", label: "Closed" },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              {["open", "claimed", "mine"].map((c) => (
                <Chip key={c} active={chips.includes(c)} onClick={() => setChips((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))} count={c.length}>
                  {c}
                </Chip>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={on} onChange={setOn} label="Raid mode" />
              Raid mode
            </label>
            <Switch checked={false} onChange={() => {}} label="Locked" disabledReason="Needs Manager" />
          </div>
        </Card>
      </Section>

      <Section title="Status, avatars, feedback">
        <Card className="flex flex-wrap items-center gap-3 p-6">
          <Badge tone="good" icon={<Dot tone="good" />}>
            Online
          </Badge>
          <Badge tone="warn">Degraded</Badge>
          <Badge tone="bad">Offline</Badge>
          <Badge tone="info">New</Badge>
          <Badge tone="accent">Catalog</Badge>
          <Badge>Neutral</Badge>
          <Dot tone="good" pulse />
          <Avatar name="Laith" src="mock:avatar:staff-1" size={40} status="online" />
          <Avatar name="ريم" size={40} />
          <IconTile name="tickets" />
          <IconTile name="bots" tone="good" />
          <IconTile name="safety" tone="warn" />
          <Button variant="secondary" onClick={() => toast({ tone: "success", title: "Bot restarted", description: "Tickets is back online." })}>
            Toast
          </Button>
          <Button variant="secondary" onClick={() => toast({ tone: "error", title: "Couldn't restart", description: "Try again in a minute." })}>
            Error toast
          </Button>
        </Card>
      </Section>

      <Section title="Stat tiles and cards">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Robux today" value={48250} format={f.robux} icon="robux" delta={{ value: "12%", direction: "up", good: true }} foot="vs. yesterday" />
          <StatTile label="Open tickets" value={7} format={f.n} icon="tickets" tone="warn" foot="2 waiting > 1h" />
          <StatTile label="Bots healthy" value={8} format={(n) => `${n}/9`} icon="bots" tone="good" />
          <StatTile label="Online now" value={1324} format={f.n} icon="members" tone="guild" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader icon="activity" title="Card header" description="One line of context" actions={<Button size="sm">Action</Button>} />
            <div className="space-y-2 px-5 pb-5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </Card>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-start text-xs text-ink-3">
                <tr>
                  <th className="px-4 py-2.5 text-start font-semibold">Member</th>
                  <th className="px-4 py-2.5 text-start font-semibold">Item</th>
                  <th className="px-4 py-2.5 text-end font-semibold">Robux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[
                  ["Laith", "Hoodie · Red", 120],
                  ["سارة", "Jordan Cap", 75],
                  ["Faris", "VIP Pass", 400],
                ].map(([n, i, r]) => (
                  <tr key={n} className="hover:bg-surface-2/60">
                    <td className="px-4 py-2.5 font-medium">{n}</td>
                    <td className="px-4 py-2.5 text-ink-2">{i}</td>
                    <td className="tabular px-4 py-2.5 text-end">{f.robux(Number(r))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </Section>

      <Section title="Illustrations" note="Hoodie the mascot and the giveaway props; one per situation.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {SCENES.map((s) => (
            <div key={s} className="glass flex flex-col items-center rounded-2xl p-3">
              <Scene name={s} className="h-28 w-auto" />
              <p className="mt-1 text-xs font-semibold text-ink-3">{s}</p>
            </div>
          ))}
        </div>
        <Card>
          <EmptyState art="allClear" title="Nothing waiting for you" hint="New tickets show up here the moment they're opened." action={<Button variant="soft">Open tickets</Button>} />
        </Card>
      </Section>

      <ConfirmDialog
        open={confirm}
        title="Stop the Tickets bot?"
        body="Members can't open tickets until it's started again."
        confirmLabel="Stop bot"
        danger
        onConfirm={() => setConfirm(false)}
        onCancel={() => setConfirm(false)}
      />
    </main>
  );
}
