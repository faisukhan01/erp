/**
 * Buildora AI Worker — the Z.AI brain of the platform.
 *
 * A tiny internal HTTP service that wraps z-ai-web-dev-sdk so the
 * FastAPI backend (Python) can use Z.AI for every AI feature.
 * Not exposed to the internet — only the FastAPI service calls it.
 *
 * Endpoints:
 *   GET  /health           -> liveness
 *   POST /v1/chat          -> JSON { content }  (non-streaming, used for planning/naming)
 *   POST /v1/chat/stream   -> SSE relay of raw Z.AI token deltas (used for code builds)
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

/** Parse an OpenAI-style SSE byte stream into {content} deltas.
 *  Throws when no new delta arrives within `idleMs` — a stalled upstream
 *  must never wedge the whole build pipeline. */
async function* sseDeltas(body: ReadableStream<Uint8Array>, idleMs = 90_000) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const guard = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Z.AI stream stalled — no tokens for ${idleMs / 1000}s`)),
        idleMs
      );
    });
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await Promise.race([reader.read(), guard]);
    } finally {
      clearTimeout(timer!);
    }
    const { done, value } = chunk;
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) yield delta;
      } catch {
        /* ignore malformed keep-alive lines */
      }
    }
  }
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

    // ---------------------------------------------------------- JSON chat
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
          // Z.AI caps output at ~4.5K tokens by default which truncates large
          // single-file apps. Lift the ceiling so complete documents fit.
          max_tokens: 16384,
        });

        const content = completion.choices[0]?.message?.content ?? "";
        return json({ content });
      } catch (err) {
        console.error("[ai-worker] chat error:", err);
        return json({ error: err instanceof Error ? err.message : "unknown error" }, 500);
      }
    }

    // ------------------------------------------------------ streaming chat
    if (url.pathname === "/v1/chat/stream" && req.method === "POST") {
      try {
        const body = await req.json();
        const messages = Array.isArray(body.messages) ? body.messages : null;
        if (!messages || messages.length === 0) {
          return json({ error: "messages array is required" }, 400);
        }

        const zai = await getZAI();
        const upstream = (await zai.chat.completions.create({
          messages,
          stream: true,
          thinking: { type: "disabled" },
          // Same ceiling lift as /v1/chat — large apps must not truncate.
          max_tokens: 16384,
        }) as ReadableStream<Uint8Array>);

        const sse = new ReadableStream<Uint8Array>({
          async start(controller) {
            const enc = new TextEncoder();
            let full = "";
            // keep-alive pings keep intermediaries warm and tell consumers
            // the relay is alive even while the model thinks
            const keepalive = setInterval(() => {
              try {
                controller.enqueue(enc.encode(`data: ${JSON.stringify({ keepalive: true })}\n\n`));
              } catch {
                /* consumer gone — the main loop will surface it */
              }
            }, 15000);
            try {
              for await (const delta of sseDeltas(upstream)) {
                full += delta;
                controller.enqueue(enc.encode(`data: ${JSON.stringify({ delta })}\n\n`));
              }
              controller.enqueue(
                enc.encode(`data: ${JSON.stringify({ done: true, total: full.length })}\n\n`)
              );
            } catch (err) {
              const message = err instanceof Error ? err.message : "stream failed";
              controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
            } finally {
              clearInterval(keepalive);
              controller.close();
            }
          },
        });

        return new Response(sse, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
            ...CORS,
          },
        });
      } catch (err) {
        console.error("[ai-worker] stream error:", err);
        return json({ error: err instanceof Error ? err.message : "unknown error" }, 500);
      }
    }

    // ------------------------------------------------------ JS syntax check
    // Validates inline <script> blocks with the real JS engine (parse only,
    // never executed) and checks that every inline on*="handler()" reference
    // points to a top-level global declaration — the two failure modes that
    // silently kill generated apps. The API auto-repairs before saving.
    if (url.pathname === "/v1/check-js" && req.method === "POST") {
      try {
        const body = await req.json();
        const scripts: string[] = Array.isArray(body.scripts) ? body.scripts : [];
        const html: string = typeof body.html === "string" ? body.html : "";
        const errors: { index: number; message: string }[] = [];

        for (let i = 0; i < scripts.length; i++) {
          try {
            // new Function parses the code without executing it
            new Function(scripts[i]);
          } catch (err) {
            errors.push({
              index: i,
              message: `syntax error: ${err instanceof Error ? err.message : "invalid JavaScript"}`,
            });
          }
        }

        // Inline handler reference check (only when syntax is clean)
        if (errors.length === 0 && html) {
          const allCode = scripts.join("\n\n");
          const handlerRe = /\son[a-z]+\s*=\s*"([^"]*)"|\son[a-z]+\s*=\s*'([^']*)'/gi;
          const referenced = new Set<string>();
          let m: RegExpExecArray | null;
          while ((m = handlerRe.exec(html)) !== null) {
            const code = m[1] ?? m[2] ?? "";
            for (const call of code.matchAll(/([a-zA-Z_$][\w$]*)\s*\(/g)) {
              const name = call[1];
              if (!["this", "event", "alert", "confirm", "prompt", "setTimeout", "setInterval", "fetch", "console"].includes(name)) {
                referenced.add(name);
              }
            }
          }
          for (const name of referenced) {
            const esc = name.replace(/\$/g, "\\$");
            const topLevel = new RegExp(
              `(^|\\n)[ \\t]{0,1}(function\\s+${esc}\\b|window\\.${esc}\\s*=|(?:var|let|const)\\s+${esc}\\s*=)`
            );
            if (!topLevel.test(allCode)) {
              errors.push({
                index: -1,
                message: `inline handler calls '${name}()' but it is not declared at global top-level scope. Declare it as a top-level 'function ${name}() {}' (never inside DOMContentLoaded/closures) or bind it with addEventListener instead of inline onclick.`,
              });
            }
          }
        }

        return json({ ok: errors.length === 0, errors });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : "unknown error" }, 500);
      }
    }

    return json({ error: "not found" }, 404);
  },
});

console.log(`[ai-worker] Z.AI brain listening on http://127.0.0.1:${PORT}`);
