/* ONYX IDE — live preview server
 *
 * GET /api/ide/preview/                 -> workspace index.html (or a landing page)
 * GET /api/ide/preview/<path...>        -> any workspace asset, correct MIME
 * GET /api/ide/preview/__onyx_rev       -> workspace revision signature (for auto-reload)
 *
 * This route IS "localhost" for the IDE: the preview iframe points here and
 * every HTML response carries a tiny poller that reloads the page whenever a
 * workspace file changes — whether the write came from the editor, the
 * terminal, or the Onyx AI agent.
 *
 * Paths are jailed inside the workspace root. No exceptions.
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const WORKSPACE = process.env.IDE_WORKSPACE || "/home/z/my-project/ide-workspace";
const MAX_ASSET_BYTES = 25 * 1024 * 1024;
const MAX_WALK_NODES = 2500;

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

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  cjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  map: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  bmp: "image/bmp",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
  wasm: "application/wasm",
  pdf: "application/pdf",
};

class SandboxError extends Error {}

function safeResolve(segments: string[] | undefined): string {
  const rel = (segments ?? []).join("/");
  const clean = rel.replace(/^[/\\]+/, "");
  const abs = path.resolve(WORKSPACE, clean);
  if (abs !== WORKSPACE && !abs.startsWith(WORKSPACE + path.sep)) {
    throw new SandboxError("Path escapes the workspace");
  }
  return abs;
}

function mimeOf(file: string): string {
  const ext = path.extname(file).slice(1).toLowerCase();
  return MIME[ext] ?? "application/octet-stream";
}

/**
 * Cheap filesystem-derived revision signature. Hash of every file's
 * relpath:size:mtime — process-agnostic, so writes from the editor API,
 * the terminal or the agent server all bump it.
 */
async function workspaceRev(): Promise<string> {
  let h = 5381;
  let n = 0;
  const walk = async (dir: string, rel: string): Promise<void> => {
    if (n > MAX_WALK_NODES) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (n > MAX_WALK_NODES) return;
      if (entry.name.startsWith(".")) continue;
      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
      n++;
      const childAbs = path.join(dir, entry.name);
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(childAbs, childRel);
      } else if (entry.isFile()) {
        try {
          const st = await fs.stat(childAbs);
          const token = `${childRel}:${st.size}:${Math.floor(st.mtimeMs)}`;
          for (let i = 0; i < token.length; i++) h = ((h << 5) + h + token.charCodeAt(i)) >>> 0;
        } catch {
          /* vanished mid-walk — ignore */
        }
      }
    }
  };
  await walk(WORKSPACE, "");
  return h.toString(36) + "." + n.toString(36);
}

/* ------------------------------------------------------------- html pages */

const RELOAD_SCRIPT = `<script>(function(){
  var rev = null;
  setInterval(function(){
    fetch('/api/ide/preview/__onyx_rev', {cache:'no-store'})
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(d){ if (!d) return; if (rev === null) { rev = d.rev; return; }
        if (d.rev !== rev) { rev = d.rev; setTimeout(function(){ location.reload(); }, 150); } })
      .catch(function(){});
  }, 1200);
})();</script>`;

/**
 * Next.js strips the trailing slash from /api/ide/preview/ via a 308, which
 * would make relative asset URLs resolve one level too high. A <base> tag
 * pins every user page to the workspace root no matter how it was reached.
 */
function injectBase(html: string): string {
  if (/<base\s/i.test(html)) return html; // respect a user-supplied <base>
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}\n<base href="/api/ide/preview/"/>`);
  }
  return `<base href="/api/ide/preview/"/>\n` + html;
}

function injectReload(html: string): string {
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${RELOAD_SCRIPT}\n</body>`);
  return html + RELOAD_SCRIPT;
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; }
  body {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #050505; color: #d4d4d4;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    padding: 24px;
  }
  .card {
    width: 100%; max-width: 520px; border: 1px solid #1d1d1d; border-radius: 10px;
    background: #0a0a0a; padding: 28px;
  }
  .mark { width: 10px; height: 10px; background: #00e5ff; border-radius: 2px;
          box-shadow: 0 0 12px #00e5ff66; }
  h1 { font-size: 15px; font-weight: 600; letter-spacing: .02em; color: #f2f2f2; margin-top: 14px; }
  p  { font-size: 12.5px; line-height: 1.7; color: #8a8a8a; margin-top: 10px; }
  code { color: #6ee7ff; background: #101010; border: 1px solid #1a1a1a;
         border-radius: 4px; padding: 1px 5px; font-size: 11.5px; }
  .foot { margin-top: 18px; padding-top: 14px; border-top: 1px solid #161616;
          font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: #4a4a4a; }
</style>
</head>
<body><div class="card">
  <span class="mark"></span>
  ${body}
  <div class="foot">onyx live preview &middot; auto-refresh armed</div>
</div>${RELOAD_SCRIPT}</body>
</html>`;
}

const LANDING_PAGE = () =>
  page(
    "Onyx Live Preview",
    `<h1>Live preview is armed</h1>
     <p>There is no <code>index.html</code> at the workspace root yet.</p>
     <p>Open <strong>Onyx AI</strong> and ask it to build something — for example
     <code>build a pomodoro timer</code>. Files land in <code>index.html</code> and
     <code>src/</code>, and this page refreshes on its own the moment they're written.</p>`
  );

const NOT_FOUND_PAGE = (rel: string) =>
  page(
    "404 — Onyx Live Preview",
    `<h1>404 &middot; not found</h1>
     <p><code>${rel.replace(/[<>&"]/g, "")}</code> does not exist in the workspace.</p>
     <p>Check the path, or ask Onyx AI to create it. This page refreshes automatically.</p>`
  );

/* ------------------------------------------------------------------ route */

export async function GET(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path: segments } = await ctx.params;
  const rel = (segments ?? []).join("/");

  const headers = (mime: string) =>
    new Headers({
      "Content-Type": mime,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });

  try {
    /* revision endpoint for the auto-reload poller */
    if (rel === "__onyx_rev") {
      return NextResponse.json({ rev: await workspaceRev() }, { headers: { "Cache-Control": "no-store" } });
    }

    let abs = safeResolve(segments);

    /* directory (or root) -> index.html */
    const stat = await fs.stat(abs).catch(() => null);
    if (!stat) {
      /* The preview iframe always mounts /index.html (it skips Next's
       * trailing-slash 308). On an empty workspace that must read as the
       * armed landing page, not a 404 — otherwise a fresh project looks
       * broken before the first build. */
      if (!rel || rel === "index.html") return new NextResponse(LANDING_PAGE(), { status: 200, headers: headers(MIME.html) });
      return new NextResponse(NOT_FOUND_PAGE(rel), { status: 404, headers: headers(MIME.html) });
    }
    if (stat.isDirectory()) {
      const idx = path.join(abs, "index.html");
      const idxStat = await fs.stat(idx).catch(() => null);
      if (!idxStat || !idxStat.isFile()) {
        if (!rel) return new NextResponse(LANDING_PAGE(), { status: 200, headers: headers(MIME.html) });
        return new NextResponse(NOT_FOUND_PAGE(rel), { status: 404, headers: headers(MIME.html) });
      }
      abs = idx;
    }

    const fileStat = await fs.stat(abs);
    if (fileStat.size > MAX_ASSET_BYTES) {
      return new NextResponse(NOT_FOUND_PAGE(rel), { status: 413, headers: headers(MIME.html) });
    }

    const buf = await fs.readFile(abs);
    const mime = mimeOf(abs);

    if (mime.startsWith("text/html")) {
      return new NextResponse(injectReload(injectBase(buf.toString("utf8"))), {
        headers: headers(mime),
      });
    }

    return new NextResponse(new Uint8Array(buf), { headers: headers(mime) });
  } catch (err) {
    if (err instanceof SandboxError) {
      return new NextResponse(NOT_FOUND_PAGE(rel), { status: 404, headers: headers(MIME.html) });
    }
    const message = err instanceof Error ? err.message : "preview error";
    const body = page("Error — Onyx Live Preview", `<h1>Preview error</h1><p><code>${message.replace(/[<>&"]/g, "")}</code></p>`);
    return new NextResponse(body, { status: 500, headers: headers(MIME.html) });
  }
}
