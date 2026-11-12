/**
 * Buildora AI Worker — Z.AI brain of the platform.
 *
 * A tiny internal HTTP service that wraps z-ai-web-dev-sdk so the
 * FastAPI backend (Python) can use Z.AI for every AI feature.
 * Not exposed to the internet — only the FastAPI service calls it.
 */
import ZAI from "z-ai-web-dev-sdk";

const PORT = 8001;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

Bun.serve({
  port: PORT,
  idleTimeout: 255, // long LLM generations must not be killed
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === "/health") {
      return json({ ok: true, service: "buildora-ai-worker", brain: "Z.AI" });
    }

    if (url.pathname === "/v1/chat" && req.method === "POST") {
      try {
        const body = await req.json();
        const messages = Array.isArray(body.messages) ? body.messages : null;
        if (!messages || messages.length === 0) {
          return json({ error: "messages array is required" }, 400);
        }

        const zai = await getZAI();
        const completion = await zai.chat.completions.create({
          messages,
          thinking: { type: "disabled" },
        });

        const content = completion.choices[0]?.message?.content ?? "";
        return json({ content });
      } catch (err) {
        console.error("[ai-worker] chat error:", err);
        return json({ error: err instanceof Error ? err.message : "unknown error" }, 500);
      }
    }

    return json({ error: "not found" }, 404);
  },
});

console.log(`[ai-worker] Z.AI brain listening on http://127.0.0.1:${PORT}`);
