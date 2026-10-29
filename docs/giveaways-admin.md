# Giveaways — staff page

`/giveaways-admin` lets staff run giveaways from the dashboard: start one
(the bot posts the card in Discord), follow entries and blocked members
live, end it early or reroll the winners. The public member pages are a
separate area — see [giveaways.md](giveaways.md).

## Who may do what

| Action | Roles | Covers |
|---|---|---|
| `giveaways.view` | Owner, Manager | The page, details, participants, blocked members, CSV export, banners |
| `giveaways.manage` | Owner (Founders map to Owner) | Start, end now, reroll |

Like every other action: `can()` decides, per-person overrides apply, a
refused mutation is audited as `denied`. Managers see the page with the
Start / End / Reroll buttons disabled and a tooltip saying why;
`/giveaways-admin/new` shows the no-access page to them.

## Dashboard API

All routes go through `guard()` (session → CSRF + same origin for
mutations → `can()` → rate limit → zod input → confirm → provider → audit).

| Method | Route | Permission | Notes |
|---|---|---|---|
| GET | `/api/giveaways-admin` | view or manage | `AdminGiveaway[]`, newest first |
| GET | `/api/giveaways-admin/:id` | view or manage | 404 when unknown |
| GET | `/api/giveaways-admin/:id/participants` | view or manage | `{ entries, blocked }` |
| GET | `/api/giveaways-admin/channels` | view or manage | `ChannelOption[]` for the form |
| GET | `/api/giveaways-admin/banner/:id` | view or manage | the picture itself (see below) |
| POST | `/api/giveaways-admin` | manage | start; `confirm: true` required (428 otherwise) |
| POST | `/api/giveaways-admin/:id/end` | manage | end now; confirm; 409 if not running |
| POST | `/api/giveaways-admin/:id/reroll` | manage | new winners; confirm; 409 if not ended |

- **Rate limit:** `giveaways` — 10 mutations per minute per user
  (`config/dashboard.ts`).
- **Validation** (`validateGiveaway` in `src/lib/giveaways/admin.ts`, run in
  the form *and* in the route): prize 1–120 characters; duration whole
  minutes from 1 to 129 600 (90 days); winners 1–50; a channel; image
  PNG/JPEG/WebP/GIF up to 5 MB. Failures answer
  `400 { error: "invalid_input", problems: { field: "tooLong" | … } }`.
- **Body size:** the create route reads at most the base64 of 5 MB plus
  64 KB; anything larger is refused with 413 before parsing.
- **Audit:** `giveaways.create` (target `giveaway:<id>`, after = prize,
  duration, winners, channel, requirements and `image: { type, bytes }`),
  `giveaways.end` and `giveaways.reroll` (before/after winner ids). **Image
  data and tokens are never logged** — not in the audit log, not in the
  console.
- **501:** if the backend doesn't have a route yet, the action shows the
  usual "not connected yet" toast and is audited as `not_connected`.

### Banners

`AdminGiveaway.bannerUrl` is always `null`: the picture lives on the bot
server. The dashboard serves it from `GET /api/giveaways-admin/banner/:id`
(staff session required), with `Content-Security-Policy: default-src 'none';
sandbox`, `nosniff` and a 5-minute private cache. The mock answers with a
generated SVG placeholder. Without an uploaded image, the bot uses the
default banner.

## Provider contract (`adminGiveaways`)

Types: `AdminGiveaway`, `Participant`, `Blocked`, `ChannelOption`,
`CreateGiveawayInput`, `AdminGiveawaysApi` in `src/lib/giveaways/admin.ts`.
The real provider calls the bot backend (same base URL and bearer token as
everything else in [provider-api.md](provider-api.md)):

| Method | Backend path | Body / returns |
|---|---|---|
| GET | `/admin/giveaways` | `AdminGiveaway[]` |
| GET | `/admin/giveaways/:id` | `AdminGiveaway` (404 → `null`) |
| GET | `/admin/giveaways/:id/participants` | `{ entries: Participant[], blocked: Blocked[] }` |
| GET | `/admin/giveaway-channels` | `ChannelOption[]` (grouped by server in the form) |
| GET | `/admin/giveaways/:id/banner` | `{ contentType, base64 }` |
| POST | `/admin/giveaways` | `CreateGiveawayInput` (with `actor`) → `{ id }` |
| POST | `/admin/giveaways/:id/end` | `{ actor }` → `{ winners }` |
| POST | `/admin/giveaways/:id/reroll` | `{ actor }` → `{ winners }` |

Status codes as everywhere: 400 `invalid`, 404 `not_found`, 409 `conflict`
(end on an ended giveaway, reroll on a running one), 501 `not_implemented`.

**Counts.** `attempts` counts every press of Join (button or website),
`blocked` the people who stopped at a requirement, `entries` the people who
joined. The detail page shows them as a funnel (joined / blocked, with
percentages). A blocked person lists every `missing` requirement
(`authorize`, or `server` with its key and name), their number of tries and
the first and last attempt.

**Live updates.** The provider emits a `giveaway` live event
(`data: AdminGiveaway`) whenever a giveaway changes — entry, blocked
attempt, end, reroll. Only users with `giveaways.view` receive it. The list
and detail pages also poll every 15 s while visible, so they stay current
if the backend doesn't stream these events yet.

## Mock behaviour

`MockAdminGiveaways` (`src/lib/giveaways/admin-mock.ts`) runs with
`PROVIDER=mock` and needs no setup:

- Six seeded giveaways: three running (one with authorize + JoHood Catalog,
  one ending within the hour, one with no entries yet), two ended with
  winners, one that failed for lack of entries.
- Channels: JoHood — giveaways, events, announcements; JoHood Catalog —
  giveaways, catalog-news. An unknown channel is `invalid`.
- While the dev server runs, running giveaways gain entries and blocked
  attempts every few seconds and emit `giveaway` events.
- Giveaways end on time; with no entries they become `failed`. Rerolls pick
  winners who didn't win before.
- It is separate from the public pages' mock data: a giveaway started here
  doesn't appear on `/giveaways` in mock mode.

## CSV export

Participants and blocked members export to CSV from the browser (UTF-8 with
a BOM so Excel reads Arabic names; every cell is quoted, and cells starting
with `= + - @` are prefixed so spreadsheets don't run them as formulas).
