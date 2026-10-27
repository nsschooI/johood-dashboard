# Permissions

Everything a staff member can see or do is decided by **one function**:
`can(user, action)` in [`src/lib/permissions.ts`](../src/lib/permissions.ts).
It is checked **on the server** for every API route, every server-rendered
page and every live (SSE) event. The UI also hides what you can't use, but
that is only a courtesy — a hand-crafted request is refused the same way.

## How a user gets their roles

1. The member signs in with Discord (scopes `identify` and
   `guilds.members.read`).
2. The dashboard reads their roles **in the JoHood server** and maps the role
   IDs through [`config/roles.ts`](../config/roles.ts).
3. A member with no mapped role cannot sign in.
4. A member with several staff roles gets the **union** of their permissions
   (e.g. Dev + Support Staff can restart bots *and* answer tickets).
5. Roles are read at sign-in. Sessions last 12 hours
   (`config/dashboard.ts → sessionTtlHours`); a role removed in Discord takes
   effect at the next sign-in. To cut access immediately, an Owner adds a
   **deny** override (see below), which applies on the next request.

| Discord role | Dashboard role |
|---|---|
| Owner, Founder | `owner` |
| Head Managers, Manager | `manager` |
| Dev | `dev` |
| Head of Support | `head_support` |
| Support Staff | `support` |

## The matrix

> This table is checked against the code by `tests/docs.test.ts`. If you
> change `ROLE_PERMISSIONS`, update this table (and `tests/permissions.test.ts`).

| Action | Owner | Manager | Dev | Head of Support | Support Staff |
|---|:-:|:-:|:-:|:-:|:-:|
| `bots.view` | ✓ | ✓ | ✓ | — | — |
| `bots.logs` | ✓ | ✓ | ✓ | — | — |
| `bots.restart` | ✓ | ✓ | ✓ | — | — |
| `bots.stop` | ✓ | ✓ | — | — | — |
| `assistants.view` | ✓ | ✓ | ✓ | — | — |
| `assistants.control` | ✓ | ✓ | — | — | — |
| `stats.view` | ✓ | ✓ | — | ✓ | — |
| `activity.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `tickets.view` | ✓ | ✓ | — | ✓ | ✓ |
| `tickets.claim` | ✓ | ✓ | — | ✓ | ✓ |
| `tickets.reply` | ✓ | ✓ | — | ✓ | ✓ |
| `tickets.close` | ✓ | ✓ | — | ✓ | — |
| `tickets.transfer` | ✓ | ✓ | — | ✓ | — |
| `purchases.view` | ✓ | ✓ | — | ✓ | ✓ |
| `transfers.view` | ✓ | ✓ | — | ✓ | — |
| `points.view` | ✓ | ✓ | — | ✓ | — |
| `points.adjust` | ✓ | ✓ | — | — | — |
| `points.adjust_limited` | ✓ | — | — | ✓ | — |
| `members.view` | ✓ | ✓ | — | ✓ | ✓ |
| `members.view_full` | ✓ | ✓ | — | ✓ | — |
| `staff.view` | ✓ | ✓ | — | — | — |
| `protection.view` | ✓ | ✓ | — | — | — |
| `protection.manage` | ✓ | ✓ | — | — | — |
| `audit.view` | ✓ | ✓ | — | — | — |
| `permissions.manage` | ✓ | — | — | — | — |

### What the actions cover

| Action | Grants |
|---|---|
| `bots.view` | Bot status cards (state, uptime, restarts, memory, last error) |
| `bots.logs` | Live log drawer per bot, including error details |
| `bots.restart` | Restart a bot |
| `bots.stop` | Stop / start a bot (stop needs a confirm step) |
| `assistants.view` | Assistant cards: voice room, caller, free/busy |
| `assistants.control` | Disconnect an assistant from its voice room |
| `stats.view` | Server health tiles (members, online, new today, tickets open…) |
| `activity.view` | The live feed — each line is further filtered by the permission behind it |
| `tickets.view` / `.claim` / `.reply` | Ticket queue, ticket conversation, claiming and answering |
| `tickets.close` / `.transfer` | Closing a ticket, handing it to another staff member |
| `purchases.view` | Live purchase stream from the Roblox map |
| `transfers.view` | Points→Robux transfers, reviews, linked tickets |
| `points.view` | Totals, charts, top buyers, redemptions, per-member ledger |
| `points.adjust` | Manual credit/debit, unlimited amount |
| `points.adjust_limited` | Manual credit/debit up to `limitedAdjustMax` (500) per adjustment |
| `members.view` | Member search and basic profile (roles, rank, Roblox link, tickets) |
| `members.view_full` | Adds economy data to profiles (points, lifetime, Robux spent, purchases) |
| `staff.view` | Staff list with access levels |
| `protection.view` / `.manage` | Lockdown, raid mode, link blocking, blocked-word lists |
| `audit.view` | The audit log viewer |
| `permissions.manage` | Per-user overrides (Owner only, can't be granted) |

### Pages

| Page | Visible with any of |
|---|---|
| Overview | `bots.view`, `assistants.view`, `stats.view`, `tickets.view`, `activity.view` |
| Points & Purchases | `purchases.view`, `transfers.view`, `points.view` |
| Members & Security | `members.view`, `staff.view`, `protection.view`, `audit.view` |

Each page only renders the sections the user is allowed to see, and the
server only fetches the data for those sections.

## Overrides (Owner only)

On **Members & Security → Staff & access**, an Owner can set per-member
overrides on top of their Discord roles:

- **Allow** adds a single action. `permissions.manage` can never be granted
  this way (no privilege escalation).
- **Deny** removes an action even if a role grants it. Deny wins over allow.
- An Owner can't deny themselves `permissions.manage` (no lock-out).
- Overrides are stored in SQLite and apply to the member's **next request**
  — including open sessions and their live stream (re-checked every 30 s).

## Safety rules

| Rule | Where it's enforced |
|---|---|
| Least privilege: no permission unless a role or override grants it | `permissionsFor()` |
| Every change writes an audit entry: who, what, when, target, reason, before/after, IP | `guard()` → `ctx.audit()` in each mutating route |
| Denied mutations are audited too (`ok = false`) | `guard()`, `ctx.require()` |
| The audit log is append-only | SQLite triggers reject UPDATE/DELETE |
| Every point adjustment needs a written reason (≥ 5 chars) | `/api/points/adjust` schema |
| Confirm step for dangerous actions — stopping a bot, changing permissions, lockdown/raid mode, adjusting more than 1,000 points | Server returns **428 confirm_required** until the request carries `confirm: true`; the UI shows a confirm dialog first |
| Rate limits on sensitive endpoints (per user, sliding window) | `config/dashboard.ts → rateLimits`, `guard({ rateLimit })` |
| CSRF: mutations need the per-session `X-CSRF-Token` header **and** a same-origin `Origin`/`Sec-Fetch-Site` | `guard({ mutation: true })` |
| Sessions: random 256-bit token in an `httpOnly`, `SameSite=Lax` cookie (`__Host-` + `Secure` over https); only a SHA-256 hash is stored | `src/lib/server/store.ts` |
| Live events are filtered per user before they're written to the stream | `canReceive()` in `src/lib/visibility.ts` |
| Profiles are redacted for roles without `members.view_full` | `redactProfile()` |

## Changing the matrix

1. Edit `ROLE_PERMISSIONS` (or add an action to `ACTIONS`) in
   `src/lib/permissions.ts`.
2. Update the `EXPECTED` table in `tests/permissions.test.ts` and the table above.
3. If you add an action, guard the route with it and, if it emits live
   events, map it in `src/lib/visibility.ts`.
4. `npm test`.
