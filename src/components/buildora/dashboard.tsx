"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Blocks,
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

function Thumb({ project, tall }: { project: ProjectMeta; tall?: boolean }) {
  if (!project.current_version_id) {
    return (
      <div
        className={`relative w-full overflow-hidden ${tall ? "aspect-[4/3]" : "aspect-square"} bg-gradient-to-br from-rose-950/40 via-[#0b0b0e] to-orange-950/20`}
        aria-hidden
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-600">
          <Rocket className="h-6 w-6" />
          <span className="text-[10px] uppercase tracking-widest">awaiting first build</span>
        </div>
      </div>
    );
  }
  return (
    <div
      className={`relative w-full overflow-hidden bg-zinc-900 ${tall ? "aspect-[4/3]" : "aspect-square"}`}
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
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent" />
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
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 flex flex-col relative overflow-x-clip">
      {/* ambient */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="animate-aurora-a absolute -top-32 left-1/4 h-96 w-[640px] rounded-full bg-rose-600/[0.12] blur-[140px]" />
        <div className="animate-aurora-b absolute bottom-0 -right-24 h-72 w-96 rounded-full bg-orange-500/[0.08] blur-[120px]" />
      </div>

      {/* nav */}
      <header className="relative z-10 border-b border-white/[0.06] bg-zinc-950/70 backdrop-blur sticky top-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <button onClick={onNew} className="flex items-center gap-2.5 group" aria-label="Buildora home">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 p-[1.5px] shadow-[0_0_28px_rgba(244,63,94,0.3)]">
              <div className="h-full w-full rounded-[10px] bg-zinc-950 flex items-center justify-center">
                <Blocks className="h-4 w-4 text-rose-400" />
              </div>
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">Buildora</span>
          </button>
          <Button
            onClick={onNew}
            className="h-10 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold hover:opacity-90 shadow-[0_10px_36px_-10px_rgba(244,63,94,0.55)]"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New project
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-10">
        {/* header + stats */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">My Projects</h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              {projects.length === 0
                ? "Nothing here yet — your first build is one sentence away."
                : `${projects.length} project${projects.length === 1 ? "" : "s"} · ${totalVersions} version${totalVersions === 1 ? "" : "s"} · saved to cloud PostgreSQL`}
            </p>
          </div>
          {projects.length > 0 && (
            <div className="flex w-full flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects…"
                  className="h-9 w-full sm:w-56 rounded-xl border-white/10 bg-white/[0.04] pl-8 text-sm placeholder:text-zinc-600"
                  aria-label="Search projects"
                />
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                <SelectTrigger
                  className="h-9 w-[130px] rounded-xl border-white/10 bg-white/[0.04] text-sm"
                  aria-label="Sort projects"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#0e0e11]">
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="name">Name A–Z</SelectItem>
                  <SelectItem value="versions">Most versions</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
                <button
                  onClick={() => setLayout("grid")}
                  className={`rounded-lg p-1.5 transition-colors ${layout === "grid" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                  aria-label="Grid view"
                  aria-pressed={layout === "grid"}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setLayout("list")}
                  className={`rounded-lg p-1.5 transition-colors ${layout === "list" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
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
              <div key={i} className="h-56 rounded-2xl border border-white/[0.06] bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-24 text-center">
            <div className="animate-float h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-500/20 to-orange-500/10 border border-white/10 flex items-center justify-center mb-5">
              <Rocket className="h-6 w-6 text-rose-300" />
            </div>
            <h2 className="text-lg font-semibold">Launch your first app</h2>
            <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
              Describe anything — a dashboard, a game, a store — and watch Buildora build it live.
            </p>
            <Button
              onClick={onNew}
              className="mt-6 h-11 px-6 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold hover:opacity-90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Start building
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center text-sm text-zinc-500">
            No projects match “{query}”.
          </div>
        ) : layout === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pb-6">
            {visible.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.4) }}
                className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:border-rose-500/25 transition-colors overflow-hidden"
              >
                <button
                  onClick={() => onOpen(p.id)}
                  className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 rounded-2xl"
                  aria-label={`Open project ${p.name}`}
                >
                  <Thumb project={p} tall />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-zinc-100 truncate group-hover:text-white">{p.name}</h3>
                      {p.version_count > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-400 shrink-0">
                          <Layers className="h-3 w-3" />v{p.version_count}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500 line-clamp-2 min-h-[2rem]">
                      {p.description || p.initial_prompt}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-600">
                      <span>Updated {timeAgo(p.updated_at)}</span>
                      <span className="inline-flex items-center gap-1 text-rose-400/80 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  className="absolute top-3 right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 bg-zinc-950/60 backdrop-blur hover:text-red-400 hover:bg-red-500/20 transition-all focus-visible:opacity-100"
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
                className="group relative flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:border-rose-500/25 transition-colors p-3 pr-4"
              >
                <button
                  onClick={() => onOpen(p.id)}
                  className="flex min-w-0 flex-1 items-center gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 rounded-2xl"
                  aria-label={`Open project ${p.name}`}
                >
                  <div className="w-16 shrink-0 rounded-xl overflow-hidden border border-white/[0.06]">
                    <Thumb project={p} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-100 truncate">{p.name}</h3>
                      {p.version_count > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-400">
                          <Layers className="h-3 w-3" />v{p.version_count}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500 truncate">
                      {p.description || p.initial_prompt}
                    </p>
                  </div>
                  <span className="hidden sm:block text-[11px] text-zinc-600 shrink-0">
                    {timeAgo(p.updated_at)}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-zinc-600 group-hover:text-rose-400 transition-colors shrink-0" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(p.id);
                  }}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 h-7 w-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all focus-visible:opacity-100"
                  aria-label={`Delete project ${p.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* hidden helper for a11y discoverability of empty folders */}
        {projects.length > 0 && visible.length > 0 && (
          <div className="sr-only">
            <FolderOpen /> project list
          </div>
        )}
      </main>

      {/* sticky footer */}
      <footer className="relative z-10 mt-auto border-t border-white/[0.06] bg-zinc-950/80 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Blocks className="h-3.5 w-3.5 text-rose-400" />
            <span className="font-medium text-zinc-400">Buildora</span>
          </div>
          <span>Powered by Z.AI · Neon PostgreSQL</span>
        </div>
      </footer>
    </div>
  );
}
