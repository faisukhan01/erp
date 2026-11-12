import { NextResponse } from "next/server";
import { spawn } from "child_process";

/**
 * Internal infrastructure boot endpoint.
 * Ensures the Buildora mini-services (FastAPI :8000 + Z.AI worker :8001)
 * are running. Spawned as children of the persistent Next.js server
 * process so they survive in the sandbox. Idempotent + self-healing:
 * the frontend calls this before its first API request.
 */

const API_DIR = "/home/z/my-project/mini-services/api";
const WORKER_DIR = "/home/z/my-project/mini-services/ai-worker";

async function healthy(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000), cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

function spawnService(dir: string, logFile: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs") as typeof import("fs");
  const out = fs.openSync(logFile, "a");
  const child = spawn("bun", ["run", "dev"], {
    cwd: dir,
    stdio: ["ignore", out, out],
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  child.unref();
  return child.pid;
}

export async function GET() {
  const WORKER = "http://127.0.0.1:8001/health";
  const API = "http://127.0.0.1:8000/api/health";

  const [workerUp, apiUp] = await Promise.all([healthy(WORKER), healthy(API)]);

  const spawned: Record<string, number | undefined> = {};
  if (!workerUp) {
    spawned.worker = spawnService(WORKER_DIR, "/home/z/my-project/mini-services/ai-worker/worker.log");
  }
  if (!apiUp) {
    spawned.api = spawnService(API_DIR, "/home/z/my-project/mini-services/api/api.log");
  }

  // give services a moment to boot
  for (let i = 0; i < 20; i++) {
    const [w, a] = await Promise.all([healthy(WORKER), healthy(API)]);
    if (w && a) break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  const [workerOk, apiOk] = await Promise.all([healthy(WORKER), healthy(API)]);

  return NextResponse.json({
    worker: workerOk ? "up" : "down",
    api: apiOk ? "up" : "down",
    spawned,
  });
}
