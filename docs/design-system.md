# Design system (round 2)

This is the structure the round-2 UI is built on. Tokens live in
`src/app/globals.css` (`@theme`) and are mirrored for JavaScript in
`src/lib/motion.ts`.

## Shell

```
┌────────────── sidebar (lg+) ──────────────┐┌──────────────────── header ────────────────────────────────┐
│ ┌ Server switcher ──────────────────────┐ ││ [server ▾ (mobile)] Overview   ● Live   [⌘K Search] [🔔3] [ع] [🔊] [⎋] │
│ │ banner (soft)  [icon] JoHood        ▾ │ │├──────────── lockdown banner (only when lockdown/raid is on) ───────────┤
│ │ 4,820 members · 640 online · Lvl 2   │ ││                                                                         │
│ └───────────────────────────────────────┘ ││  Page header: server chip + title + subtitle                           │
│  ◉ Overview                       (2)     ││  ┌ Needs attention strip (Overview) ──────────────────────────────┐    │
│  ◉ Points & Purchases  GLOBAL     ( )     ││  │ ⚠ Tickets bot degraded · Restart ▸   ● 3 unclaimed tickets ▸ … │    │
│  ◉ Members & Security             (1)     ││  └────────────────────────────────────────────────────────────────┘    │
│  ◉ Access                                 ││  content (staggered entrance, view-transition between pages)           │
│                                           ││                                                                         │
│  [avatar] Mock Owner · Owner              ││                                                                         │
│  Signed in with JoHood Catalog roles      ││                                                                         │
└───────────────────────────────────────────┘└─────────────────────────────────────────────────────────────────────────┘
phones: header shows the server icon (opens the switcher sheet); bottom tab bar carries the same badges.
```

- **Server switcher** — icon, name, banner as a soft background, member/online
  counts and boost level. Choice is reflected in `?guild=` and remembered per
  user (cookie + prefs row). Economy pages are labelled **Global**.
- **Nav badges** — counts from the attention model (critical = pulsing red
  dot, warning = amber count). Same badges on the phone tab bar.
- **Attention strip** — top of Overview; each item links to the exact control
  (which also pulses).
- **Bell** — notification center: last events you may see, unread count,
  mark-as-read, opt-in browser notifications for critical items.
- **⌘K / Ctrl+K** — command palette; **?** — shortcut cheat-sheet.
- **Lockdown** — the accent turns amber and a persistent banner appears.

## Motion tokens

| Token | Value | Use |
|---|---|---|
| `--dur-instant` | 90 ms | press feedback, colour changes |
| `--dur-fast` | 160 ms | hover, focus ring, tooltips |
| `--dur-base` | 240 ms | segmented pill, menus, toasts |
| `--dur-slow` | 420 ms | dialogs/drawers, page transitions, chart draw |
| `--dur-count` | 900 ms | number count-up |
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | entrances |
| `--ease-in-out` | `cubic-bezier(.65,0,.35,1)` | moves |
| `--ease-spring` | `linear(...)` spring, ~8% overshoot | dialogs, pill, pop-ins |
| `--stagger` | 45 ms | per-item entrance delay (capped at 10 items) |

Rules: animate only `transform`/`opacity` (and `filter` sparingly); no layout
animation; ambient background is CSS-only, two blurred layers, `transform`
animation at 24–30 s; everything collapses to short fades under
`prefers-reduced-motion`.

## Interaction states

Every interactive element: `cursor: pointer`; hover (lift/glow or tint);
pressed (`scale(.97)`); `:focus-visible` ring (2 px accent, offset 2 px);
loading (spinner inside, label kept); success flash; error shake. Disabled
controls show `cursor: not-allowed` and a tooltip saying **why**
("Needs Manager role").

## Imagery

- People: Discord avatars everywhere via `<Avatar>` (gradient-initials fallback,
  optional ring, hover card).
- Roblox: headshots and item thumbnails via the cached thumbnail service
  (`/api/roblox/thumbnails`), resolved server-side.
- Servers: icon + banner from `GuildInfo`.
- Bots: Discord avatar when provided, otherwise a coloured glyph tile per bot.
- Ranks: designed SVG badges (newcomer → legend).
- Empty/error/login/404: SVG illustration set in `src/components/art/`.
- In mock mode, `mock:` image URLs render as generated artwork (never in real mode).
