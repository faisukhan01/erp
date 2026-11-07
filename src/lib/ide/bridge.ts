/* ONYX IDE — bridge for terminal exec requests from anywhere in the app.
 * The terminal component drains the queue on mount (so Run works even when
 * the panel starts closed) and on every queued event afterwards. */

"use client";

const pending: string[] = [];

export function enqueueTermExec(cmd: string) {
  pending.push(cmd);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("onyx:term-queued"));
  }
}

export function drainPending(): string[] {
  return pending.splice(0);
}

const RUN_MAP: Record<string, string> = {
  ts: "bun run",
  tsx: "bun run",
  js: "node",
  mjs: "node",
  cjs: "node",
  py: "python3",
  sh: "bash",
};

/** Run a workspace file in the terminal based on its extension. */
export function runForPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const bin = RUN_MAP[ext];
  const cmd = bin ? `${bin} "${path}"` : `cat "${path}"`;
  enqueueTermExec(cmd);
  return cmd;
}

export function clearTerminal() {
  enqueueTermExec("clear");
}
