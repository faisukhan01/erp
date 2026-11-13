"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Blocks } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Landing from "@/components/buildora/landing";
import Dashboard from "@/components/buildora/dashboard";
import Builder from "@/components/buildora/builder";
import { ensureBoot } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { ProjectMeta } from "@/lib/types";

export default function Home() {
  const { view, projects, projectsLoading, detail, detailLoading, setView, init, goDashboard, openProject, newProject, removeProject } =
    useStore();

  const [booted, setBooted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureBoot();
      await init();
      if (!cancelled) setBooted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [init]);

  const handleBuild = async (prompt: string) => {
    toast.loading("Buildora is warming up…", { id: "new-project" });
    try {
      await newProject(prompt);
      toast.dismiss("new-project");
    } catch (err) {
      toast.dismiss("new-project");
      toast.error(err instanceof Error ? err.message : "Could not create the project. Is the backend awake?");
    }
  };

  const handleOpen = async (id: string) => {
    await openProject(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeProject(deleteTarget.id);
      toast.success(`Deleted "${deleteTarget.name}"`);
    } catch {
      toast.error("Could not delete the project.");
    }
    setDeleteTarget(null);
  };

  if (!booted) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center relative overflow-hidden">
        {/* ambient */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.06] blur-[130px]" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 100%)",
            }}
          />
          <div className="noise-overlay absolute inset-0" />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-7 relative"
        >
          {/* orbiting logo */}
          <div className="relative h-24 w-24">
            <div className="animate-spin-slow absolute inset-0 rounded-full border border-dashed border-amber-400/25" aria-hidden />
            <div className="animate-spin-slower absolute inset-2.5 rounded-full border border-white/[0.06]" aria-hidden>
              <span className="absolute -top-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="animate-glow-breathe absolute -inset-4 rounded-full bg-amber-400/20 blur-xl" aria-hidden />
                <div className="animate-pulse-ring relative flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10">
                  <Blocks className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="gold-text-animated text-lg font-semibold tracking-tight">Buildora</p>
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-zinc-500">
              <span className="h-1 w-1 rounded-full bg-amber-400 animate-bounce [animation-delay:0ms]" />
              <span className="h-1 w-1 rounded-full bg-amber-400 animate-bounce [animation-delay:150ms]" />
              <span className="h-1 w-1 rounded-full bg-amber-400 animate-bounce [animation-delay:300ms]" />
              <span className="ml-1">Waking the machines…</span>
            </div>
          </div>

          {/* progress line */}
          <div className="relative h-[2px] w-44 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
            <div className="animate-stream-line absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {view === "landing" && (
        <Landing onBuild={handleBuild} onDashboard={goDashboard} projectCount={projects.length} />
      )}
      {view === "dashboard" && (
        <Dashboard
          projects={projects}
          loading={projectsLoading && projects.length === 0}
          onOpen={handleOpen}
          onNew={() => setView("landing")}
          onDelete={(id) => setDeleteTarget(projects.find((p) => p.id === id) || null)}
        />
      )}
      {(view === "builder" || detail || detailLoading) && <Builder />}
      <Toaster theme="dark" position="bottom-center" richColors closeButton />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-white/10 bg-zinc-900 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This permanently removes the project, its chat history and every saved version from
              the cloud database. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500/90 text-white hover:bg-red-500"
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
