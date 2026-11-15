/* ONYX IDE — git bridge for the workspace repository
 *
 * GET  /api/ide/git?op=status | log | branch
 * POST /api/ide/git { op: 'commit', message } | { op: 'init' }
 *
 * All commands run with -C <workspace>. Output is parsed, never trusted.
 */

import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import type { GitCommit, GitFile } from "@/lib/ide/types";

export const dynamic = "force-dynamic";

const WORKSPACE = process.env.IDE_WORKSPACE || "/home/z/my-project/ide-workspace";
const run = promisify(execFile);

async function git(args: string[], maxBuffer = 1024 * 1024): Promise<string> {
  const { stdout } = await run("git", ["-C", WORKSPACE, ...args], {
    maxBuffer,
    timeout: 15000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return stdout;
}

export async function GET(req: NextRequest) {
  const op = req.nextUrl.searchParams.get("op");
  try {
    if (op === "status") {
      let branch = "";
      try {
        branch = (await git(["rev-parse", "--abbrev-ref", "HEAD"])).trim();
      } catch {
        /* No repo — usually a sandbox restore (the workspace lives outside
         * git and gets rebuilt empty). Self-heal: init + an initial commit
         * so the git panel is usable again instead of stuck at "no repo". */
        try {
          await fs.mkdir(WORKSPACE, { recursive: true });
          await git(["init"]);
          await git(["add", "-A"]);
          await git([
            "-c",
            "user.email=onyx@workspace.local",
            "-c",
            "user.name=Onyx Workspace",
            "commit",
            "--allow-empty",
            "-m",
            "workspace initialized",
          ]);
          return NextResponse.json({ repo: true, branch: "main", files: [] });
        } catch {
          return NextResponse.json({ repo: false, branch: "", files: [] });
        }
      }
      const out = await git(["status", "--porcelain", "-z"]);
      const files: GitFile[] = [];
      for (const entry of out.split("\0")) {
        if (!entry) continue;
        const x = entry[0];
        const y = entry[1];
        const p = entry.slice(3).trim();
        if (p) files.push({ path: p.split(" -> ").pop() ?? p, x, y });
      }
      return NextResponse.json({ repo: true, branch, files });
    }

    if (op === "log") {
      const out = await git([
        "log",
        "--pretty=format:%h%x1f%s%x1f%an%x1f%aI",
        "-n",
        "30",
      ]).catch(() => "");
      const commits: GitCommit[] = out
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [hash, message, author, date] = line.split("\x1f");
          return { hash, message, author, date };
        });
      return NextResponse.json({ commits });
    }

    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "git error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const op = body?.op as string;

    if (op === "init") {
      try {
        await git(["rev-parse", "--git-dir"]);
      } catch {
        await git(["init"]);
      }
      // make sure commits from the IDE have an identity
      await git(["config", "user.email", "dev@onyx.local"]).catch(() => undefined);
      await git(["config", "user.name", "Onyx Developer"]).catch(() => undefined);
      return NextResponse.json({ ok: true });
    }

    if (op === "commit") {
      const message = String(body?.message ?? "").trim();
      if (!message) return NextResponse.json({ error: "Commit message is required" }, { status: 400 });
      // reject options disguised as messages
      if (message.startsWith("-")) return NextResponse.json({ error: "Invalid message" }, { status: 400 });
      await git(["add", "-A"]);
      const out = await git(["commit", "-m", message.slice(0, 500)]).catch((e) => {
        const stderr = String(e?.stderr ?? "");
        if (stderr.includes("nothing to commit")) return "Nothing to commit — working tree clean";
        throw new Error(stderr.split("\n")[0] || "git commit failed");
      });
      return NextResponse.json({ ok: true, output: out.trim() });
    }

    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "git error" },
      { status: 500 }
    );
  }
}
