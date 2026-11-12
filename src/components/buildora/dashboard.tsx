"use client";

import { motion } from "framer-motion";
import { Blocks, FolderOpen, Layers, Plus, Rocket, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProjectMeta } from "@/lib/types";

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
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative overflow-x-clip">
      {/* ambient */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-32 left-1/3 h-96 w-[640px] rounded-full bg-fuchsia-600/15 blur-[140px]" />
        <div className="absolute bottom-0 -right-24 h-72 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      {/* nav */}
      <header className="relative z-10 border-b border-white/[0.06] bg-zinc-950/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <button onClick={onNew} className="flex items-center gap-2.5 group" aria-label="Buildora home">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-amber-400 p-[1.5px]">
              <div className="h-full w-full rounded-[10px] bg-zinc-950 flex items-center justify-center">
                <Blocks className="h-4 w-4 text-fuchsia-400" />
              </div>
            </div>
            <span className="text-lg font-semibold tracking-tight">Buildora</span>
          </button>
          <Button
            onClick={onNew}
            className="h-10 rounded-xl bg-gradient-to-r from-fuchsia-500 to-amber-400 text-zinc-950 font-semibold hover:opacity-90"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New project
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 w-full">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Projects</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            {projects.length === 0
              ? "Nothing here yet — your first build is one sentence away."
              : `${projects.length} project${projects.length === 1 ? "" : "s"} — every version saved to cloud PostgreSQL.`}
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl border border-white/[0.06] bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] py-24 text-center">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-amber-400/10 border border-white/10 flex items-center justify-center mb-5">
              <Rocket className="h-6 w-6 text-fuchsia-300" />
            </div>
            <h2 className="text-lg font-semibold">Launch your first app</h2>
            <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
              Describe anything — a dashboard, a game, a store — and watch Buildora build it live.
            </p>
            <Button
              onClick={onNew}
              className="mt-6 h-11 px-6 rounded-xl bg-gradient-to-r from-fuchsia-500 to-amber-400 text-zinc-950 font-semibold hover:opacity-90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Start building
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-240px)] min-h-[320px]">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pb-6 pr-2 buildora-scroll">
              {projects.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.4) }}
                  className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:border-fuchsia-500/30 hover:bg-fuchsia-500/[0.04] transition-colors overflow-hidden"
                >
                  <button
                    onClick={() => onOpen(p.id)}
                    className="block w-full text-left p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 rounded-2xl"
                    aria-label={`Open project ${p.name}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500/25 to-amber-400/15 border border-white/10 flex items-center justify-center shrink-0">
                        <FolderOpen className="h-4.5 w-4.5 text-fuchsia-300" />
                      </div>
                      {p.version_count > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-400">
                          <Layers className="h-3 w-3" />
                          v{p.version_count}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 font-semibold text-zinc-100 truncate group-hover:text-white">{p.name}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500 line-clamp-2 min-h-[2rem]">
                      {p.description || p.initial_prompt}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-600">
                      <span>Updated {timeAgo(p.updated_at)}</span>
                      <span className="text-fuchsia-400/80 opacity-0 group-hover:opacity-100 transition-opacity">
                        Open workspace →
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(p.id);
                    }}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 h-7 w-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all focus-visible:opacity-100"
                    aria-label={`Delete project ${p.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </main>

      {/* sticky footer */}
      <footer className="relative z-10 mt-auto border-t border-white/[0.06] bg-zinc-950/80 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Blocks className="h-3.5 w-3.5 text-fuchsia-400" />
            <span className="font-medium text-zinc-400">Buildora</span>
          </div>
          <span>Powered by Z.AI · Neon PostgreSQL</span>
        </div>
      </footer>
    </div>
  );
}
