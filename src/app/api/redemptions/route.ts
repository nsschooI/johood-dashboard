import { guard, readQuery } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { ListQuery } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

export const GET = guard({ permission: "points.view" }, async ({ req }) => getProvider().getRedemptions(readQuery(req, ListQuery)));
