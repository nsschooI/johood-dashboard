# Members, Roblox and leaderboards

Since round 3 the dashboard keeps two worlds apart:

- **Members** — the Discord server: everyone in it, their badge, roles,
  points, tickets and giveaways. The only Roblox fact shown is *linked* or
  *not linked*.
- **Roblox** — only people connected to the game: who linked, who would link
  easily, and buyers who aren't in the server yet. Purchases, Robux,
  transfers and the in-game level live here.

**Leaderboards** rank the server's members by points, chat, voice and
reactions.

Everything below works with `PROVIDER=mock` and no setup. The real provider
calls the endpoints in [provider-api.md](provider-api.md); the ones marked
*501 until built* show the usual "not connected yet" toast and are audited as
`not_connected` until the backend has them.

## Who may do what

| Action | Roles | Covers |
|---|---|---|
| `members.view` | Owner, Manager, Head of Support, Support | Members directory and profiles, Leaderboards |
| `members.view_full` | Owner, Manager, Head of Support | Points in the directory and profiles (and sorting by points) |
| `members.roles` | Owner (Founders map to Owner) | Adding and removing Discord roles. **Can't be granted by override** — whoever can give roles could give themselves a staff role |
| `permissions.manage` | Owner | Per-person overrides (the Dashboard tab of Manage access) |
| `audit.view` | Owner, Manager | The Activity tab of Manage access |
| `roblox.view` | Owner, Manager, Head of Support | The Roblox page, link invitations and in-game nudges |
| `giveaways.manage` | Owner | Start, end, reroll and **delete** giveaways |

Manage access opens for anyone with `permissions.manage` or `members.roles`;
everyone else sees the menu item disabled with the reason.

## Members page (`/members`)

- **Directory** of every member of the selected server: search by name or
  Discord ID, sort by points / newest / name, "load more" in pages of 30.
  Counts at the top: members, linked to Roblox (with `roblox.view`), staff.
- Each row: avatar, display name, `@username`, server points, a
  *linked / not linked* chip and **one badge**.
- **Badge** (`{ kind: "staff" | "rank", label, color }`) comes from the
  backend: their server rank (Luna, Astra, …) or, for staff, their staff
  role. `null` shows nothing — the dashboard never shows "Newcomer" on its
  own. The economy's lowest in-game level is now labelled "Starter".
- **Profile**: Discord roles, server and lifetime points, joined date and
  "member for", recent points, ticket timeline, giveaways joined, and one
  Roblox line with a link to the Roblox page (linked) or the link candidates
  (not linked). No purchases, Robux or Roblox account details.
- **⋯ menu**: Open profile, Copy Discord ID, Open points ledger, Adjust
  points, Manage access.
- The **Roles** tab lists the server's Discord roles. The in-game levels
  (cashback tiers) moved to the Points page.

## Manage access (panel)

A drawer for one member, from any "Manage access" action:

1. **Dashboard** — the dashboard roles their Discord roles give, how many
   permissions they have now, and the per-person override editor (the same
   one as on the Access page: allow / deny single permissions, a reason, a
   diff and a confirm). Members without a staff role can't sign in, so the
   tab explains that instead.
2. **Discord roles** — pick the server, see their roles, add a role from a
   searchable list or remove one. Roles the bot can't manage (above the
   bot, managed by Discord, `@everyone`) are disabled with the reason. The
   ⓘ on each role shows what it gives in the dashboard ("same as Manager ·
   25 permissions"). Every change asks first and is audited
   (`members.roles`, with the role names before and after).
3. **Activity** — the audit entries about this member: role and permission
   changes, point adjustments, link invitations.

Dashboard API: `GET /api/members/:id/access?guild=`,
`POST /api/members/:id/roles?guild=` (`{ add, remove, confirm }` — 428
without confirm, 400 `not_assignable` with the offending role IDs),
`GET /api/members/:id/audit`.

## Roblox page (`/roblox`)

Three tabs, each with its count:

1. **Linked** — Discord avatar and name, Roblox headshot and username, when
   they linked, purchases, Robux spent, server points. Search, sort (Robux
   spent / newest link / points), load more. A row opens the **player
   drawer**: Roblox account, member profile link, totals, rank in game,
   recent purchases, transfers and rewards. **Copy list** copies every
   matching member's Discord ID (one per line — for giveaways run only for
   this group); **CSV** exports all columns.
2. **Link candidates** — very active members who haven't linked: points,
   last activity, an "Open ticket now" badge with a link to the ticket.
   Filters: has an open ticket, minimum points; sort by points or open
   ticket first. **Send link invitation** (confirm) — the bot DMs them a
   short guide; the row then shows "Invited 2 days ago". *501 until built.*
3. **Outside the server** — players who bought in the game but aren't in the
   Discord server: Roblox headshot and username, Robux spent, purchases,
   last purchase. **Nudge in game** (confirm, with a preview) shows them:
   "We recommend joining our server (JHD) to do the transfer, it is much
   faster there." with a join button. The row then shows "Nudged 3 days
   ago". *501 until built.*

Invitations and nudges are rate limited (`outreach`, 30 a minute per staff
member) and audited as `roblox.invite` / `roblox.nudge`.

### Contract

```ts
type LinkedPlayer = { discordId; discordName; avatarUrl: string | null; robloxId; robloxName;
                      robloxAvatarUrl: string | null; linkedAt; purchases: number; spentRobux: number; points: number };
type Candidate    = { discordId; name; avatarUrl: string | null; points: number; openTicketId: string | null;
                      lastActiveAt: string | null; invitedAt: string | null };
type OutsidePlayer = { robloxId; robloxName; robloxAvatarUrl: string | null; spentRobux: number;
                       purchases: number; lastPurchaseAt: string; nudgedAt: string | null };

GET  /roblox/linked?q=&page=&pageSize=&sort=spent|linked|points      → NumberedPage<LinkedPlayer>
GET  /roblox/candidates?q=&page=&pageSize=&sort=points|ticket         → NumberedPage<Candidate>
       (+ hasTicket=1, minPoints=N — filters the dashboard adds; see below)
POST /roblox/candidates/:discordId/invite   { actor }                 → { invitedAt }
GET  /roblox/outside?page=&pageSize=&sort=spent|last                  → NumberedPage<OutsidePlayer>
POST /roblox/outside/:robloxId/nudge        { actor }                 → { nudgedAt }
```

**Additions to the brief's contract, for the server session:**

- `GET /roblox/candidates` also gets `hasTicket=1` and `minPoints=N` (the
  page's filters). A backend that ignores them returns the unfiltered list,
  so the filters just won't narrow it.
- `GET /roblox/outside` also gets `q` (search by Roblox name or ID).
- `GET /roblox/linked?q=<discordId>` is used to load one player's totals for
  the drawer, so `q` should match an exact Discord ID.
- Headshots come from the dashboard's own Roblox thumbnail resolver (by
  `robloxId`); `robloxAvatarUrl` isn't needed.

## Leaderboards page (`/leaderboards`)

- Boards: **General** (points) · **Chat** (messages) · **Voice** (minutes,
  shown as hours and minutes) · **Reactions**.
- Periods: Today · 2 days · Week · Month · All time.
- A podium for the top three (avatar, name, value, badge; the winner in the
  middle with a crown) and the ranked list below, with ↑/↓ arrows when the
  backend sends `delta` (places moved). Search filters the board.
- Follows the server switcher; refreshes every 60 s while the tab is
  visible, keeping the current board on screen while it reloads.
- **Before the points reset** the server records only all-time activity:
  every other period answers `{ items: [], available: false }` and the page
  says "This period starts recording on the reset day", with a button back to
  All time.

```ts
GET /leaderboard?kind=general|chat|voice|reactions&period=day|2d|week|month|all&limit=50
  → { kind, period, available: boolean, since: string | null, updatedAt: string,
      items: { rank, discordId, name, avatarUrl, value, badge: Badge | null, delta?: number }[] }
```

## Giveaway delete

On the giveaways list (trash button) and the details page: **Delete
giveaway** (`giveaways.manage`). The confirm spells out what goes — the
giveaway and its results, every entry and blocked member, and its Discord
message — and points to *End now* for keeping the record. After deleting
the page returns to the list with a toast; other open pages drop it through
the live `giveaway` event (`deleted: true`). Audited as `giveaways.delete`
with what was deleted. Backend: `POST /admin/giveaways/:id/delete`
`{ actor }` → `{ deleted: true }`.

## The mock

`src/lib/provider/mock-community.ts` simulates all of this from the main
simulation's members, purchases and tickets:

- The ten mock staff are members too, with their staff badge.
- Server ranks (invented): Luna 80+, Astra 300+, Nova 900+, Orion 2,200+,
  Sol 5,000+ server points; below 80, no badge.
- Points earned on the server before the simulated history are booked as an
  `activity` ledger entry, so the directory, the profile and the ledger
  agree. Activity numbers come from a hash of each member's ID, so they're
  stable and don't shift the seeded data tests rely on.
- Role changes really change the member's roles (and so their dashboard
  roles in the mock). Owner and Founder are "above the bot"; Server Booster
  is "managed".
- A few very active unlinked members have an open ticket right now.
- 46 invented players bought in the game without joining Discord.
- Leaderboards: only All time by default, like the server today. Pass
  `leaderboardSince` to `MockProvider` to simulate after the reset.
- `MOCK_NOT_IMPLEMENTED=true` makes roles, invitations and nudges answer 501.
