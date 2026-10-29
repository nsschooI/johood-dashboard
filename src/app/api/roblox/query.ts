import { z } from "zod";

/** Shared query for the Roblox lists (numbered pages). */
export const paged = <S extends readonly [string, ...string[]]>(sorts: S) =>
  z.object({
    q: z.string().trim().max(64).default(""),
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    pageSize: z.coerce.number().int().min(5).max(100).default(25),
    sort: z.enum(sorts).default(sorts[0]),
  });
