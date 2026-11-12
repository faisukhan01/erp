"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-5"
        >
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-amber-400 p-[1.5px] animate-pulse">
              <div className="h-full w-full rounded-[14px] bg-zinc-950" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 animate-bounce [animation-delay:300ms]" />
            <span className="ml-2">Waking the machines…</span>
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
