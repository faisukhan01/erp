"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  FolderOpen,
  Layers,
  LayoutGrid,
  List,
  Plus,
  Rocket,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectMeta } from "@/lib/types";
import { previewUrl } from "@/lib/api";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative flex h-[22px] w-[22px] items-center justify-center rounded-[6px] border border-white/15 bg-white/[0.03]">
        <span className="h-[7px] w-[7px] rounded-[2px] bg-cyan-400" />
      </span>
      <span className="font-display text-[17px] font-bold tracking-tight text-white">buildora</span>
    </span>
  );
}

function Thumb({ project, tall }: { project: ProjectMeta; tall?: boolean }) {
  if (!project.current_version_id) {
    return (
      <div
        className={`relative w-full overflow-hidden border-b border-white/[0.06] bg-[#0d0d0d] ${tall ? "aspect-[4/3]" : "aspect-square"}`}
        aria-hidden
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-700">
          <Rocket className="h-5 w-5" />
          <span className="font-mono text-[9px] uppercase tracking-[0.2em]">awaiting first build</span>
        </div>
      </div>
    );
  }
  return (
    <div
      className={`relative w-full overflow-hidden bg-[#0d0d0d] ${tall ? "aspect-[4/3]" : "aspect-square"}`}
      aria-hidden
    >
      <iframe
        src={previewUrl(project.id)}
        title={`${project.name} thumbnail`}
        loading="lazy"
        sandbox="allow-scripts"
        tabIndex={-1}
        className="pointer-events-none absolute left-0 top-0 h-[400%] w-[400%] origin-top-left scale-[0.25] border-0 bg-white"
      />
    </div>
  );
}

export default function Dashboard({
  projects,
  loading,
  onOpen,
  onNew,
  onDelete,
}: {
  projects: ProjectMeta[];
  loading: boolean;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "name" | "versions">("recent");
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  const visible = useMemo(() => {
    let list = [...projects];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          p.initial_prompt.toLowerCase().includes(q)
      );
    }
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "versions") list.sort((a, b) => b.version_count - a.version_count);
    else list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return list;
  }, [projects, query, sort]);

  const totalVersions = projects.reduce((acc, p) => acc + p.version_count, 0);

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-clip bg-[#050505] text-zinc-100">
      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#050505]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <button onClick={onNew} className="flex items-center gap-3" aria-label="Buildora home">
            <Wordmark />
            <span className="hidden rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 sm:inline-block">
              workspace
            </span>
          </button>
          <Button
            onClick={onNew}
            className="h-9 rounded-lg bg-white px-4 text-[13px] font-semibold text-black hover:bg-zinc-200"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New project
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {/* header + stats */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] tracking-[0.2em] text-cyan-400">00</span>
              <span className="h-px w-8 bg-white/15" />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                Workspace
              </span>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
              My Projects
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              {projects.length === 0
                ? "Nothing here yet — your first build is one sentence away."
                : `${projects.length} project${projects.length === 1 ? "" : "s"} · ${totalVersions} version${totalVersions === 1 ? "" : "s"} · saved to PostgreSQL`}
            </p>
          </div>
          {projects.length > 0 && (
            <div className="flex w-full flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects…"
                  className="h-9 w-full rounded-lg border-white/10 bg-white/[0.03] pl-8 text-sm placeholder:text-zinc-600 sm:w-56"
                  aria-label="Search projects"
                />
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                <SelectTrigger
                  className="h-9 w-[130px] rounded-lg border-white/10 bg-white/[0.03] text-sm"
                  aria-label="Sort projects"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#0a0a0a]">
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="name">Name A–Z</SelectItem>
                  <SelectItem value="versions">Most versions</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
                <button
                  onClick={() => setLayout("grid")}
                  className={`rounded-md p-1.5 transition-colors ${
                    layout === "grid" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                  aria-label="Grid view"
                  aria-pressed={layout === "grid"}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setLayout("list")}
                  className={`rounded-md p-1.5 transition-colors ${
                    layout === "list" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                  aria-label="List view"
                  aria-pressed={layout === "list"}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.12] bg-white/[0.01] py-24 text-center">
            <div className="animate-float mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
              <Rocket className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="font-display text-lg font-semibold tracking-tight">Launch your first app</h2>
            <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
              Describe anything — a dashboard, a game, a store — and watch Buildora build it live.
            </p>
            <Button
              onClick={onNew}
              className="mt-6 h-10 rounded-lg bg-white px-6 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              Start building
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.12] bg-white/[0.01] py-16 text-center text-sm text-zinc-500">
            No projects match “{query}”.
          </div>
        ) : layout === "grid" ? (
          <div className="grid gap-4 pb-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.4) }}
                className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a] transition-colors duration-300 hover:border-white/[0.18]"
              >
                <button
                  onClick={() => onOpen(p.id)}
                  className="block w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                  aria-label={`Open project ${p.name}`}
                >
                  <Thumb project={p} tall />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-display text-[15px] font-semibold text-zinc-100">
                        {p.name}
                      </h3>
                      {p.version_count > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                          <Layers className="h-3 w-3" />v{p.version_count}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-zinc-500">
                      {p.description || p.initial_prompt}
                    </p>
                    <div className="mt-3 flex items-center justify-between font-mono text-[10.5px] text-zinc-600">
                      <span>{timeAgo(p.updated_at)}</span>
                      <span className="inline-flex items-center gap-1 text-cyan-400/90 opacity-0 transition-opacity group-hover:opacity-100">
                        Open <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(p.id);
                  }}
                  className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-[#050505]/70 text-zinc-400 opacity-100 backdrop-blur transition-all hover:bg-red-500/15 hover:text-red-400 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Delete project ${p.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-3 pb-6">
            {visible.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
                className="group relative flex items-center gap-4 rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-3 pr-4 transition-colors duration-300 hover:border-white/[0.18]"
              >
                <button
                  onClick={() => onOpen(p.id)}
                  className="flex min-w-0 flex-1 items-center gap-4 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                  aria-label={`Open project ${p.name}`}
                >
                  <div className="w-16 shrink-0 overflow-hidden rounded-lg border border-white/[0.07]">
                    <Thumb project={p} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-display text-[15px] font-semibold text-zinc-100">{p.name}</h3>
                      {p.version_count > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                          <Layers className="h-3 w-3" />v{p.version_count}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {p.description || p.initial_prompt}
                    </p>
                  </div>
                  <span className="hidden shrink-0 font-mono text-[10.5px] text-zinc-600 sm:block">
                    {timeAgo(p.updated_at)}
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-hover:text-cyan-400" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(p.id);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 opacity-100 transition-all hover:bg-red-500/10 hover:text-red-400 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Delete project ${p.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* a11y helper */}
        {projects.length > 0 && visible.length > 0 && (
          <div className="sr-only">
            <FolderOpen /> project list
          </div>
        )}
      </main>

      {/* sticky footer */}
      <footer className="mt-auto border-t border-white/[0.07] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600 sm:px-6">
          <span className="inline-flex items-center gap-2.5">
            <span className="h-[6px] w-[6px] rounded-[2px] bg-cyan-400" />
            buildora
          </span>
          <span>Z.AI · FastAPI · PostgreSQL · Next.js</span>
        </div>
      </footer>
    </div>
  );
}
