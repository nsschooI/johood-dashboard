# Provider API (bot backend contract)

The dashboard never talks to Discord bots, pm2 or the Roblox map directly. It
talks to **one HTTP service on the bot server** — the *provider*. This file is
the contract that service must implement. The dashboard side is already
written: [`src/lib/provider/real.ts`](../src/lib/provider/real.ts) calls exactly
these endpoints, and every type below is defined in
[`src/lib/types.ts`](../src/lib/types.ts).

Until the provider exists, the dashboard runs on `PROVIDER=mock`
([`src/lib/provider/mock.ts`](../src/lib/provider/mock.ts)), which simulates
every endpoint — use it as the reference behaviour.

```
Browser ──https──▶ nginx ──▶ Dashboard (Next.js, :3000) ──http──▶ Provider (:8787, localhost only)
                                   │  auth, can(), audit log            │  pm2, discord.js bots,
                                   │  SQLite                            │  points DB, Roblox webhook
```

## Conventions

| | |
|---|---|
| Base URL | `PROVIDER_API_URL`, e.g. `http://127.0.0.1:8787`. Bind to localhost or a private network — **never expose it publicly**. |
| Auth | Every request carries `Authorization: Bearer <PROVIDER_API_TOKEN>`. Reject anything else with `401`. Generate the token with `openssl rand -hex 32`. |
| Format | JSON in and out, `Content-Type: application/json`. |
| IDs | Always **strings** (Discord snowflakes and Roblox IDs overflow JS numbers). |
| Time | ISO-8601 UTC strings, e.g. `2026-10-27T18:04:11.512Z`. |
| Lists | Newest first. Paginated lists return `Page<T>` = `{ "items": T[], "nextCursor": string \| null }`. Pass `cursor=<nextCursor>` to get the next (older) page. `limit` defaults to 50, max 100. |
| Errors | `{ "error": "<code>", "message": "<human text>" }` with status `400`/`422` (invalid), `404` (not found), `409` (conflict, e.g. bot already stopped), `5xx` (failure). The dashboard maps them in `RealProvider.request()`. |
| Timeout | The dashboard gives up after 8 s per request. |
| Authorization | **Not the provider's job.** The dashboard checks `can(user, action)` and writes the audit log before calling you. Mutations include the acting staff member (`actor`) so you can log it on your side too. |

## Endpoint summary

| Method | Path | Returns | Used for |
|---|---|---|---|
| GET | `/bots` | `BotStatus[]` | Overview bot cards |
| GET | `/bots/:name/logs?limit&level` | `BotLogLine[]` (oldest → newest) | Logs drawer |
| POST | `/bots/:name/restart` | `BotStatus` | Restart button |
| POST | `/bots/:name/stop` | `BotStatus` | Stop button |
| POST | `/bots/:name/start` | `BotStatus` | Start button |
| GET | `/assistants` | `Assistant[]` | Assistant cards |
| POST | `/assistants/:name/disconnect` | `Assistant` | Disconnect button |
| GET | `/server/stats` | `ServerStats` | Server health tiles |
| GET | `/activity?limit` | `ActivityItem[]` | Live activity feed (initial) |
| GET | `/purchases?limit&cursor&discordId&search` | `Page<PurchaseEvent>` | Live purchases |
| GET | `/transfers?limit&cursor&discordId&search&status` | `Page<Transfer>` | Transfers table |
| GET | `/redemptions?limit&cursor&discordId` | `Page<Redemption>` | Redemptions |
| GET | `/points/summary` | `PointsSummary` | KPIs, charts, top buyers |
| GET | `/points/ledger/:discordId?limit&cursor` | `Page<LedgerEntry>` | Member ledger |
| POST | `/points/adjust` | `LedgerEntry` | Manual adjustment |
| GET | `/members/search?q&limit` | `MemberSummary[]` | Member search |
| GET | `/members/:discordId` | `MemberProfile` | Profile |
| GET | `/ranks` | `RankInfo[]` | Rank overview |
| GET | `/roles` | `RoleInfo[]` | Role overview |
| GET | `/staff` | `StaffMember[]` | Staff list, ticket hand-over |
| GET | `/tickets?status&limit&cursor&discordId&search` | `Page<TicketSummary>` | Ticket queue |
| GET | `/tickets/:id` | `Ticket` | Ticket drawer |
| POST | `/tickets/:id/actions` | `Ticket` | Claim / reply / close / hand over |
| GET | `/protection` | `ProtectionSettings` | Protection panel |
| PATCH | `/protection` | `ProtectionSettings` | Toggles and thresholds |
| GET | `/events/stream` | `text/event-stream` | Everything live |

`:name` is a pm2 process name: `ops`, `tickets`, `welcome`, `system`,
`tempvoice`, `network`, `assistant-1`, `assistant-2`, `assistant-3`
(`BOT_NAMES` in `types.ts`).

---

## Bots

### `GET /bots` → `BotStatus[]`

One entry per process, in `BOT_NAMES` order. Most fields come straight from
`pm2 jlist` (`pm2_env.status`, `pm_uptime`, `restart_time`, `monit.memory`,
`monit.cpu`); `pingMs` is the bot's `client.ws.ping`.

```json
{
  "name": "tickets",
  "displayName": "Tickets",
  "kind": "core",
  "state": "online",
  "startedAt": "2026-10-26T09:12:03.000Z",
  "restarts24h": 1,
  "memoryMb": 182,
  "memoryLimitMb": 512,
  "cpuPct": 3.4,
  "pingMs": 52,
  "version": "2.9.0",
  "lastError": { "at": "2026-10-27T11:40:00.000Z", "message": "DiscordAPIError[50013]: Missing Permissions" }
}
```

`state`: `online` | `degraded` (running but erroring / gateway unhealthy) |
`restarting` | `offline` (crashed) | `stopped` (stopped on purpose).
`kind`: `core` | `assistant`. `startedAt` and `pingMs` are `null` when not running.

### `GET /bots/:name/logs?limit=300&level=info` → `BotLogLine[]`

Tail of the process log, **oldest first**, filtered to `level` and above
(`debug` < `info` < `warn` < `error`).

```json
[{ "id": "log_8f2a", "at": "2026-10-27T18:01:02.000Z", "bot": "ops", "level": "warn", "message": "slow interaction (2400ms)" }]
```

### `POST /bots/:name/{restart|stop|start}` → `BotStatus`

Empty body. Return the status **right after** issuing the pm2 command
(typically `state: "restarting"` or `"stopped"`), then push the final state on
the event stream. `409` if the bot is already in the requested state.
The dashboard only calls `stop` after the user confirmed.

## Assistants

### `GET /assistants` → `Assistant[]`

```json
{
  "bot": "assistant-2",
  "displayName": "Assistant 2",
  "state": "busy",
  "room": { "id": "123", "name": "🎮 Gaming 1", "listeners": 6 },
  "calledBy": { "discordId": "456", "name": "Laith", "avatarUrl": null },
  "since": "2026-10-27T17:51:00.000Z"
}
```

`state`: `free` | `busy` | `offline`. `room`, `calledBy`, `since` are `null` when free.

### `POST /assistants/:name/disconnect` → `Assistant`

Leave the voice room. `409` if not in a room.

## Server

### `GET /server/stats` → `ServerStats`

```json
{ "at": "2026-10-27T18:00:00.000Z", "members": 4821, "online": 640, "newToday": 31, "ticketsOpen": 9, "inVoice": 44, "boosts": 14 }
```

### `GET /activity?limit=80` → `ActivityItem[]`

Newest first. The feed is **bilingual**, so don't send sentences — send a
`kind` + `variant` and the values; the dashboard renders
`activity.<kind>.<variant>` from its dictionaries (`src/lib/i18n/en.ts`).

```json
{ "id": "act_91", "at": "…", "kind": "purchase", "variant": "bought", "tone": "success",
  "params": { "name": "YazanDz", "item": "Shadow Wings", "robux": 750, "points": 90 } }
```

| kind | variants | params |
|---|---|---|
| `purchase` | `bought` | name, item, robux, points |
| `transfer` | `requested`, `completed`, `failed` | name, robux, (points, stars) |
| `redeem` | `redeemed` | name, reward, points |
| `points_adjust` | `added`, `removed` | actor, name, points |
| `bot` | `error`, `restarted`, `started`, `stopped` | bot, (message) |
| `assistant` | `joined`, `left` | bot, room, (name) |
| `member_join` | `joined` | name |
| `ticket` | `opened`, `claimed`, `closed`, `transferred` | number, name/actor, (subject, to) |
| `protection` | `lockdown_on`, `lockdown_off`, `raid_on`, `raid_off` | — |

`tone`: `neutral` | `success` | `warning` | `danger`.

## Points & purchases

### `GET /purchases` → `Page<PurchaseEvent>`

What the Roblox map reports for each purchase:

```json
{
  "id": "pur_00a1",
  "at": "2026-10-27T18:03:12.000Z",
  "discordId": "900000000000100001",
  "robloxId": "4120938812",
  "robloxName": "NourPro",
  "item": "Royal Crown",
  "robux": 1200,
  "points": 144,
  "cashbackRate": 0.12
}
```

`discordId` is omitted when the Roblox account isn't linked yet.
`points` must equal `round(robux × cashbackRate)`. Filters: `discordId`,
`search` (Roblox name or item).

### `GET /transfers` → `Page<Transfer>`

Points converted to Robux and paid to a Roblox account.

```json
{ "id": "trf_7c", "at": "…", "robloxName": "Tala_99", "robux": 400, "points": 500, "discordId": "…",
  "status": "completed", "stars": 5, "comment": "سريع جداً، شكراً", "ticketId": "tkt_19" }
```

`status`: `pending` | `processing` | `completed` | `failed` | `refunded`.
`stars` (1–5) and `comment` come from the member's review. `ticketId` links a
support ticket about this conversion — the dashboard shows it as a link.

### `GET /redemptions` → `Page<Redemption>`

```json
{ "id": "rdm_3", "at": "…", "discordId": "…", "memberName": "Sara", "reward": "Private voice room", "points": 500 }
```

### `GET /points/summary` → `PointsSummary`

Pre-aggregated so the dashboard doesn't scan history. Day buckets are calendar
days in `Asia/Amman` (match `NEXT_PUBLIC_DASHBOARD_TIMEZONE`); week buckets
start on Monday. `start` is the bucket's date as `YYYY-MM-DD`.

```json
{
  "daily":  [{ "start": "2026-10-27", "robux": 21840, "pointsEarned": 1810, "pointsRedeemed": 1500, "purchases": 61, "transfers": 7 }],
  "weekly": [{ "start": "2026-10-26", "robux": 40210, "pointsEarned": 3400, "pointsRedeemed": 2900, "purchases": 118, "transfers": 13 }],
  "topBuyers": [{ "robloxName": "YazanDz", "discordId": "…", "robux": 21847, "purchases": 80, "points": 2381 }],
  "today": { "robux": 21840, "pointsEarned": 1810, "pointsRedeemed": 1500, "purchases": 61, "transfersCompleted": 4, "avgStars": 4.6 },
  "outstandingPoints": 19400
}
```

`daily`: last 14 days, oldest first, including empty days. `weekly`: last 8
weeks. `topBuyers`: top 8 by Robux over 30 days. `avgStars`: 30-day average or `null`.

### `GET /points/ledger/:discordId` → `Page<LedgerEntry>`

Every balance change for one member, newest first. `404` for an unknown member.

```json
{ "id": "led_51", "at": "…", "discordId": "…", "kind": "adjust", "delta": -200, "balanceAfter": 1340,
  "reason": "Duplicate reward", "actor": { "discordId": "…", "name": "Lina", "avatarUrl": null }, "refId": null }
```

`kind`: `purchase` | `transfer` | `redeem` | `adjust` | `refund`. `refId`
points to the purchase/transfer/redemption id.

### `POST /points/adjust` → `LedgerEntry`

```json
{ "discordId": "900000000000100001", "delta": 250, "reason": "Compensation for outage",
  "actor": { "discordId": "…", "name": "Mock Manager", "avatarUrl": null } }
```

The dashboard has already enforced the permission, the 500-point cap for Head
of Support, the written reason and the confirm step. The provider must apply
it **atomically** and reject with `409` if the balance would go negative,
`404` for an unknown member, `400` for a zero/non-integer delta. It should
also emit `ledger` and `activity` events.

## Members

### `GET /members/search?q=nour&limit=10` → `MemberSummary[]`

Match display name, username, Roblox name, Discord ID or Roblox ID. Empty `q`
returns the top members by lifetime points.

```json
{ "discordId": "…", "username": "nourpro", "displayName": "Nour", "avatarUrl": null, "rank": "silver", "robloxName": "NourPro" }
```

`rank`: `newcomer` | `bronze` | `silver` | `gold` | `diamond` | `legend`.

### `GET /members/:discordId` → `MemberProfile`

`MemberSummary` plus:

```json
{
  "joinedAt": "…",
  "roles": [{ "id": "…", "name": "VIP", "color": "#fbbf24" }],
  "roblox": { "robloxId": "…", "robloxName": "NourPro", "verifiedAt": "…" },
  "points": 1340, "lifetimePoints": 4210, "totalRobux": 38110,
  "purchases": [ /* last 20 PurchaseEvent */ ],
  "tickets":   [ /* TicketSummary, newest first */ ]
}
```

Always send the full profile; the dashboard redacts economy fields for roles
without `members.view_full`.

### `GET /ranks` → `RankInfo[]`, `GET /roles` → `RoleInfo[]`, `GET /staff` → `StaffMember[]`

```json
{ "rank": "gold", "minLifetimePoints": 600, "cashbackRate": 0.12, "members": 41 }
{ "id": "…", "name": "Support Staff", "color": "#6ee7b7", "members": 6 }
{ "discordId": "…", "name": "Lina", "avatarUrl": null, "roles": ["head_support"], "lastSeenAt": "…" }
```

For `/staff`, compute `roles` with the same mapping as `config/roles.ts`
(or return the raw Discord role IDs to a variant endpoint and map them in the
dashboard — either way the role IDs must match).

## Tickets

### `GET /tickets?status=active` → `Page<TicketSummary>`

`status`: `open` | `claimed` | `closed` | `active` (= not closed). Ordered by
`lastMessageAt`, newest first.

```json
{ "id": "tkt_19", "number": 1031, "subject": "Transfer not received", "category": "conversion",
  "status": "claimed", "openedAt": "…", "openedBy": { "discordId": "…", "name": "Sara", "avatarUrl": null },
  "claimedBy": { "discordId": "…", "name": "Reem", "avatarUrl": null }, "transferId": "trf_7c", "lastMessageAt": "…" }
```

### `GET /tickets/:id` → `Ticket`

`TicketSummary` + `messages: TicketMessage[]` (oldest first):
`{ "id", "at", "author": MemberRef, "staff": boolean, "body" }`.

### `POST /tickets/:id/actions` → `Ticket`

One of:

```json
{ "type": "claim",    "actor": MemberRef }
{ "type": "reply",    "actor": MemberRef, "body": "On it!" }
{ "type": "close",    "actor": MemberRef, "reason": "Resolved" }
{ "type": "transfer", "actor": MemberRef, "to": MemberRef }
```

`reply` must post the message into the ticket channel as the Tickets bot
(prefixing the staff name). `409` when claiming a non-open ticket or acting
on a closed one.

## Protection

### `GET /protection` → `ProtectionSettings`

```json
{
  "lockdown": false, "raidMode": false, "raidJoinThreshold": 12, "minAccountAgeDays": 7, "antiLinks": true,
  "blockedWords": [{ "id": "bw-scam", "category": "scam_links", "enabled": true, "words": 412 }],
  "updatedAt": "…"
}
```

`category`: `profanity` | `slurs` | `scam_links` | `invites` | `mass_mentions` | `custom`.

### `PATCH /protection` → `ProtectionSettings`

Any subset of `lockdown`, `raidMode`, `raidJoinThreshold` (2–200),
`minAccountAgeDays` (0–365), `antiLinks`, and
`blockedWords: [{ "id", "enabled" }]`. Return the full new settings and emit a
`protection` event.

## Live events — `GET /events/stream`

A [Server-Sent Events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
stream. The dashboard keeps **one** connection open for all its users, fans
events out, and filters each one by the viewer's permissions. Reconnect is
handled on the dashboard side with exponential backoff.

```
event: purchase
data: {"id":"pur_00a1","at":"…","robloxId":"…","robloxName":"NourPro","item":"Royal Crown","robux":1200,"points":144,"cashbackRate":0.12}

: keep-alive comment every ~15s

event: bot
data: {"name":"ops","state":"restarting", …full BotStatus…}
```

`event:` is the `LiveEvent["type"]`; `data:` is one JSON object of that type.

| event | data | send when |
|---|---|---|
| `purchase` | `PurchaseEvent` | The Roblox map reports a purchase |
| `transfer` | `Transfer` | A transfer is created or changes status / gets a review |
| `redemption` | `Redemption` | Points are spent on a reward |
| `ledger` | `LedgerEntry` | Any balance change |
| `bot` | `BotStatus` | State change, and periodically (≈ every 3–5 s) for memory/cpu/ping |
| `log` | `BotLogLine` | Each new log line (rate-limit to a few per second per bot) |
| `assistant` | `Assistant` | An assistant joins/leaves a room |
| `stats` | `ServerStats` | Any change, at most every few seconds |
| `ticket` | `TicketSummary` | Ticket opened, claimed, replied, closed, handed over |
| `protection` | `ProtectionSettings` | Settings changed (from the dashboard or Discord) |
| `activity` | `ActivityItem` | Anything worth a feed line (see table above) |

## Wiring checklist

1. Implement the endpoints above on the bot server (Express/Fastify next to
   the bots, or inside the Ops bot). Bind to `127.0.0.1`.
2. Generate a token: `openssl rand -hex 32`. Put it in the provider's env and
   in the dashboard's `.env.production` as `PROVIDER_API_TOKEN`.
3. Set `PROVIDER=real` and `PROVIDER_API_URL` in the dashboard env, restart
   with `pm2 restart johood-dashboard`.
4. Search `src/lib/provider/real.ts` for `TODO(wire)` and confirm each mapping.
5. Compare behaviour with the mock (`src/lib/provider/mock.ts`) — status
   codes, ordering, and which events each mutation emits.
6. Run `npm test`.
