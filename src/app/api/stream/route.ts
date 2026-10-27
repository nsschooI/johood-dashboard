import { guard } from "@/lib/server/api";
import { getProvider } from "@/lib/provider";
import { sessionCookieName } from "@/lib/server/session";
import { resolveSession } from "@/lib/server/store";
import { canReceive } from "@/lib/visibility";
import type { LiveEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;
const RECHECK_MS = 30_000;

/**
 * Server-Sent Events: one stream per browser tab. Each event is filtered
 * through the user's permissions before it is written. The session is
 * re-checked every 30s so a logout or revoked override closes the stream.
 */
export const GET = guard({}, async ({ req, user: initialUser }) => {
  const token = req.cookies.get(sessionCookieName())?.value;
  let user = initialUser;
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      const send = (event: LiveEvent) => {
        if (canReceive(user, event)) write(`data: ${JSON.stringify(event)}\n\n`);
      };

      write(`retry: 3000\n: connected\n\n`);
      const unsubscribe = getProvider().subscribe(send);
      const heartbeat = setInterval(() => write(`: ping ${Date.now()}\n\n`), HEARTBEAT_MS);
      const recheck = setInterval(() => {
        const s = resolveSession(token);
        if (!s) {
          write(`event: session\ndata: "expired"\n\n`);
          cleanup();
          return;
        }
        user = s.user;
      }, RECHECK_MS);

      cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(heartbeat);
        clearInterval(recheck);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      req.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
