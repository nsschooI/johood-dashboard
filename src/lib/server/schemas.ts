import "server-only";
import { z } from "zod";

/** Shared query schema for cursor-paginated lists. */
export const ListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().max(64).optional(),
  discordId: z.string().max(32).optional(),
  search: z.string().max(64).optional(),
});

export const DiscordId = z.string().min(1).max(32).regex(/^[\w-]+$/);
