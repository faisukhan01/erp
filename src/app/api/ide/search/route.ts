/* ONYX IDE — workspace-wide text search
 *
 * POST /api/ide/search { query, caseSensitive?, regex? }
 * Walks the sandboxed workspace and returns matching lines (capped).
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { SearchHit } from "@/lib/ide/types";

export const dynamic = "force-dynamic";

const WORKSPACE = process.env.IDE_WORKSPACE || "/home/z/my-project/ide-workspace";
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
const MAX_FILE_BYTES = 512 * 1024;
const MAX_HITS = 300;
const MAX_FILE_HITS = 20;

async function* walkFiles(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walkFiles(abs);
    } else if (entry.isFile()) {
      yield abs;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = String(body?.query ?? "").trim();
    const caseSensitive = Boolean(body?.caseSensitive);
    const useRegex = Boolean(body?.regex);

    if (!query) return NextResponse.json({ hits: [] });

    let matcher: (line: string) => number;
    if (useRegex) {
      let re: RegExp;
      try {
        re = new RegExp(query, caseSensitive ? "" : "i");
      } catch {
        return NextResponse.json({ error: "Invalid regex" }, { status: 400 });
      }
      matcher = (line) => {
        const m = re.exec(line);
        return m ? m.index : -1;
      };
    } else {
      const needle = caseSensitive ? query : query.toLowerCase();
      matcher = (line) => (caseSensitive ? line : line.toLowerCase()).indexOf(needle);
    }

    const hits: SearchHit[] = [];
    for await (const file of walkFiles(WORKSPACE)) {
      if (hits.length >= MAX_HITS) break;
      let stat;
      try {
        stat = await fs.stat(file);
      } catch {
        continue;
      }
      if (stat.size > MAX_FILE_BYTES || stat.size === 0) continue;

      let content: string;
      try {
        const buf = await fs.readFile(file);
        if (buf.includes(0)) continue; // binary
        content = buf.toString("utf8");
      } catch {
        continue;
      }

      const rel = path.relative(WORKSPACE, file).split(path.sep).join("/");
      const lines = content.split("\n");
      let fileHits = 0;
      for (let i = 0; i < lines.length && fileHits < MAX_FILE_HITS && hits.length < MAX_HITS; i++) {
        const col = matcher(lines[i]);
        if (col !== -1) {
          hits.push({
            path: rel,
            line: i + 1,
            col: col + 1,
            text: lines[i].slice(0, 240),
          });
          fileHits++;
        }
      }
    }

    return NextResponse.json({ hits });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "search error" },
      { status: 500 }
    );
  }
}
