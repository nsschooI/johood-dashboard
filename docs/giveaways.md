# Giveaways (public pages)

A public area for ordinary Discord members, separate from the staff
dashboard. The "Giveaways System" bot's **Details · التفاصيل** button opens
`/giveaways/<id>`. Members follow a giveaway, see what they still need,
authorize our app and join.

Nothing here uses the staff session or staff permissions. Members have their
own session (`jh_member` cookie) that has no roles. A member cookie can't
open any staff API (tested), and a staff cookie isn't a member session.

## Pages

| Path | What it shows |
| --- | --- |
| `/giveaways` | Hero, then **Running / Ended** tabs. Running giveaways come first as big cards: banner, prize, live flip countdown, entries (count-up), winners count, requirement chips, and an animated gradient border. Up to three recently ended giveaways follow as muted cards. The Ended tab lists all finished ones with their winners count. Refreshes every 30 s and right after a countdown reaches zero. |
| `/giveaways/[id]` | Banner hero, prize, d/h/m/s countdown (screen readers get a polite update once a minute), entries, winners count, host, **Open in Discord** (`messageUrl`, discord.com links only). The **Your status** panel has a tick/cross checklist of the requirements ("Join JoHood Catalog", "Authorize our app"), what is still missing, and the next step: **Log in with Discord**, **Authorize with Discord** (with the plain list of what it allows), **Join** (disabled with a reason tooltip until nothing is missing), or **You are in!** with confetti and an optional soft sound. After it ends: grey look, "Giveaway finished", the winners list (avatar, name), total entries and the end date. Refreshes every 15 s. |
| `/giveaways/me` | Who is signed in, **What I authorized** (status, the same plain list, "You can remove this any time" and **Remove my authorization** with a confirm step), and the giveaways I joined (small rows). Log out. |

Shared: header with the language switch (EN / العربية, stored in `jh_locale`),
the theme switch (system → light → dark, stored in `jh_gw_theme`, painted by
the server so there is no flash), and a sound toggle (off by default, stored
in `localStorage` `jh_gw_sound`). First-time visitors whose browser prefers
Arabic get Arabic (`src/proxy.ts`, matched on `/giveaways` only). Loading
skeletons, toasts, reduced-motion support and 375 px layouts are built in.

### Banners

A giveaway's own `bannerUrl` (https or site-relative) wins. Otherwise the
pages use `public/giveaways/banner-active.webp` / `banner-ended.webp` **when
those files exist**, and fall back to a built-in drawn banner (cream with red
gift boxes, the prize written over it, grey once ended). The two `.webp` files
are not in the repository yet: copy them into `public/giveaways/` and they are
picked up on the next request.

## Data contract

`src/lib/giveaways/types.ts` — `Requirement`, `Winner`, `Giveaway`
(`joined`, `authorized`, `missing` only when a member is signed in), and the
provider section `giveaways.list / get / join / authorizeState / revoke`.
`GiveawayServerRequirement` may carry an optional `inviteUrl` (https) so the
page can link a member to a required server.

`PROVIDER=mock` (zero setup) uses `src/lib/giveaways/mock.ts`: six giveaways
(two running, one ending in under a minute, three ended with 10 / 1 / no
winners) and a fake member, "Mock Member". Mock state lives in memory and
resets on restart.

## API routes (this app)

| Route | Notes |
| --- | --- |
| `GET /api/giveaways` | List, running first. Read-only, no member needed. |
| `GET /api/giveaways/:id` | One giveaway; personal fields when a member is signed in. 404 / 400. |
| `POST /api/giveaways/:id/join` | Member + same-origin + `X-CSRF-Token`; **5 per minute per member**. Returns `{ status: "joined" \| "already" \| "missing" \| "ended" \| "notfound", missing? }`. |
| `POST /api/giveaways/revoke` | Member + CSRF; 5 per minute. `{ removed }`. |
| `GET /api/giveaways/me` | `{ id, name, avatarUrl }` or `null`. |
| `GET /api/giveaways/login?next=` | Sign in (scope `identify`). |
| `GET /api/giveaways/authorize?next=` | Authorize (scopes `identify guilds.join`). |
| `POST /api/giveaways/logout` | Same-origin + CSRF; clears `jh_member`. |
| `POST /api/giveaways/mock/join-server` | Mock only (404 in real mode): pretend the member joined a required server. |

`next` is validated by `safeNext()` (`src/lib/giveaways/next.ts`): it must be
a relative path under `/giveaways`; anything else becomes `/giveaways`.
Public endpoints are read-only except join, revoke and logout. Tokens never
go into URLs or logs.

## REAL hooks (what the engineer wires)

1. **Login** — `src/app/api/giveaways/login/route.ts`, `// REAL:` block.
   Redirect to `https://discord.com/oauth2/authorize` with `scope=identify`,
   a one-time `state` cookie (httpOnly) that also carries the validated
   `next`, `redirect_uri=${APP_URL}/api/giveaways/callback`. Add that
   callback route: exchange the code, read `/users/@me`, then
   `createMemberSession({ id, name, avatarUrl })` + `setMemberCookie` and
   redirect to `next`.
2. **Authorize** — `src/app/api/giveaways/authorize/route.ts`, `// REAL:`
   block. Same flow with `scope="identify guilds.join"` and `prompt=consent`.
   The callback hands the OAuth tokens to the bot backend **server to
   server** (it stores them for `guilds.join`), never to the browser, then
   redirects to `next?authorized=1` (the page shows a thank-you toast).
3. **Provider** — `RealGiveaways` in `src/lib/provider/real.ts` calls the bot
   backend (same base URL and auth as the rest of `RealProvider`):

   | Method | Backend endpoint |
   | --- | --- |
   | `list()` | `GET /giveaways` |
   | `get(id, memberId?)` | `GET /giveaways/:id?memberId=` (404 → not found) |
   | `join(id, memberId)` | `POST /giveaways/:id/join` `{ memberId }` |
   | `authorizeState(memberId)` | `GET /giveaways/authorize-state?memberId=` |
   | `revoke(memberId)` | `POST /giveaways/revoke` `{ memberId }` — the backend deletes the stored tokens (and may call Discord's token revocation) |

   `get` with a `memberId` must fill `joined`, `authorized` and `missing`.
   `join` must re-check the requirements itself.
4. **Server requirements** — in real mode the status panel shows the
   server's `inviteUrl` (when the backend sends one) and a **Check again**
   button (`src/components/giveaways/status-panel.tsx`, `// REAL:`).

Until 1–2 are wired, the real-mode Login / Authorize buttons come back to the
page with a friendly "not connected yet" toast.
