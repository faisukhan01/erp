/* Language + icon metadata for file types in the IDE */

const LANG_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  md: "markdown",
  mdx: "markdown",
  css: "css",
  scss: "scss",
  less: "less",
  html: "html",
  htm: "html",
  svg: "xml",
  xml: "xml",
  py: "python",
  rb: "ruby",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin",
  c: "c",
  h: "c",
  cpp: "cpp",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  yml: "yaml",
  yaml: "yaml",
  toml: "ini",
  ini: "ini",
  env: "ini",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  vue: "html",
  svelte: "html",
  txt: "plaintext",
  lock: "plaintext",
  prisma: "plaintext",
};

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export function languageOf(name: string): string {
  if (name.startsWith(".env")) return "ini";
  if (name.toLowerCase() === "dockerfile") return "shell";
  if (name.toLowerCase() === "makefile") return "shell";
  return LANG_MAP[extOf(name)] ?? "plaintext";
}

/** Flat icon glyph per file family — machined, not cartoonish. */
export function fileGlyph(name: string): { glyph: string; color: string } {
  const ext = extOf(name);
  switch (ext) {
    case "ts":
    case "tsx":
    case "mts":
      return { glyph: "TS", color: "#5cc8ff" };
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return { glyph: "JS", color: "#ffd75e" };
    case "json":
      return { glyph: "{}", color: "#c9c9c9" };
    case "md":
    case "mdx":
      return { glyph: "MD", color: "#8a8a8a" };
    case "css":
      return { glyph: "#", color: "#7fd6ff" };
    case "scss":
      return { glyph: "#", color: "#ff8fa8" };
    case "html":
      return { glyph: "<>", color: "#ff9e64" };
    case "py":
      return { glyph: "PY", color: "#8be0a4" };
    case "rs":
      return { glyph: "RS", color: "#ff9e64" };
    case "go":
      return { glyph: "GO", color: "#7fd6ff" };
    case "sh":
    case "bash":
    case "zsh":
      return { glyph: "$", color: "#9ae66e" };
    case "yml":
    case "yaml":
      return { glyph: "Y", color: "#c9c9c9" };
    case "sql":
      return { glyph: "DB", color: "#e0af68" };
    case "svg":
    case "xml":
      return { glyph: "XML", color: "#c9c9c9" };
    default:
      return { glyph: "·", color: "#5c5c5c" };
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const s = Math.max(1, Math.round((Date.now() - d) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
