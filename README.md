# JoHood Dashboard

The control website for the JoHood Discord bot ecosystem (Ops, Tickets,
Assistants ×3, Welcome, System, TempVoice, Network) and the **JoHood Catalog**
Roblox map. Staff sign in with Discord; what each person sees and can do comes
from their Discord roles.

- **Two servers** — JoHood (the community, default) and JoHood Catalog
  (tickets, ops, ranks, staff roles). The server switcher sits at the top of
  the sidebar, each server with its own accent (red / amber); the choice
  lives in `?guild=` and is remembered. Pages that are the same in both
  servers say so.
- **Overview** — answers four questions in five seconds: are the bots
  healthy, is anything waiting for me, what happened in the last hour, how
  is the server. Plus the live stream, waiting tickets and voice assistants.
- **Tickets** — an inbox: search, filters, *Mine*, and the conversation next
  to the list (claim, reply, hand over, close with confirm).
- **Activity** — purchases, transfers and rewards live, and everything else
  (bots, members joining, voice assistants).
- **Members** — the Discord server only: every member with search, sort
  and load more, one badge each (server rank or staff role, from the
  backend), linked / not linked, and profiles with roles, points, tickets and
  giveaways. **Manage access** opens a panel: dashboard permissions and
  overrides, Discord roles (add / remove), and the member's audit trail.
- **Leaderboards** — General, Chat, Voice and Reactions, five periods, a
  podium and the ranked list, refreshed every minute.
- **Roblox** — only people connected to the game: linked players (copy the
  list, CSV, player drawer), link candidates (invite by DM) and players
  who bought but aren't in the server (nudge in game). See
  [docs/roblox-and-members.md](docs/roblox-and-members.md).
- **Points** — the economy (global): KPIs with deltas, revenue, top buyers,
  points flow, every member's ledger with reason-required adjustments, and
  the in-game levels (cashback tiers).
- **Giveaways** (`/giveaways-admin`) — start a giveaway with a live Discord
  preview, follow entries and blocked members live, end, reroll or delete. See
  [docs/giveaways-admin.md](docs/giveaways-admin.md).
- **Bots** — the three voice assistants and the core bots: health, logs,
  restart / stop / start with confirm and Undo.
- **Safety** — lockdown, raid mode, link blocking and word filters.
- **Access** — the role ladder, *What can I do?*, the Discord-role mapping,
  per-person overrides, and the audit log.
- **Everywhere** — attention badges on the nav, a bell with opt-in desktop
  alerts, toasts for new tickets and big purchases (optional sounds, muted
  by default), a command palette (Ctrl/⌘ K), shortcuts (`?`), and controls
  that say *why* they're disabled.

Red, white, cream and charcoal, with a dark mode designed on its own; the
JoHood robot "Hoodie" on empty states, login and errors; motion that
collapses to fades when the OS asks for reduced motion; English and Arabic
(full RTL); usable from 375 px phones (bottom nav) up. See
[docs/design.md](docs/design.md).

> The app runs completely on a **mock provider** (realistic, live-moving fake
> data). The **real provider** is an HTTP client for the bot backend, ready to
> wire — see [docs/provider-api.md](docs/provider-api.md).

**Public giveaways** — `/giveaways` is a separate, public area for ordinary
Discord members (their own `jh_member` session, no staff permissions):
running and ended giveaways, a detail page with a requirement checklist,
authorize and join, and "My page". Festive red/cream look with light and
dark themes. See [docs/giveaways.md](docs/giveaways.md).

## Quick start

Requires Node.js ≥ 20.9 (22 LTS recommended). Works on Linux ARM64.
`better-sqlite3` is pinned to **12.11.1** on purpose — the 13.x prebuilt
binary segfaults on the Oracle ARM server. Don't bump it.

```bash
npm ci
cp .env.example .env.local
# in .env.local set MOCK_LOGIN=true to sign in without Discord
npm run dev
# → http://localhost:3000/login and pick a role
```

| Script | |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Vitest: permission matrix, data layer, API enforcement, docs sync |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript) |
| `npm run typecheck` | `tsc --noEmit` |

## Environment variables

All documented in [`.env.example`](.env.example). Never commit a filled-in copy.

| Variable | Required | Purpose |
|---|---|---|
| `APP_URL` | prod | Public URL, e.g. `https://dash.example.com`. Drives OAuth redirect, origin checks and `Secure` cookies (when `https://`). |
| `DATA_DIR` | — | Folder for the SQLite file (`johood.db`). Default `./data`. |
| `TRUST_PROXY` | behind nginx | `true` to take client IPs from `X-Forwarded-For` for the audit log. |
| `NEXT_PUBLIC_DASHBOARD_TIMEZONE` | — | Zone for "today" and chart buckets. Default `Asia/Amman`. Build-time. |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | prod | Discord application OAuth2 credentials. |
| `DISCORD_GUILD_ID` | prod | The JoHood server ID; roles are read from it. |
| `DISCORD_REDIRECT_URI` | — | Defaults to `${APP_URL}/api/auth/callback`. |
| `PROVIDER` | — | `mock` (default) or `real`. |
| `PROVIDER_API_URL` / `PROVIDER_API_TOKEN` | when real | Bot backend URL and shared bearer token. |
| `MOCK_LOGIN` | dev | `true` shows the role picker on the login page. |
| `ALLOW_MOCK_LOGIN_IN_PRODUCTION` | — | Mock login is refused in production unless this is also `true` (private staging only). |
| `MOCK_NOT_IMPLEMENTED` | — | Mock only: every action answers 501, like the real backend while actions are being built. |

Also edit **[`config/roles.ts`](config/roles.ts)**: replace the
`REPLACE_ME_*` placeholders with the real Discord role IDs. Tunables
(confirm threshold, Head of Support cap, rate limits, session length) live in
[`config/dashboard.ts`](config/dashboard.ts).

### Discord application setup

1. <https://discord.com/developers/applications> → New Application (or reuse a bot's).
2. **OAuth2 → Redirects**: add `https://<your-domain>/api/auth/callback`
   (and `http://localhost:3000/api/auth/callback` for dev).
3. Copy the Client ID and Client Secret into the env file.
4. Scopes requested by the app: `identify` and `guilds.members.read`.

## Architecture

```
src/
  app/
    layout.tsx               html lang/dir from the locale cookie, fonts
    login/                   Discord + dev login
    (dash)/                  signed-in area: layout = session + providers + shell
      overview/ tickets/ activity/ members/ leaderboards/ roblox/ points/ giveaways-admin/ bots/ safety/ access/
                             server components: check access, fetch, render view
    giveaways/               the public giveaways area (separate member session)
    dev/design/              design showcase (404 in production unless DESIGN_PAGE=1)
    api/                     route handlers — every one wrapped in guard()
      stream/                Server-Sent Events, filtered per user
  components/
    overview/ tickets/ members/ leaderboards/ roblox/ points/ bots/ activity/ safety/ access/ giveaways-admin/
                             page sections (client components)
    icons/                   the one icon set (Lucide geometry, generated) — see docs/design.md
    art/                     Hoodie and the illustration scenes, bot tiles, rank badges
    providers/               app (user, permissions, i18n), live SSE, sound, toasts
    shell/ ui/               layout chrome and primitives (dialog, switch, badge…)
  lib/
    types.ts                 data contracts + DataProvider interface
    permissions.ts           ACTIONS, ROLE_PERMISSIONS, can()
    visibility.ts            which live events / activity / profile fields a user may read
    provider/                mock.ts (simulation), real.ts (HTTP client), index.ts (selection)
    server/                  db (SQLite), store (sessions, audit, prefs, overrides),
                             api guard, rate limit, Discord OAuth, queries
    attention.ts             the attention model (pure; nav badges, strip, control highlights)
    i18n/                    en.ts, ar.ts (same keys, type-checked + parity test)
    client/                  fetch wrapper (CSRF), WebAudio chimes, useLoad, useAction (501-aware),
                             Roblox thumbnail batching, bot sparkline samples, anchors
    server/roblox.ts         cached Roblox thumbnail resolver
config/                      roles.ts (Discord role mapping), dashboard.ts (limits)
docs/                        design.md, provider-api.md, permissions.md, roblox-and-members.md, giveaways.md, giveaways-admin.md
tests/                       vitest suites
```

**Request flow.** Pages are server components: they read the session,
call `canSeePage()`, then fetch only the sections the user may see straight
from the provider and hand them to client components. Client components
mutate through `/api/*`; every route goes through `guard()`:

```
session cookie → CSRF token + same-origin (mutations) → can(user, action)
  → per-user rate limit → zod-validated input → confirm step (428) → provider → audit log
```

**Live updates.** The provider exposes `subscribe()`. `/api/stream` opens one
SSE response per browser tab, drops every event the user may not see
(`canReceive()`), sends a heartbeat every 15 s and re-checks the session every
30 s. In the browser, one `EventSource` fans events out to the components
(`useLiveEvent`). With the real provider, the dashboard holds a single
upstream SSE connection to the bot backend.

**Servers.** The selected server comes from `?guild=`, then the `jh_guild`
cookie, then the user's saved prefs, then `main`. Pages are keyed by it, the
live stream carries everything (permission-filtered) and components filter
server-specific events (`stats`, `ticket`, server activity) client-side, so
attention and notifications keep working whatever server you look at.

**Attention.** `computeAttention()` turns live data into items (bot offline /
degraded / stopped / restart spike, assistant offline, unclaimed tickets past
15 min, failed or stuck transfers, lockdown/raid mode), each tied to a
permission, a page (nav badge) and a target control (pulsing ring). Lockdown
or raid mode switches the shell accent to amber with a banner.

**Backend not ready (501).** Mutations the backend answers with 501 show a
calm "not connected yet" toast and are audited with outcome
`not_connected` — never as a change. See docs/provider-api.md.

**Storage.** SQLite via better-sqlite3 (WAL mode), in `DATA_DIR`:
`sessions` (only SHA-256 of tokens), `audit_log` (append-only — triggers
reject UPDATE/DELETE; `outcome` = ok / denied / not_connected / failed),
`user_prefs` (language, sound, server), `permission_overrides`.
Schema migrations run automatically on start.

**Single process.** One Node process (pm2 fork mode). The SSE fan-out, the
rate limiter and the mock simulation live in memory; don't run it in cluster
mode without moving those out.

**Security summary** — see [docs/permissions.md](docs/permissions.md):
server-side `can()` everywhere, least privilege, audit of every change and
every denied mutation, written reason on every point adjustment, confirm
steps for dangerous actions, rate limits, CSRF tokens + origin checks,
`httpOnly`/`SameSite=Lax` (`__Host-`/`Secure` over https) session cookies,
security headers (`X-Frame-Options: DENY`, `nosniff`, …), no secrets in the repo.

## Deploying (Oracle ARM, pm2, nginx)

```bash
# on the server, as the deploy user
sudo apt install -y build-essential python3   # only if better-sqlite3 has to compile
git clone <repo> johood-dashboard && cd johood-dashboard
npm ci
cp .env.example .env.production && nano .env.production   # fill in, MOCK_LOGIN=false
npm run build
npm i -g pm2
pm2 start ecosystem.config.cjs     # runs `next start` on 127.0.0.1:3000
pm2 save && pm2 startup            # survive reboots
```

Updating: `git pull && npm ci && npm run build && pm2 reload johood-dashboard`.

Back up `data/johood.db` (it holds the audit log), e.g. a daily
`sqlite3 data/johood.db ".backup 'backups/johood-$(date +%F).db'"`.

### nginx

Terminate TLS in nginx and proxy to the local port. SSE needs buffering off
and a long read timeout:

```nginx
server {
    listen 443 ssl http2;
    server_name dash.example.com;
    # ssl_certificate / ssl_certificate_key from certbot

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/stream {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 1h;
    }
}
server { listen 80; server_name dash.example.com; return 301 https://$host$request_uri; }
```

Then set `APP_URL=https://dash.example.com` and `TRUST_PROXY=true`.

The dashboard server needs outbound HTTPS to `cdn.discordapp.com`,
`thumbnails.roblox.com` and `*.rbxcdn.com` (avatars, server art and Roblox
thumbnails are optimised through `next/image`).
Caddy works too (`reverse_proxy 127.0.0.1:3000` — it streams SSE by default).

## Wiring the real provider

Everything the engineer needs is in [docs/provider-api.md](docs/provider-api.md):
the endpoint list, payloads, the event stream format, and a checklist. In short:
implement those endpoints next to the bots (localhost only, bearer token),
set `PROVIDER=real`, `PROVIDER_API_URL`, `PROVIDER_API_TOKEN`, confirm the
`TODO(wire)` spots in `src/lib/provider/real.ts`, and restart.

## Design notes

The full reference is [docs/design.md](docs/design.md): tokens, the icon
rules, illustrations, components, motion and accessibility. In short:

- Every colour is a light/dark pair in `src/app/globals.css`; the theme is
  `light`, `dark` or `system` (cookie `jh_theme`, rendered by the server).
- Rubik for titles and numbers, Inter for text, IBM Plex Sans Arabic for
  Arabic — Google Fonts, self-hosted (no runtime font requests).
- Logical CSS properties throughout (`ms-`, `pe-`, `start-`…), so RTL is a
  `dir` switch, not a second stylesheet. Amounts and names are bidi-isolated
  inside sentences.
- Charts show one measure per axis (no dual axes); the series colours were
  checked for colour-blind separation on both surfaces.
- Sounds are synthesized with WebAudio (no files), **off by default** until
  the speaker is clicked; the choice is remembered.
