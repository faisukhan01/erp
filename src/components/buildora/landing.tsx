"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Check,
  Code2,
  Database,
  Download,
  GitBranch,
  Github,
  MessageSquareCode,
  Monitor,
  PenTool,
  Server,
  Smartphone,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const EXAMPLES = [
  "A kanban board with drag & drop and team avatars",
  "A personal finance dashboard with spending charts",
  "A pomodoro timer with stats and soundscapes",
  "A recipe manager with search, tags and shopping list",
  "A habit tracker with streaks and a weekly heatmap",
  "An invoice manager with printable PDF-style preview",
];

const ROTATING = [
  "a booking site for my barbershop…",
  "a crypto portfolio tracker with live charts…",
  "an AI flashcard app for exam prep…",
  "a team standup board with emoji reactions…",
  "a plant care reminder with a watering schedule…",
];

const FEATURES = [
  {
    icon: PenTool,
    title: "Blueprint before code",
    body: "Z.AI plans your app first — name, feature set, palette and vibe — then builds exactly that. You see the thinking, not a black box.",
    span: "lg:col-span-2",
    visual: "blueprint" as const,
  },
  {
    icon: Code2,
    title: "Watch it write itself",
    body: "Code streams token by token, live.",
    span: "",
    visual: "stream" as const,
  },
  {
    icon: MessageSquareCode,
    title: "Iterate by chatting",
    body: "“Make the header glassy.” “Add dark mode.” Every message intelligently rewrites the app while preserving what works.",
    span: "",
    visual: "chat" as const,
  },
  {
    icon: GitBranch,
    title: "Version time machine",
    body: "Every build is snapshotted to cloud PostgreSQL. Roll back to any version with one click — nothing is ever lost.",
    span: "",
    visual: "versions" as const,
  },
  {
    icon: Monitor,
    title: "Preview on any device",
    body: "Desktop and mobile viewports, fullscreen mode and open-in-new-tab — your app rendered live, instantly.",
    span: "",
    visual: "devices" as const,
  },
  {
    icon: Download,
    title: "Own your code",
    body: "One click exports the complete single-file app — no lock-in, no watermarks, no subscription walls. It is 100% yours.",
    span: "lg:col-span-2",
    visual: "own" as const,
  },
];

const STACK = [
  { label: "Frontend", detail: "Next.js 16 · App Router · TypeScript" },
  { label: "Backend", detail: "FastAPI · Python 3.12 · SSE streaming" },
  { label: "Database", detail: "PostgreSQL · Neon serverless" },
  { label: "Intelligence", detail: "Z.AI GLM-4.6" },
  { label: "Delivery", detail: "Single-file export · versioned history" },
];

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

function SectionKicker({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[11px] tracking-[0.2em] text-cyan-400">{index}</span>
      <span className="h-px w-8 bg-white/15" />
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">{label}</span>
    </div>
  );
}

function RotatingPlaceholder() {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = ROTATING[index % ROTATING.length];
    let timer: ReturnType<typeof setTimeout>;
    if (!deleting && subIndex === current.length) {
      timer = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && subIndex === 0) {
      timer = setTimeout(() => {
        setDeleting(false);
        setIndex((i) => (i + 1) % ROTATING.length);
      }, 60);
    } else {
      timer = setTimeout(
        () => setSubIndex((s) => s + (deleting ? -1 : 1)),
        deleting ? 22 : 55
      );
    }
    return () => clearTimeout(timer);
  }, [subIndex, deleting, index]);

  const current = ROTATING[index % ROTATING.length];
  return (
    <span>
      {current.slice(0, subIndex)}
      <span className="animate-caret text-cyan-400">|</span>
    </span>
  );
}

/* ------------------------------------------------ visual cards (bento) */

function BlueprintVisual() {
  return (
    <div className="mt-5 space-y-2" aria-hidden>
      <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
        <PenTool className="h-3.5 w-3.5 text-zinc-400" />
        <span className="font-mono text-[11px] text-zinc-300">aurora-finance.html</span>
        <span className="ml-auto flex gap-1.5">
          <span className="h-3 w-3 rounded-full border border-white/20 bg-cyan-400/80" />
          <span className="h-3 w-3 rounded-full border border-white/15 bg-zinc-500" />
          <span className="h-3 w-3 rounded-full border border-white/15 bg-zinc-700" />
        </span>
      </div>
      {["Spending charts with animated counters", "Budget envelopes with progress rings", "CSV export & dark mode"].map(
        (f, i) => (
          <motion.div
            key={f}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 * i, duration: 0.4 }}
            className="flex items-center gap-2 text-xs text-zinc-400"
          >
            <Check className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
            {f}
          </motion.div>
        )
      )}
    </div>
  );
}

function StreamVisual() {
  const lines = [92, 70, 84, 55];
  return (
    <div className="mt-4 space-y-2 overflow-hidden rounded-lg border border-white/[0.08] bg-black/50 p-3" aria-hidden>
      {lines.map((w, i) => (
        <div key={i} className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
          <div className="absolute inset-y-0 left-0 rounded-full bg-white/[0.09]" style={{ width: `${w}%` }} />
          <div
            className="animate-stream-block absolute inset-y-0 w-1/4 rounded-full bg-cyan-400"
            style={{ animationDelay: `${i * 0.45}s` }}
          />
        </div>
      ))}
      <div className="pt-1 font-mono text-[10px] text-zinc-500">
        &lt;html&gt; <span className="animate-caret text-cyan-400">▍</span> streaming…
      </div>
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="mt-4 space-y-2" aria-hidden>
      <div className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-white px-3 py-1.5 text-[11px] font-medium text-black">
        make the cards glassy
      </div>
      <div className="w-fit max-w-[90%] rounded-xl rounded-bl-sm border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-zinc-300">
        Done — backdrop blur added to all 6 cards.
      </div>
    </div>
  );
}

function VersionsVisual() {
  return (
    <div className="mt-4 space-y-1.5" aria-hidden>
      {[
        { v: "v3", label: "Add dark mode", now: true },
        { v: "v2", label: "Add charts", now: false },
        { v: "v1", label: "First build", now: false },
      ].map((row) => (
        <div
          key={row.v}
          className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] ${
            row.now
              ? "border-cyan-400/25 bg-cyan-400/[0.06] text-cyan-300"
              : "border-white/[0.07] bg-white/[0.02] text-zinc-500"
          }`}
        >
          <span className="font-mono">{row.v}</span>
          <span className="truncate">{row.label}</span>
          {row.now && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider">
              <span className="h-1 w-1 rounded-full bg-cyan-400" /> live
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function DevicesVisual() {
  return (
    <div className="mt-4 flex items-end gap-3" aria-hidden>
      <div className="animate-float h-16 w-24 rounded-lg border border-white/[0.12] bg-white/[0.02] p-1.5">
        <div className="h-full w-full rounded-md border border-white/[0.07] bg-black/40 p-1">
          <div className="h-1 w-2/3 rounded-full bg-white/20" />
          <div className="mt-1 h-1 w-1/2 rounded-full bg-white/10" />
          <div className="mt-1.5 h-4 w-full rounded-sm bg-cyan-400/25" />
        </div>
      </div>
      <div className="animate-float h-20 w-11 rounded-lg border border-white/[0.12] bg-white/[0.02] p-1 [animation-delay:1.2s]">
        <div className="mx-auto h-0.5 w-4 rounded-full bg-white/20" />
        <div className="mt-1 h-1 w-full rounded-full bg-white/10" />
        <div className="mt-1 h-6 w-full rounded-sm bg-white/[0.08]" />
      </div>
    </div>
  );
}

function OwnVisual() {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2" aria-hidden>
      {["index.html", "0 dependencies", "yours forever"].map((chip, i) => (
        <span
          key={chip}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
            i === 0
              ? "border-cyan-400/25 text-cyan-300"
              : "border-white/10 bg-white/[0.02] text-zinc-400"
          }`}
        >
          {i === 0 ? <Check className="h-3 w-3" /> : <Check className="h-3 w-3 text-zinc-600" />}
          {chip}
        </span>
      ))}
    </div>
  );
}

const VISUALS = {
  blueprint: BlueprintVisual,
  stream: StreamVisual,
  chat: ChatVisual,
  versions: VersionsVisual,
  devices: DevicesVisual,
  own: OwnVisual,
};

/* ------------------------------------------------------------ landing */

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
  const composerRef = useRef<HTMLDivElement>(null);

  const submit = () => {
    const p = prompt.trim();
    if (p) onBuild(p);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-clip bg-[#050505] text-zinc-100">
      {/* ------------------------------------------------ static texture */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="bg-grid absolute inset-x-0 top-0 h-[640px] opacity-70 [mask-image:linear-gradient(to_bottom,black_20%,transparent)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
      </div>

      {/* ------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#050505]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span className="hidden rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 sm:inline-block">
              v2.0
            </span>
          </div>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
            {[
              { href: "#features", label: "Product" },
              { href: "#workflow", label: "Workflow" },
              { href: "#stack", label: "Stack" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500 transition-colors hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hidden h-9 text-zinc-400 hover:bg-white/[0.06] hover:text-white sm:inline-flex"
              onClick={() => window.open("https://github.com/faisukhan01/erp", "_blank", "noopener")}
              aria-label="Buildora on GitHub"
            >
              <Github className="mr-1.5 h-4 w-4" />
              GitHub
            </Button>
            <Button
              onClick={onDashboard}
              className="h-9 rounded-lg bg-white px-4 text-[13px] font-semibold text-black hover:bg-zinc-200"
            >
              {projectCount > 0 ? `My Projects · ${projectCount}` : "My Projects"}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ main */}
      <main className="relative z-10 flex-1">
        {/* hero */}
        <section className="relative mx-auto max-w-3xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.02] px-3.5 py-1.5"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400">
              Powered by Z.AI
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="mt-8 font-display text-[44px] font-extrabold leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl lg:text-[76px]"
          >
            Describe it.
            <br />
            Watch it ship<span className="text-cyan-400">.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="mx-auto mt-6 max-w-[560px] text-[15px] leading-relaxed text-zinc-400 sm:text-base"
          >
            Buildora turns one sentence into a working web app — then refines it through
            conversation. Blueprint, live code streaming, version history and device previews,
            all included.
          </motion.p>

          {/* composer */}
          <motion.div
            ref={composerRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-10 text-left"
          >
            <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] transition-colors duration-300 focus-within:border-cyan-400/40">
              <div className="flex items-center justify-between px-4 pt-4 sm:px-5">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                  Build anything
                </span>
                <span className="rounded-md border border-white/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-zinc-500">
                  GLM-4.6
                </span>
              </div>
              <div className="relative">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                  }}
                  placeholder=""
                  className="min-h-[92px] resize-none border-0 bg-transparent p-0 px-4 pt-3 text-[15px] text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0 sm:px-5"
                  aria-label="Describe the app you want to build"
                />
                {prompt === "" && (
                  <div
                    className="pointer-events-none absolute inset-x-0 top-3 px-4 text-[15px] text-zinc-600 sm:px-5"
                    aria-hidden
                  >
                    <RotatingPlaceholder />
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 px-4 pb-4 sm:px-5">
                <span className="hidden text-[11px] text-zinc-600 sm:block">
                  <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    ⌘
                  </kbd>
                  {" + "}
                  <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    ↵
                  </kbd>{" "}
                  to launch
                </span>
                <Button
                  onClick={submit}
                  disabled={!prompt.trim()}
                  className="ml-auto h-11 rounded-lg bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:opacity-30"
                >
                  Start building
                  <ArrowRight className="ml-2 h-4 w-4" />
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
                className="rounded-full border border-white/10 px-3.5 py-1.5 text-xs text-zinc-500 transition-colors hover:border-white/25 hover:text-zinc-100"
              >
                {ex}
              </button>
            ))}
          </motion.div>

          {/* stats strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mx-auto mt-14 grid max-w-lg grid-cols-3 divide-x divide-white/[0.08] border-y border-white/[0.08]"
          >
            {[
              { v: "12K+", l: "Apps shipped" },
              { v: "99.9%", l: "Uptime" },
              { v: "4.9/5", l: "Builder rating" },
            ].map((s) => (
              <div key={s.l} className="px-2 py-4">
                <div className="font-display text-xl font-bold tracking-tight text-white">{s.v}</div>
                <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-zinc-600">
                  {s.l}
                </div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* bento features */}
        <section id="features" className="border-t border-white/[0.07]" aria-label="Features">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <SectionKicker index="01" label="Capabilities" />
            <div className="mt-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <h2 className="max-w-xl font-display text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
                Everything Lovable does.{" "}
                <span className="text-zinc-500">Then some.</span>
              </h2>
              <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
                A complete builder platform — brain, blueprint, storage, preview and history
                included.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => {
                const Visual = VISUALS[f.visual];
                return (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                    className={`group relative rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5 transition-colors duration-300 hover:border-white/[0.18] sm:p-6 ${f.span}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] transition-colors duration-300 group-hover:border-white/20">
                        <f.icon className="h-[18px] w-[18px] text-zinc-300 transition-colors duration-300 group-hover:text-cyan-300" />
                      </div>
                      <span className="font-mono text-[10px] text-zinc-700">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-[17px] font-semibold tracking-tight text-zinc-100">
                      {f.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{f.body}</p>
                    <Visual />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* how it works */}
        <section id="workflow" className="border-t border-white/[0.07]" aria-label="How it works">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <SectionKicker index="02" label="Workflow" />
            <h2 className="mt-5 font-display text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
              Three steps to shipped.
            </h2>

            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-white/[0.08]">
              {[
                {
                  n: "01",
                  t: "Describe",
                  d: "Type your idea in one sentence. Add detail as you like — Buildora plans before it writes.",
                  icon: Zap,
                },
                {
                  n: "02",
                  t: "Watch",
                  d: "Z.AI drafts the blueprint, then streams every line of code into existence in real time.",
                  icon: BrainCircuit,
                },
                {
                  n: "03",
                  t: "Refine",
                  d: "Chat tweaks, version snapshots, device previews, one-click download. Ship it.",
                  icon: Smartphone,
                },
              ].map((s) => (
                <div key={s.n} className="md:px-8 md:first:pl-0 md:last:pr-0">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-4xl font-extrabold tracking-tight text-white">
                      {s.n}
                    </span>
                    <s.icon className="h-4 w-4 text-cyan-400" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">{s.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* stack */}
        <section id="stack" className="border-t border-white/[0.07]" aria-label="Tech stack">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <SectionKicker index="03" label="Stack" />
            <div className="mt-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <h2 className="max-w-xl font-display text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
                Serious engineering under the hood.
              </h2>
              <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-600">
                <Database className="h-3.5 w-3.5" />
                <Server className="h-3.5 w-3.5" />
                Postgres-backed, cloud-native
              </div>
            </div>

            <div className="mt-10 overflow-hidden rounded-xl border border-white/[0.08]">
              {STACK.map((row, i) => (
                <div
                  key={row.label}
                  className={`flex flex-col gap-1 px-5 py-4 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between ${
                    i > 0 ? "border-t border-white/[0.07]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-400/80">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-[15px] font-semibold text-zinc-100">
                      {row.label}
                    </span>
                  </div>
                  <span className="pl-8 font-mono text-xs text-zinc-500 sm:pl-0">
                    {row.detail}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-white/[0.07]">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-24">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-[-0.02em] text-white sm:text-5xl">
              Your app is one sentence away<span className="text-cyan-400">.</span>
            </h2>
            <p className="mt-4 text-sm text-zinc-500 sm:text-base">
              No setup. No config. Just describe and ship.
            </p>
            <Button
              onClick={() => {
                setPrompt("");
                composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                composerRef.current?.querySelector("textarea")?.focus();
              }}
              className="mt-8 h-12 rounded-lg bg-white px-8 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
            >
              Start building free
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------- sticky footer */}
      <footer className="mt-auto border-t border-white/[0.07] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <Wordmark />
          </div>
          <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">
            <span>Z.AI</span>
            <span>FastAPI</span>
            <span>PostgreSQL</span>
            <span>Next.js</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <a
              href="https://github.com/faisukhan01/erp"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-zinc-300"
              aria-label="GitHub repository"
            >
              <Github className="h-4 w-4" />
            </a>
            <span>© {new Date().getFullYear()} Buildora</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
