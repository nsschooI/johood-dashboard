# Design

The staff dashboard's visual language: red, white, cream and charcoal; warm,
confident and a little playful; calm and quick to scan. The public
`/giveaways` pages set the quality bar and share the palette, but they keep
their own stylesheet section (`.gw-root`, end of `globals.css`).

A living showcase of everything below is at **`/dev/design`**. It is not
linked from the app and returns 404 in production unless `DESIGN_PAGE=1`.

## Tokens

All tokens live in `src/app/globals.css` under `@theme`, so they are
Tailwind utilities (`bg-surface`, `text-ink-2`, `ring-line`, `duration-[var(--dur-fast)]`).
Motion values are mirrored for JavaScript in `src/lib/motion.ts`.

### Colour

Every colour that changes with the theme is a `light-dark()` pair. Dark mode
is designed, not inverted: the surfaces are warm charcoals, not grey;
red gets lighter to keep AA contrast; amber gets less yellow; shadows get
deeper and pick up a faint top highlight.

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#faf5ef` cream | `#121012` | page |
| `surface` | `#ffffff` | `#1c181b` | cards |
| `surface-2` / `-3` | `#f7f0e8` / `#efe5da` | `#241f23` / `#2e282c` | wells, rows, tracks |
| `line` / `line-strong` | warm brown 10% / 18% | warm white 8% / 15% | borders, dividers |
| `ink` → `ink-4` | `#211a1d` → `#a3979b` | `#f7f1ee` → `#6c6266` | text, by importance (`ink-4` is decoration only) |
| `charcoal` | `#221c1f` | same | tooltips, log panels |
| `brand-*` | `#e11d48` family | same | logo, fixed brand art |
| `accent-*` | red, darker steps for text | red, lighter steps for text | buttons, links, active nav |
| `good` / `warn` / `bad` / `info` | `#047857` / `#b45309` / `#be123c` / `#0369a1` | `#34d399` / `#fbbf24` / `#fb7185` / `#7dd3fc` | status only — always with an icon or a word |
| `series-1..3` | `#e11d48` `#2a78d6` `#d97706` | `#f43f5e` `#3987e5` `#c98500` | charts (validated for colour-blind separation on both surfaces) |
| `guild` / `guild-ink` | per server | per server | the server accent (below) |

**Server accent.** The shell sets `data-guild` and every surface can use
`bg-guild` / `text-guild-ink`: JoHood is red (`#e11d48`), JoHood Catalog is
amber (`#d97706` light, `#f59e0b` dark). The switcher, server chips and the
breadcrumb dot use it so you always know which server you're looking at.

**Theme.** `html[data-theme]` is `light`, `dark` or `system`, rendered by
the server from the `jh_theme` cookie (no flash). Tailwind's `dark:` variant
follows it. Change it from the top bar, the user menu, the palette or ⇧T.

### Type

- **Rubik** (`font-display`): titles, big numbers, nav. Rounded and friendly.
- **Inter** (`font-sans`): UI text, tables.
- **IBM Plex Sans Arabic**: Arabic in both roles.
- Numbers use `tabular` so columns and count-ups don't jitter.
- All fonts are Google Fonts (self-hosted through `@fontsource`).

### Shape and depth

`--radius-card` 1.25rem for cards, `rounded-xl` for controls,
`rounded-full` for pills and avatars. Two shadows only: `--shadow-glass`
(resting cards) and `--shadow-pop` (menus, dialogs, toasts), both built from
the `shadow-*` colour tokens so they change with the theme.

## Icons

One family: geometry from **Lucide** (ISC), generated into
`src/components/icons/paths.ts` by `scripts/gen-icons.mjs`. Use
`<Icon name="…" />` from `src/components/icons/icon.tsx` and nothing else —
no emoji as icons, no second icon set.

- **Sizes:** 16 (inline, chips), 20 (buttons, nav), 24 (headers, tiles).
  The stroke is optically corrected per size (2.4 / 2.2 / 1.9 / 1.75) so
  16 px doesn't look thin and 24 px doesn't look heavy. All three sizes are
  checked on `/dev/design`.
- **Duotone:** `duo` adds a 20% fill layer under the stroke. Use it for the
  *active* state (current nav item, selected tab, warning badges) — not
  everywhere.
- **Direction:** `mirror` flips arrows and chevrons in Arabic.
- **Brand glyphs** (`robux`, `coin`, `parachute`) are drawn to the same grid.
- Icons are `aria-hidden`; the button or link carries the label.

To add an icon: add its Lucide name to `scripts/gen-icons.mjs`, run
`node scripts/gen-icons.mjs`, commit the regenerated file.

## Illustrations

`src/components/art/scenes.tsx` holds the illustrations: **Hoodie**, the
JoHood robot, plus a small set of props (gift, parachute, shield, coins,
ticket stub). `Scene name="…"` picks one: `welcome`, `allClear`, `search`,
`quiet`, `locked`, `lost`, `crash`, `botDown`, `safety`, `points`, `tickets`,
`giveaways`, `emptyGift`, `audit`, `people`.

Rules: illustrations go on empty states, login, errors and page headers —
never inside dense data. Hoodie's mood follows the content (happy when all is
calm, worried when something needs attention). Colours come from tokens so
every scene works in both themes. The gift and parachute come from the
giveaways pages; use them sparingly.

## Components

All in `src/components/ui/` unless noted.

| Component | Notes |
|---|---|
| `Button` | `primary` / `secondary` / `soft` / `ghost` / `danger`; `sm` `md` `lg` `icon` `icon-sm`; `loading` shows a spinner and keeps the width |
| `Card`, `CardHeader`, `PageHeader`, `IconTile`, `SectionTitle` | card header wraps its actions under the title on narrow screens |
| `StatTile` | label, big count-up number, delta vs. yesterday, optional sparkline |
| `Badge`, `Chip` | status badges (always icon or word, never colour alone); filter chips |
| `Segmented` | tabs/filters with a sliding pill; scrolls horizontally if it must |
| `Input`, `Select`, `Textarea`, `Field` | labels, hints, errors, `optional` marker, leading/trailing slots |
| `Switch` | RTL-aware |
| `Tooltip` | hover and focus; works on disabled buttons; nudges itself on screen |
| `Modal`, `ConfirmDialog` | dialog or bottom `sheet`; dangerous actions always confirm |
| `Menu`, `ActionMenu` | keyboard-navigable menus |
| `Toast` (`toast-provider`) | success / error / info, with undo where it makes sense |
| `Skeleton`, `page-skeletons` | shaped like the content they replace |
| `EmptyState`, `ErrorState` | illustration + one line + one action |
| `Avatar`, `RobloxAvatar`, `CopyButton`, `TimeAgo`, `CountUp`, `Sparkline`, `Stars`, `Spinner` | |
| Shell (`src/components/shell/`) | sidebar, top bar, bottom nav + "More" sheet, server switcher, bell, command palette (⌘K), shortcuts (?), user menu |
| `InfoPopover` | a small ⓘ that opens a card on click / Enter (works on phones and inside dialogs; Esc closes it, not the dialog) |
| `MemberBadge`, `LinkedChip` (`src/components/people/member-badge.tsx`) | the one badge next to a member — server rank (☆) or staff role (shield) in the colour the backend sends, tinted for both themes; *linked / not linked* |
| Manage access (`src/components/access/manage-access.tsx`) | drawer with three tabs; `useManageAccess()(person)` opens it from anywhere |
| Lists that grow | `usePagedList()` (`src/lib/client/use-paged.ts`): numbered pages, "load more", rows patched in place after an action |
| Podium (`src/components/leaderboards/`) | top three, winner in the middle with a crown, gold / silver / bronze steps |

**Disabled with a reason.** A control the user may not use is either hidden
(navigation they can't open) or disabled with a tooltip that says why
(`useWhyNot()(action)` → "Needs Manager / Owner role"). The rule is
`can()` from `src/lib/permissions.ts`; the UI never decides on its own.

### Members and the Roblox world

Members (Discord) and Roblox (the game) are separate pages with separate
vocabularies: next to a member the dashboard shows their **badge** and a
*linked* chip, never Robux; the Roblox page shows Roblox headshots,
spending and the **in-game level** (cashback tier, with its rank icon). The
two meet only through links: profile → Roblox page, player drawer → member
profile. See [roblox-and-members.md](roblox-and-members.md).

Outreach actions (link invitations, in-game nudges) use the `soft` button,
turn into `secondary` "… again" once sent, and show *when* next to the
button ("Invited 2 days ago"). The nudge confirm previews the in-game
message on a charcoal card.

Destructive giveaway actions read differently on purpose: *End now* keeps
the record, *Delete giveaway* (trash, red) lists what disappears.

## Motion

Durations: `--dur-instant` 90 ms (press), `--dur-fast` 160 ms (hover, focus,
tooltips), `--dur-base` 240 ms (pills, menus, toasts), `--dur-slow` 420 ms
(dialogs, page transitions), `--dur-count` 900 ms (count-ups). Easing:
`--ease-out` for entrances, `--ease-in-out` for moves, `--ease-spring`
(~8% overshoot) for pop-ins.

- **Page transitions:** React `<ViewTransition>` on links tagged
  `transitionTypes={["nav"]}` — a short rise and fade. Back/forward and
  refreshes don't animate.
- **Stagger:** `.stagger` children enter 40 ms apart, capped at 10.
- **Refresh without flicker:** pages that poll (leaderboards every 60 s,
  giveaways every 15 s) keep the current data on screen while they reload.
- **Count-ups** on headline numbers; **live pulses** on the Live pill and on
  new rows (`.live-in`); **press** scales to 0.97; cards `.lift` on hover.
- Only `transform` and `opacity` animate. No layout animation.
- **`prefers-reduced-motion`:** every animation and transition collapses to
  an instant change (stagger and page transitions become a 150–200 ms fade);
  count-ups jump to the final value; the mascot stops floating.

## Attention and sound

`src/lib/attention.ts` turns live data into items with a severity: bot down
or erroring, tickets waiting, failed transfers, lockdown/raid mode. They
drive the nav badges, the overview strip, the bell and Hoodie's mood. On top
of that the notifications provider raises toasts for a new ticket and a
**big purchase** (≥ `DASHBOARD_CONFIG.bigPurchaseRobux`, 400 R$).

Sounds are **off by default**. A one-time hint offers to turn them on; the
speaker button in the top bar (and the user menu) mutes them again. Sounds:
`alert` (critical item, new ticket), `purchase` (big purchase), plus quiet UI
`success` / `error`. Browser notifications are opt-in from the bell.

`aria-live` is used only where it helps: toasts, the live stream and the
attention strip. Counters that tick every few seconds are not announced.

## Layout and accessibility

- Desktop: floating sidebar + top bar. Below `lg`: top bar + bottom nav with
  four pages and a "More" sheet. 16 px gutters on phones; nothing scrolls
  sideways at 375 px (wide tables scroll inside their card). Grid children
  may shrink (`globals.css`), so one long row can't widen a mobile column.
- Logical properties everywhere (`ms-`, `pe-`, `start-`), so Arabic is a
  true mirror. Numbers stay Latin in Arabic, matching how the community writes.
- Focus is always visible (2 px accent ring, 2 px offset). Text meets AA in
  both themes; `ink-4` is only for decoration.
- Charts appear only where a trend tells something (points revenue, the
  last-hour bars). They use `series-*` in both themes, always have a legend
  or title and a readable tooltip.
