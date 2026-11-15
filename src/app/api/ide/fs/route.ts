/* ONYX IDE — sandboxed workspace filesystem API
 *
 * GET  /api/ide/fs?op=tree                 -> full workspace tree
 * GET  /api/ide/fs?op=read&path=src/x.ts   -> file content
 * POST /api/ide/fs { op, ... }             -> write | createFile | createDir | rename | delete
 *
 * Every path is jailed inside the workspace root. No exceptions.
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { languageOf } from "@/lib/ide/langs";
import type { FileNode } from "@/lib/ide/types";

export const dynamic = "force-dynamic";

const WORKSPACE = process.env.IDE_WORKSPACE || "/home/z/my-project/ide-workspace";
const MAX_FILE_BYTES = 2 * 1024 * 1024; // refuse to read >2MB files
const MAX_TREE_NODES = 4000;

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "__pycache__",
  ".turbo",
  ".cache",
  "venv",
  ".venv",
]);

class SandboxError extends Error {}

function safeResolve(rel: string): string {
  const clean = (rel || "").replace(/^[/\\]+/, "");
  const abs = path.resolve(WORKSPACE, clean);
  if (abs !== WORKSPACE && !abs.startsWith(WORKSPACE + path.sep)) {
    throw new SandboxError("Path escapes the workspace");
  }
  return abs;
}

async function isBinary(file: string): Promise<boolean> {
  const fd = await fs.open(file, "r");
  try {
    const buf = Buffer.alloc(8192);
    const { bytesRead } = await fd.read(buf, 0, 8192, 0);
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return true;
    }
    return false;
  } finally {
    await fd.close();
  }
}

function sortNodes(a: FileNode, b: FileNode): number {
  if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
  return a.name.localeCompare(b.name);
}

async function walk(dir: string, rel: string, budget: { n: number }): Promise<FileNode[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes: FileNode[] = [];
  for (const entry of entries) {
    if (budget.n <= 0) break;
    if (entry.name.startsWith(".") && entry.name !== ".env" && entry.name !== ".gitignore") {
      if (entry.isDirectory()) continue;
    }
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    budget.n--;
    const childAbs = path.join(dir, entry.name);
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    try {
      if (entry.isDirectory()) {
        nodes.push({
          name: entry.name,
          path: childRel,
          type: "dir",
          children: await walk(childAbs, childRel, budget),
        });
      } else if (entry.isFile()) {
        const stat = await fs.stat(childAbs);
        nodes.push({
          name: entry.name,
          path: childRel,
          type: "file",
          size: stat.size,
          updatedAt: stat.mtime.toISOString(),
        });
      }
    } catch {
      /* unreadable entry — skip */
    }
  }
  return nodes.sort(sortNodes);
}

export async function GET(req: NextRequest) {
  const op = req.nextUrl.searchParams.get("op");
  try {
    if (op === "tree") {
      /* Self-heal: the workspace is runtime data outside git, so a sandbox
       * restore can wipe it. An empty-but-present root beats a 500 that
       * renders as "Workspace failed to load". */
      await fs.mkdir(WORKSPACE, { recursive: true });
      const budget = { n: MAX_TREE_NODES };
      const tree = await walk(WORKSPACE, "", budget);
      return NextResponse.json({
        tree,
        workspace: path.basename(WORKSPACE),
        truncated: budget.n <= 0,
      });
    }

    if (op === "read") {
      const rel = req.nextUrl.searchParams.get("path") || "";
      const abs = safeResolve(rel);
      const stat = await fs.stat(abs);
      if (!stat.isFile()) {
        return NextResponse.json({ error: "Not a file" }, { status: 400 });
      }
      if (stat.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "File too large to open" }, { status: 413 });
      }
      if (await isBinary(abs)) {
        return NextResponse.json({ error: "Binary file — cannot open in editor" }, { status: 415 });
      }
      const content = await fs.readFile(abs, "utf8");
      const name = path.basename(abs);
      return NextResponse.json({ content, language: languageOf(name), size: stat.size });
    }

    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (err) {
    const message = err instanceof SandboxError ? err.message : err instanceof Error ? err.message : "fs error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const op = body?.op as string;

    if (op === "write") {
      const abs = safeResolve(body.path);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, String(body.content ?? ""), "utf8");
      return NextResponse.json({ ok: true });
    }

    if (op === "createFile") {
      const abs = safeResolve(body.path);
      let exists = false;
      try {
        await fs.access(abs);
        exists = true;
      } catch {
        exists = false;
      }
      if (exists) throw new SandboxError("File already exists");
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, String(body.content ?? ""), "utf8");
      return NextResponse.json({ ok: true });
    }

    if (op === "createDir") {
      const abs = safeResolve(body.path);
      await fs.mkdir(abs, { recursive: true });
      return NextResponse.json({ ok: true });
    }

    if (op === "rename") {
      const from = safeResolve(body.from);
      const to = safeResolve(body.to);
      await fs.mkdir(path.dirname(to), { recursive: true });
      await fs.rename(from, to);
      return NextResponse.json({ ok: true });
    }

    if (op === "delete") {
      const abs = safeResolve(body.path);
      if (abs === WORKSPACE) throw new SandboxError("Refusing to delete workspace root");
      await fs.rm(abs, { recursive: true, force: true });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (err) {
    const message = err instanceof SandboxError ? err.message : err instanceof Error ? err.message : "fs error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
