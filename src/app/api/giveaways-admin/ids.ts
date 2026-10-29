import { z } from "zod";

export const GiveawayId = z.coerce.number().int().positive().max(1e9);
