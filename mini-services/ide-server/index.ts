/**
 * ONYX IDE server — the muscle behind the editor.
 *
 * Socket.io service (port 3003) exposing two things to the browser IDE:
 *
 *   1. Terminal  — real bash sessions inside the workspace sandbox.
 *                  `exec` runs a command with a persistent cwd, streams
 *                  stdout/stderr back live, reports exit codes.
 *   2. Onyx AI   — streaming Z.AI chat completions with file context,
 *                  emitted token-by-token.
 *
 * Never exposed publicly — reached through the gateway only.
 */

import { createServer } from "http";
import { spawn, type ChildProcess } from "child_process";
import { Server, type Socket as IOSocket } from "socket.io";
import ZAI from "z-ai-web-dev-sdk";
import path from "path";
import fs from "fs";

const PORT = 3003;
const WORKSPACE = process.env.IDE_WORKSPACE || "/home/z/my-project/ide-workspace";
const MAX_PROCS_PER_SOCKET = 8;
const MAX_CONTEXT_CHARS = 48_000;
const MAX_FILE_CHARS = 16_000;

/* ------------------------------------------------------------------ z.ai */

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZAI() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

/** Parse an OpenAI-style SSE byte stream into content deltas. */
async function* sseDeltas(body: ReadableStream<Uint8Array>, idleMs = 90_000) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const guard = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Z.AI stream stalled after ${idleMs / 1000}s`)), idleMs);
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
        /* keep-alive or malformed line */
      }
    }
  }
}

const SYSTEM_PROMPT = `You are Onyx AI, the pair programmer embedded inside the Onyx IDE — a machined-black, keyboard-first development environment.

Rules of engagement:
- Be concise and technically precise. No filler, no emojis, no fluff.
- The user's workspace files are attached when relevant.
- To create or modify a file, ALWAYS output the COMPLETE updated file (never a fragment) in a single fenced code block whose info string ends with path=<workspace-relative path>, exactly like:

\`\`\`ts path=src/utils.ts
<complete file content>
\`\`\`

The IDE renders an "Apply" button only for blocks that carry path= — so every file-modifying answer MUST use that form. For quick inline explanations, short snippets are fine, but they must not replace full-file answers.
- You have NO file reading tools. If you need the content of a file that was not attached, say so and ask the user to attach it with an @ mention. Never guess or print placeholders like "undefined" for file content.
- Prefer editing existing files over creating new ones.
- If asked about the IDE itself: you are Onyx, built with Next.js 16, Monaco, xterm.js, socket.io and Z.AI.`;

function buildContext(files: { path: string; content: string }[] | undefined): string {
  if (!files || files.length === 0) return "";
  let budget = MAX_CONTEXT_CHARS;
  const sections: string[] = [];
  for (const f of files) {
    if (budget <= 0) break;
    const content = f.content.length > MAX_FILE_CHARS ? f.content.slice(0, MAX_FILE_CHARS) + "\n… (truncated)" : f.content;
    const section = `\n--- File: ${f.path} ---\n${content}`;
    if (section.length > budget) break;
    budget -= section.length;
    sections.push(section);
  }
  return sections.length
    ? `\n\nThe user attached these workspace files for context:\n${sections.join("\n")}`
    : "";
}

/* -------------------------------------------------------------- sessions */

interface TermSession {
  cwd: string;
  procs: Map<string, ChildProcess>;
}

function sessions(io: Server, socket: IOSocket) {
  const session: TermSession = { cwd: WORKSPACE, procs: new Map() };

  // tell the client where the shell starts
  socket.emit("cwd", { cwd: session.cwd });

  const safeCwd = (candidate: string): string | null => {
    const abs = path.resolve(session.cwd, candidate);
    if (abs !== WORKSPACE && !abs.startsWith(WORKSPACE + path.sep)) return null;
    return abs;
  };

  const send = (event: string, payload: unknown) => socket.emit(event, payload);

  socket.on("exec", async (data: { id: string; cmd: string }) => {
    const id = String(data?.id ?? "");
    const raw = String(data?.cmd ?? "");
    const cmd = raw.trim();
    if (!id) return;

    if (!cmd) {
      send("exit", { id, code: 0 });
      return;
    }

    // handled jointly with the client
    if (cmd === "clear" || cmd === "cls") {
      send("data", { id, special: "clear" });
      send("exit", { id, code: 0 });
      return;
    }

    if (cmd === "cwd") {
      send("cwd", { cwd: session.cwd });
      send("data", { id, out: session.cwd + "\n" });
      send("exit", { id, code: 0 });
      return;
    }

    // cd built-in — validates and persists the working directory
    if (cmd === "cd" || cmd.startsWith("cd ")) {
      const target = cmd === "cd" ? WORKSPACE : cmd.slice(3).trim().replace(/^["']|["']$/g, "");
      const abs = safeCwd(target || WORKSPACE);
      if (!abs) {
        send("data", { id, err: `cd: permission denied: ${target}\n` });
        send("exit", { id, code: 1 });
        return;
      }
      try {
        const stat = await fs.promises.stat(abs);
        if (!stat.isDirectory()) throw new Error("not a directory");
        session.cwd = abs;
        send("cwd", { cwd: session.cwd });
        send("exit", { id, code: 0 });
      } catch {
        send("data", { id, err: `cd: no such directory: ${target}\n` });
        send("exit", { id, code: 1 });
      }
      return;
    }

    if (session.procs.size >= MAX_PROCS_PER_SOCKET) {
      send("data", { id, err: `onyx: too many running jobs (max ${MAX_PROCS_PER_SOCKET})\n` });
      send("exit", { id, code: 1 });
      return;
    }

    const child = spawn("bash", ["-c", cmd], {
      cwd: session.cwd,
      env: {
        ...process.env,
        TERM: "dumb",
        NO_COLOR: "1",
        FORCE_COLOR: "0",
        PAGER: "cat",
        GIT_PAGER: "cat",
        GIT_EDITOR: "true",
        EDITOR: "true",
        HOME: process.env.HOME || "/home/z",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    session.procs.set(id, child);

    child.stdout?.on("data", (buf: Buffer) => send("data", { id, out: buf.toString("utf8") }));
    child.stderr?.on("data", (buf: Buffer) => send("data", { id, err: buf.toString("utf8") }));

    const cleanup = (code: number) => {
      if (!session.procs.has(id)) return;
      session.procs.delete(id);
      send("cwd", { cwd: session.cwd });
      send("exit", { id, code });
    };
    child.on("close", cleanup);
    child.on("error", (err) => {
      send("data", { id, err: `${err.message}\n` });
      cleanup(127);
    });
  });

  socket.on("kill", (data: { id: string }) => {
    const id = String(data?.id ?? "");
    const child = session.procs.get(id);
    if (child) {
      child.kill("SIGKILL");
      session.procs.delete(id);
      send("exit", { id, code: 137 });
    }
  });

  socket.on("ai:send", async (data: { id: string; messages: { role: string; content: string }[]; files?: { path: string; content: string }[] }) => {
    const id = String(data?.id ?? "");
    if (!id) return;
    try {
      const history = Array.isArray(data?.messages) ? data.messages.slice(-24) : [];
      const messages = [
        { role: "system", content: SYSTEM_PROMPT + buildContext(data?.files) },
        ...history.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content ?? "").slice(0, 24_000) })),
      ];
      const zai = await getZAI();
      const upstream = (await zai.chat.completions.create({
        messages,
        stream: true,
        thinking: { type: "disabled" },
        max_tokens: 16384,
      })) as ReadableStream<Uint8Array>;

      for await (const delta of sseDeltas(upstream)) {
        send("ai:delta", { id, delta });
      }
      send("ai:done", { id });
    } catch (err) {
      send("ai:error", { id, error: err instanceof Error ? err.message : "AI request failed" });
    }
  });

  socket.on("disconnect", () => {
    for (const child of session.procs.values()) {
      try {
        child.kill("SIGKILL");
      } catch {
        /* already gone */
      }
    }
    session.procs.clear();
  });
}

/* ---------------------------------------------------------------- server */

const httpServer = createServer();
const io = new Server(httpServer, {
  // DO NOT change the path — the gateway uses it to forward to this port
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on("connection", (socket) => {
  console.log(`[ide-server] connected: ${socket.id}`);
  sessions(io, socket);
  socket.on("error", (err) => console.error(`[ide-server] socket error:`, err));
});

httpServer.listen(PORT, () => {
  console.log(`[ide-server] Onyx IDE server on port ${PORT} — workspace: ${WORKSPACE}`);
});

process.on("SIGTERM", () => {
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  httpServer.close(() => process.exit(0));
});
