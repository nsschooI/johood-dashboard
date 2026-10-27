import { guard } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";

export const dynamic = "force-dynamic";

export const GET = guard({ permission: "assistants.view" }, () => getProvider().getAssistants());
