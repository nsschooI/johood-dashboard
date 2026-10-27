# JoHood Dashboard

The control website for the JoHood Discord bot ecosystem (Ops, Tickets,
Assistants ×3, Welcome, System, TempVoice, Network) and the **JoHood Catalog**
Roblox map. Staff sign in with Discord; what each person sees and can do comes
from their Discord roles.

- **Overview** — live bot health (state, uptime, restarts, memory, last error,
  logs), the three assistants (voice room, who called them), server health,
  ticket queue and a live activity feed. Restart / stop / start per role.
- **Points & Purchases** — the live purchase stream from the Roblox map (soft
  chime + toast), daily/weekly charts, top buyers, transfers with reviews and
  linked tickets, redemptions, and a per-member points ledger with
  reason-required adjustments.
- **Members & Security** — member search and profiles, ranks and roles, staff
  access with Owner-only overrides, protection switches (lockdown, raid mode,
  blocked words) and the audit log.

Dark glass UI, fully bilingual (English LTR / Arabic RTL), responsive down to
phones, keyboard accessible, respects reduced motion.

> The app runs completely on a **mock provider** (realistic, live-moving fake
> data). The **real provider** is an HTTP client for the bot backend, ready to
> wire — see [docs/provider-api.md](docs/provider-api.md).

## Quick start

Requires Node.js ≥ 20.9 (22 LTS recommended). Works on Linux ARM64.

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
      overview/ points/ members/   server components: check access, fetch, render view
    api/                     route handlers — every one wrapped in guard()
      stream/                Server-Sent Events, filtered per user
  components/
    overview/ points/ members/ tickets/   page sections (client components)
    providers/               app (user, permissions, i18n), live SSE, sound, toasts
    shell/ ui/               layout chrome and primitives (dialog, switch, badge…)
  lib/
    types.ts                 data contracts + DataProvider interface
    permissions.ts           ACTIONS, ROLE_PERMISSIONS, can()
    visibility.ts            which live events / activity / profile fields a user may read
    provider/                mock.ts (simulation), real.ts (HTTP client), index.ts (selection)
    server/                  db (SQLite), store (sessions, audit, prefs, overrides),
                             api guard, rate limit, Discord OAuth, queries
    i18n/                    en.ts, ar.ts (same keys, type-checked)
    client/                  fetch wrapper (CSRF), WebAudio chimes, useLoad, useAction
config/                      roles.ts (Discord role mapping), dashboard.ts (limits)
docs/                        provider-api.md, permissions.md
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

**Storage.** SQLite via better-sqlite3 (WAL mode), in `DATA_DIR`:
`sessions` (only SHA-256 of tokens), `audit_log` (append-only — triggers
reject UPDATE/DELETE), `user_prefs` (language, sound), `permission_overrides`.
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
Caddy works too (`reverse_proxy 127.0.0.1:3000` — it streams SSE by default).

## Wiring the real provider

Everything the engineer needs is in [docs/provider-api.md](docs/provider-api.md):
the endpoint list, payloads, the event stream format, and a checklist. In short:
implement those endpoints next to the bots (localhost only, bearer token),
set `PROVIDER=real`, `PROVIDER_API_URL`, `PROVIDER_API_TOKEN`, confirm the
`TODO(wire)` spots in `src/lib/provider/real.ts`, and restart.

## Design notes

- One accent (soft orchid `#b06ef2`) on a near-black background with frosted
  "glass" cards; Inter for Latin, IBM Plex Sans Arabic for Arabic, both
  self-hosted (no runtime font requests).
- Logical CSS properties throughout (`ms-`, `pe-`, `start-`…), so RTL is a
  `dir` switch, not a second stylesheet. Amounts and names are bidi-isolated
  inside sentences.
- Charts show one measure per axis (no dual axes); series colours were
  checked for colour-blind separation and contrast on the card surface.
- Sounds are synthesized with WebAudio (no files), **off by default** until
  the speaker is clicked; the choice is remembered.
