"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Blocks,
  Clock,
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
        className={`relative w-full overflow-hidden ${tall ? "aspect-[4/3]" : "aspect-square"} bg-[#0a0a0c]`}
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
      className={`relative w-full overflow-hidden bg-[#0a0a0c] ${tall ? "aspect-[4/3]" : "aspect-square"}`}
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
      <div className="absolute inset-0 bg-gradient-to-t from-[#030303]/60 via-transparent to-transparent" />
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
  const latestUpdatedAt =
    projects.length > 0
      ? projects.reduce((a, p) =>
          new Date(p.updated_at).getTime() > new Date(a.updated_at).getTime() ? p : a
        ).updated_at
      : null;

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col relative overflow-x-clip">
      {/* ambient — auroras, panning grid, film grain */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="animate-aurora-a absolute -top-32 left-1/4 h-96 w-[640px] rounded-full bg-amber-400/[0.06] blur-[140px]" />
        <div className="animate-aurora-b absolute bottom-0 -right-24 h-72 w-96 rounded-full bg-amber-400/[0.06] blur-[120px]" />
        <div
          className="animate-grid-pan absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.55) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 70% 55% at 50% 0%, black 20%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 55% at 50% 0%, black 20%, transparent 70%)",
          }}
        />
        <div className="noise-overlay absolute inset-0" />
      </div>

      {/* nav */}
      <header className="relative z-10 border-b border-white/[0.06] bg-[#030303]/70 backdrop-blur-xl sticky top-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <button onClick={onNew} className="flex items-center gap-2.5 group" aria-label="Buildora home">
            <div className="relative h-9 w-9">
              <div
                aria-hidden
                className="absolute -inset-1.5 rounded-xl bg-amber-400/20 blur-lg opacity-60 transition-opacity duration-300 group-hover:opacity-100"
              />
              <div className="relative h-9 w-9 rounded-xl bg-gradient-to-b from-amber-300/90 to-amber-500/90 p-[1.5px] shadow-[0_0_24px_rgba(251,191,36,0.22)]">
                <div className="h-full w-full rounded-[10px] bg-[#0a0a0c] flex items-center justify-center">
                  <Blocks className="h-4 w-4 text-amber-400" />
                </div>
              </div>
            </div>
            <span className="text-lg font-semibold tracking-tight">Buildora</span>
          </button>
          <Button
            onClick={onNew}
            className="h-10 rounded-xl bg-amber-400 text-[#0c0a09] font-semibold hover:bg-amber-300 shadow-lg shadow-black/30 transition-all duration-300 hover:shadow-[0_0_30px_-8px_rgba(251,191,36,0.5)]"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New project
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-10">
        {/* header + controls */}
        <div className="mb-8 flex animate-rise flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">My Projects</h1>
            <p className="mt-2 text-sm text-zinc-500">
              {projects.length === 0 ? (
                "Nothing here yet — your first build is one sentence away."
              ) : (
                <>
                  {projects.length} project{projects.length === 1 ? "" : "s"} ·{" "}
                  {totalVersions} version{totalVersions === 1 ? "" : "s"} ·{" "}
                  <span className="text-amber-300/80">saved to cloud PostgreSQL</span>
                </>
              )}
            </p>
          </div>
          {/* controls: search takes its own full-width row on mobile; sort + toggle share the next row */}
          {projects.length > 0 && (
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects…"
                  className="h-9 w-full rounded-xl border-white/[0.08] bg-white/[0.04] pl-8 text-sm placeholder:text-zinc-600"
                  aria-label="Search projects"
                />
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                <SelectTrigger
                  className="h-9 w-[130px] rounded-xl border-white/[0.08] bg-white/[0.04] text-sm"
                  aria-label="Sort projects"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/[0.08] bg-[#0c0c0f]">
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="name">Name A–Z</SelectItem>
                  <SelectItem value="versions">Most versions</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] p-0.5">
                <button
                  onClick={() => setLayout("grid")}
                  className={`rounded-lg p-1.5 transition-colors ${layout === "grid" ? "border border-amber-400/40 bg-amber-400/10 text-amber-300" : "text-zinc-500 hover:text-zinc-300"}`}
                  aria-label="Grid view"
                  aria-pressed={layout === "grid"}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setLayout("list")}
                  className={`rounded-lg p-1.5 transition-colors ${layout === "list" ? "border border-amber-400/40 bg-amber-400/10 text-amber-300" : "text-zinc-500 hover:text-zinc-300"}`}
                  aria-label="List view"
                  aria-pressed={layout === "list"}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* stats strip */}
        {projects.length > 0 && (
          <div
            className="mb-8 grid animate-rise grid-cols-3 divide-x divide-white/[0.06] rounded-2xl border border-white/[0.07] bg-white/[0.02]"
            style={{ animationDelay: "80ms" }}
          >
            <div className="flex items-center gap-3 px-3 py-3 sm:px-5 sm:py-3.5">
              <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-amber-400/[0.06] sm:flex">
                <Layers className="h-4 w-4 text-amber-300/80" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold tabular-nums leading-tight text-zinc-100 sm:text-lg">
                  {projects.length}
                </div>
                <div className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-zinc-500 sm:text-[11px]">
                  Projects
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-3 py-3 sm:px-5 sm:py-3.5">
              <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-amber-400/[0.06] sm:flex">
                <Rocket className="h-4 w-4 text-amber-300/80" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold tabular-nums leading-tight text-zinc-100 sm:text-lg">
                  {totalVersions}
                </div>
                <div className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-zinc-500 sm:text-[11px]">
                  Versions
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-3 py-3 sm:px-5 sm:py-3.5">
              <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-amber-400/[0.06] sm:flex">
                <Clock className="h-4 w-4 text-amber-300/80" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold tabular-nums leading-tight text-zinc-100 sm:text-lg">
                  {latestUpdatedAt ? timeAgo(latestUpdatedAt) : "—"}
                </div>
                <div className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-zinc-500 sm:text-[11px]">
                  <span className="sm:hidden">Activity</span>
                  <span className="hidden sm:inline">Latest activity</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-56 rounded-2xl border border-white/[0.06] skeleton-shimmer" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="relative flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/[0.1] bg-white/[0.02] px-6 py-20 text-center sm:py-24">
            <div className="relative mb-7">
              <div
                aria-hidden
                className="animate-glow-breathe absolute -inset-8 rounded-full bg-amber-400/15 blur-2xl"
              />
              <div className="animate-float-slow relative flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/[0.07]">
                <Rocket className="h-7 w-7 text-amber-300" />
              </div>
            </div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Launch your first app</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
              Describe anything — a dashboard, a game, a store — and watch Buildora build it live.
            </p>
            <Button
              onClick={onNew}
              className="mt-8 h-11 rounded-xl bg-amber-400 px-6 text-[#0c0a09] font-semibold hover:bg-amber-300 transition-all duration-300 hover:shadow-[0_0_30px_-8px_rgba(251,191,36,0.5)]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Start building
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/[0.1] bg-white/[0.02] py-16 text-center">
            <p className="text-sm text-zinc-500">
              No projects match <span className="text-zinc-300">“{query}”</span>.
            </p>
          </div>
        ) : layout === "grid" ? (
          <div className="grid gap-4 pb-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  opacity: { duration: 0.35, delay: Math.min(i * 0.05, 0.4) },
                  y: { duration: 0.3, ease: "easeOut" },
                }}
                whileHover={{ y: -4 }}
                className="group hover-conic relative rounded-2xl bg-[#0a0a0c] transition-shadow duration-300 hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.9)]"
              >
                <button
                  onClick={() => onOpen(p.id)}
                  className="block w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/30"
                  aria-label={`Open project ${p.name}`}
                >
                  <div className="overflow-hidden rounded-t-2xl">
                    <div className="transition-transform duration-500 ease-out group-hover:scale-[1.02]">
                      <Thumb project={p} tall />
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-semibold text-zinc-100 group-hover:text-white">{p.name}</h3>
                      {p.version_count > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-400">
                          <Layers className="h-3 w-3" />v{p.version_count}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-zinc-500">
                      {p.description || p.initial_prompt}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-600">
                      <span>Updated {timeAgo(p.updated_at)}</span>
                      <span className="inline-flex items-center gap-1 text-amber-400/80 opacity-0 transition-opacity group-hover:opacity-100">
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
                  className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-[#030303]/60 text-zinc-400 opacity-0 backdrop-blur transition-all hover:bg-red-500/20 hover:text-red-400 focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label={`Delete project ${p.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
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
                transition={{
                  opacity: { duration: 0.3, delay: Math.min(i * 0.04, 0.3) },
                  y: { duration: 0.25, ease: "easeOut" },
                }}
                className="group hover-conic relative flex items-center gap-4 rounded-2xl bg-[#0a0a0c] p-3 pr-4 transition-shadow duration-300 hover:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.9)]"
              >
                <button
                  onClick={() => onOpen(p.id)}
                  className="flex min-w-0 flex-1 items-center gap-4 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/30"
                  aria-label={`Open project ${p.name}`}
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/[0.06]">
                    <Thumb project={p} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-zinc-100 group-hover:text-white">{p.name}</h3>
                      {p.version_count > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-400">
                          <Layers className="h-3 w-3" />v{p.version_count}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {p.description || p.initial_prompt}
                    </p>
                  </div>
                  <span className="hidden shrink-0 text-[11px] text-zinc-600 sm:block">
                    {timeAgo(p.updated_at)}
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-hover:text-amber-400" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(p.id);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 focus-visible:opacity-100 group-hover:opacity-100"
                  aria-label={`Delete project ${p.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
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
      <footer className="relative z-10 mt-auto border-t border-white/[0.06] bg-[#030303]/70 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs text-zinc-500 sm:px-6">
          <div className="flex items-center gap-2">
            <Blocks className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-medium text-zinc-400">Buildora</span>
          </div>
          <span>
            Powered by Z.AI · Neon <span className="text-amber-300/80">PostgreSQL</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
