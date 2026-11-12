"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Blocks,
  Download,
  GitBranch,
  MessageSquareCode,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const EXAMPLES = [
  "A kanban board for my startup with drag & drop and team avatars",
  "A personal finance dashboard with spending charts and budgets",
  "A pomodoro timer with ambient soundscapes and session stats",
  "A recipe manager with search, tags and a shopping list builder",
  "A habit tracker with streaks and a weekly heatmap",
  "A CRUD invoice manager with PDF-style printable preview",
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "One prompt. A real app.",
    body: "Describe what you want in plain language. Buildora's Z.AI brain architects, designs and ships a fully working app — not a mockup.",
  },
  {
    icon: Zap,
    title: "Streaming live build",
    body: "Watch the code materialize in real time, then land on a polished, interactive preview the second generation finishes.",
  },
  {
    icon: MessageSquareCode,
    title: "Iterate by chatting",
    body: "“Make the header glassy.” “Add dark mode.” Every message rewrites your app intelligently while preserving what works.",
  },
  {
    icon: GitBranch,
    title: "Version time machine",
    body: "Every build is snapshotted to cloud PostgreSQL. Roll back to any version with one click — nothing is ever lost.",
  },
  {
    icon: Blocks,
    title: "Production-grade output",
    body: "Tailwind design systems, working state, localStorage persistence, responsive layouts and accessible markup — by default.",
  },
  {
    icon: Download,
    title: "Own your code",
    body: "One-click download of the complete single-file app. No lock-in, no subscription walls, no watermarks. It's yours.",
  },
];

export default function Landing({
  onBuild,
  onDashboard,
  projectCount,
}: {
  onBuild: (prompt: string) => void;
  onDashboard: () => void;
  projectCount: number;
}) {
  const [prompt, setPrompt] = useState("");

  const submit = () => {
    const p = prompt.trim();
    if (p) onBuild(p);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative overflow-x-clip">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[480px] w-[820px] rounded-full bg-fuchsia-600/20 blur-[140px]" />
        <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-80 w-96 rounded-full bg-fuchsia-500/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
          }}
        />
      </div>

      {/* nav */}
      <header className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-amber-400 p-[1.5px]">
            <div className="h-full w-full rounded-[10px] bg-zinc-950 flex items-center justify-center">
              <Blocks className="h-4 w-4 text-fuchsia-400" />
            </div>
          </div>
          <span className="text-lg font-semibold tracking-tight">Buildora</span>
          <span className="hidden sm:inline-flex items-center rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-medium text-fuchsia-300 uppercase tracking-wider">
            Z.AI inside
          </span>
        </div>
        <Button
          variant="outline"
          onClick={onDashboard}
          className="border-white/15 bg-white/5 hover:bg-white/10 hover:text-white text-zinc-200"
        >
          {projectCount > 0 ? `My Projects (${projectCount})` : "My Projects"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </header>

      {/* hero */}
      <main className="relative z-10 flex-1">
        <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-14 sm:pt-20 pb-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-zinc-300"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Powered by Z.AI — the brain behind every pixel
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="mt-6 text-4xl sm:text-6xl font-bold tracking-tight leading-[1.08]"
          >
            Describe it.
            <br />
            <span className="bg-gradient-to-r from-fuchsia-400 via-fuchsia-300 to-amber-300 bg-clip-text text-transparent">
              Watch it ship.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="mt-5 text-base sm:text-lg text-zinc-400 max-w-xl mx-auto"
          >
            Buildora turns a sentence into a stunning, working web app — then lets you
            refine it through conversation. Faster and sharper than Lovable. Simpler than Base44.
          </motion.p>

          {/* prompt composer */}
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-9 relative"
          >
            <div className="absolute -inset-[1.5px] rounded-2xl bg-gradient-to-r from-fuchsia-500/60 via-fuchsia-400/20 to-amber-400/60 blur-[6px] opacity-70" aria-hidden />
            <div className="relative rounded-2xl border border-white/10 bg-zinc-900/90 backdrop-blur p-4 text-left shadow-2xl shadow-fuchsia-950/30">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                }}
                placeholder="A booking site for my barbershop with a calendar, service menu and admin view…"
                className="min-h-[96px] border-0 bg-transparent p-0 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0 resize-none"
                aria-label="Describe the app you want to build"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[11px] text-zinc-500 hidden sm:block">
                  {projectCount > 0 ? `${projectCount} project${projectCount === 1 ? "" : "s"} in your workspace` : "Your first build is seconds away"}
                </span>
                <Button
                  onClick={submit}
                  disabled={!prompt.trim()}
                  className="group relative h-11 px-6 rounded-xl bg-gradient-to-r from-fuchsia-500 to-amber-400 text-zinc-950 font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  Start building
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* examples */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 flex flex-wrap justify-center gap-2"
          >
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/10 transition-colors"
              >
                {ex}
              </button>
            ))}
          </motion.div>
        </section>

        {/* features */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16" aria-label="Features">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Everything Lovable does.{" "}
              <span className="bg-gradient-to-r from-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
                Then some.
              </span>
            </h2>
            <p className="mt-2 text-sm text-zinc-500">A complete builder platform — brain, storage, preview and history included.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 hover:border-fuchsia-500/30 hover:bg-fuchsia-500/[0.05] transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-amber-400/10 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <f.icon className="h-5 w-5 text-fuchsia-300" />
                </div>
                <h3 className="font-semibold text-zinc-100">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* how it works */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 pb-20" aria-label="How it works">
          <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-8 sm:p-10">
            <h2 className="text-center text-xl sm:text-2xl font-semibold tracking-tight mb-8">Three steps to shipped</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { n: "01", t: "Describe", d: "Type your idea in one sentence. Add details as you like." },
                { n: "02", t: "Watch", d: "Z.AI architects and writes your app while you watch it stream." },
                { n: "03", t: "Refine", d: "Chat tweaks, version snapshots, download — your app, perfected." },
              ].map((s) => (
                <div key={s.n} className="text-center sm:text-left">
                  <div className="text-3xl font-bold bg-gradient-to-br from-fuchsia-400 to-amber-300 bg-clip-text text-transparent">{s.n}</div>
                  <div className="mt-1 font-semibold">{s.t}</div>
                  <div className="mt-1 text-sm text-zinc-400">{s.d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* sticky footer */}
      <footer className="relative z-10 mt-auto border-t border-white/[0.06] bg-zinc-950/80 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Blocks className="h-3.5 w-3.5 text-fuchsia-400" />
            <span className="font-medium text-zinc-400">Buildora</span>
            <span>— describe it, watch it ship.</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Powered by Z.AI</span>
            <span className="hidden sm:inline text-zinc-700">|</span>
            <span className="hidden sm:inline">Neon PostgreSQL</span>
            <span className="hidden sm:inline text-zinc-700">|</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
