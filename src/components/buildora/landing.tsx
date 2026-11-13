"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Blocks,
  Check,
  Code2,
  Download,
  GitBranch,
  Globe,
  MessageSquareCode,
  Monitor,
  PenTool,
  Smartphone,
  Sparkles,
  Wand2,
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
    icon: Wand2,
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
      <span className="animate-caret text-rose-400">|</span>
    </span>
  );
}

function BlueprintVisual() {
  return (
    <div className="mt-5 space-y-2.5" aria-hidden>
      <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
        <PenTool className="h-3.5 w-3.5 text-rose-300" />
        <span className="text-xs text-zinc-300 font-medium">Aurora Finance</span>
        <span className="ml-auto flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-rose-400" />
          <span className="h-3 w-3 rounded-full bg-orange-300" />
          <span className="h-3 w-3 rounded-full bg-zinc-400" />
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
            <Check className="h-3.5 w-3.5 text-rose-400 shrink-0" />
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
    <div className="mt-4 space-y-2 overflow-hidden rounded-lg border border-white/[0.07] bg-black/40 p-3" aria-hidden>
      {lines.map((w, i) => (
        <div key={i} className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className="animate-stream-line absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-rose-400/70 to-transparent"
            style={{ animationDelay: `${i * 0.45}s` }}
          />
          <div className="absolute inset-y-0 left-0 rounded-full bg-white/[0.07]" style={{ width: `${w}%` }} />
        </div>
      ))}
      <div className="pt-1 font-mono text-[10px] text-rose-300/80">
        &lt;html&gt; <span className="animate-caret">▍</span> streaming…
      </div>
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="mt-4 space-y-2" aria-hidden>
      <div className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-gradient-to-br from-rose-500/90 to-orange-500/90 px-3 py-1.5 text-[11px] text-white">
        make the cards glassy
      </div>
      <div className="w-fit max-w-[90%] rounded-xl rounded-bl-sm border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-[11px] text-zinc-300">
        Done — backdrop blur added to all 6 cards ✦
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
              ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
              : "border-white/[0.06] bg-white/[0.02] text-zinc-500"
          }`}
        >
          <span className="font-mono">{row.v}</span>
          <span className="truncate">{row.label}</span>
          {row.now && <span className="ml-auto text-[9px] uppercase tracking-wider">live</span>}
        </div>
      ))}
    </div>
  );
}

function DevicesVisual() {
  return (
    <div className="mt-4 flex items-end gap-3" aria-hidden>
      <div className="animate-float h-16 w-24 rounded-lg border border-white/10 bg-gradient-to-br from-rose-500/20 to-orange-500/10 p-1.5">
        <div className="h-full w-full rounded-md bg-black/40 p-1">
          <div className="h-1 w-2/3 rounded-full bg-white/20" />
          <div className="mt-1 h-1 w-1/2 rounded-full bg-white/10" />
          <div className="mt-1.5 h-4 w-full rounded-sm bg-rose-500/20" />
        </div>
      </div>
      <div className="animate-float h-20 w-11 rounded-lg border border-white/10 bg-gradient-to-b from-white/10 to-transparent p-1 [animation-delay:1.2s]">
        <div className="mx-auto h-0.5 w-4 rounded-full bg-white/20" />
        <div className="mt-1 h-1 w-full rounded-full bg-white/10" />
        <div className="mt-1 h-6 w-full rounded-sm bg-orange-400/20" />
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
              ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
              : "border-white/10 bg-white/[0.04] text-zinc-400"
          }`}
        >
          {i === 0 ? <Globe className="h-3 w-3" /> : <Check className="h-3 w-3" />}
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
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 flex flex-col relative overflow-x-clip">
      {/* ------------------------------------------------ ambient background */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        {/* ember aurora — low, restrained */}
        <div className="animate-aurora-a absolute -top-48 left-[6%] h-[560px] w-[820px] rounded-full bg-rose-600/[0.14] blur-[150px]" />
        <div className="animate-aurora-b absolute top-[30%] -left-56 h-[480px] w-[480px] rounded-full bg-orange-600/[0.08] blur-[130px]" />
        <div className="animate-aurora-c absolute bottom-[-12%] right-[-6%] h-[460px] w-[560px] rounded-full bg-rose-500/[0.09] blur-[140px]" />
        {/* deep top glow — makes the black feel infinite */}
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_55%_100%_at_50%_0%,rgba(244,63,94,0.09),transparent_70%)]" />
        {/* engineering grid */}
        <div
          className="animate-grid-pan absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 85% 65% at 50% 0%, black 35%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 85% 65% at 50% 0%, black 35%, transparent 100%)",
          }}
        />
        {/* top hairline */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />
      </div>

      {/* ---------------------------------------------------------------- nav */}
      <header className="relative z-10 sticky top-0 border-b border-white/[0.06] bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 p-[1.5px] shadow-[0_0_28px_rgba(244,63,94,0.35)]">
              <div className="h-full w-full rounded-[10px] bg-zinc-950 flex items-center justify-center">
                <Blocks className="h-4 w-4 text-rose-400" />
              </div>
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">Buildora</span>
            <span className="hidden sm:inline-flex items-center rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-300 uppercase tracking-wider">
              Z.AI inside
            </span>
          </div>
          <Button
            variant="outline"
            onClick={onDashboard}
            className="border-white/12 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:text-white text-zinc-200 rounded-xl"
          >
            {projectCount > 0 ? `My Projects (${projectCount})` : "My Projects"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ---------------------------------------------------------------- main */}
      <main className="relative z-10 flex-1">
        {/* hero */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-14 sm:pt-24 pb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-zinc-300 backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
            </span>
            Powered by Z.AI — the brain behind every pixel
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="font-display mt-7 text-[42px] leading-[1.04] sm:text-6xl lg:text-[72px] font-bold tracking-tight"
          >
            Describe it.
            <br />
            <span className="animate-shimmer bg-[linear-gradient(110deg,#fb7185,45%,#fdba74,55%,#fb7185)] bg-clip-text text-transparent">
              Watch it ship.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="mt-6 text-base sm:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed"
          >
            Buildora turns one sentence into a stunning, working web app — then refines it
            through conversation. Blueprint, live code streaming, version history and
            device previews included.
          </motion.p>

          {/* composer */}
          <motion.div
            ref={composerRef}
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-10 relative group"
          >
            <div
              className="absolute -inset-[1.5px] rounded-3xl bg-gradient-to-r from-rose-500/50 via-orange-500/20 to-rose-500/50 opacity-50 blur-md group-focus-within:opacity-100 transition-opacity duration-500"
              aria-hidden
            />
            <div className="relative rounded-3xl border border-white/10 bg-[#0b0b0e]/90 backdrop-blur p-4 sm:p-5 text-left shadow-[0_24px_90px_-24px_rgba(244,63,94,0.3)]">
              <div className="flex items-center gap-2 text-[11px] text-rose-300/90 font-medium tracking-wide uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                Build anything
              </div>
              <div className="relative">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                  }}
                  placeholder=""
                  className="min-h-[92px] border-0 bg-transparent p-0 pt-2 text-[15px] text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0 resize-none"
                  aria-label="Describe the app you want to build"
                />
                {prompt === "" && (
                  <div className="pointer-events-none absolute inset-x-0 top-2 text-[15px] text-zinc-600" aria-hidden>
                    <RotatingPlaceholder />
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[11px] text-zinc-600 hidden sm:block">
                  <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">⌘</kbd>
                  {" + "}
                  <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">↵</kbd>
                  {" "}to launch · {projectCount > 0 ? `${projectCount} project${projectCount === 1 ? "" : "s"} in workspace` : "your first build is seconds away"}
                </span>
                <Button
                  onClick={submit}
                  disabled={!prompt.trim()}
                  className="group/btn relative h-11 px-6 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold transition-all hover:brightness-110 disabled:opacity-40 shadow-[0_10px_36px_-10px_rgba(244,63,94,0.6)] hover:shadow-[0_10px_44px_-8px_rgba(244,63,94,0.75)]"
                >
                  Start building
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* examples */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-7 flex flex-wrap justify-center gap-2"
          >
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-zinc-400 hover:text-rose-200 hover:border-rose-500/40 hover:bg-rose-500/10 transition-colors"
              >
                {ex}
              </button>
            ))}
          </motion.div>
        </section>

        {/* bento features */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14" aria-label="Features">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight">
              Everything Lovable does.{" "}
              <span className="bg-gradient-to-r from-rose-400 to-orange-300 bg-clip-text text-transparent">
                Then some.
              </span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-500 max-w-lg mx-auto">
              A complete builder platform — brain, blueprint, storage, preview and history included.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Visual = VISUALS[f.visual];
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                  className={`group relative rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6 hover:border-rose-500/25 hover:bg-rose-500/[0.04] transition-colors overflow-hidden ${f.span}`}
                >
                  <div
                    className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    aria-hidden
                  />
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/[0.08] border border-white/10 flex items-center justify-center group-hover:scale-105 group-hover:border-rose-500/30 transition-all">
                    <f.icon className="h-5 w-5 text-rose-300 group-hover:text-rose-200 transition-colors" />
                  </div>
                  <h3 className="mt-4 font-semibold text-zinc-100">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{f.body}</p>
                  <Visual />
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* how it works */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 pb-16" aria-label="How it works">
          <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-6 sm:p-10">
            <h2 className="font-display text-center text-xl sm:text-2xl font-semibold tracking-tight mb-9">
              Three steps to shipped
            </h2>
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                { n: "01", t: "Describe", d: "Type your idea in one sentence. Add detail as you like.", icon: Sparkles },
                { n: "02", t: "Watch", d: "Z.AI plans the blueprint, then streams your app into existence.", icon: Zap },
                { n: "03", t: "Refine", d: "Chat tweaks, version snapshots, device previews, download.", icon: Smartphone },
              ].map((s) => (
                <div key={s.n} className="text-center sm:text-left">
                  <div className="flex items-center gap-3 sm:justify-start justify-center">
                    <div className="font-display text-3xl font-bold text-gradient-ember">
                      {s.n}
                    </div>
                    <s.icon className="h-4 w-4 text-zinc-600" />
                  </div>
                  <div className="mt-2 font-semibold">{s.t}</div>
                  <div className="mt-1 text-sm text-zinc-400 leading-relaxed">{s.d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
          <div className="relative overflow-hidden rounded-3xl border border-rose-500/20 bg-gradient-to-br from-rose-950/30 via-[#0a0a0c] to-orange-950/20 p-8 sm:p-10 text-center">
            <div className="animate-aurora-a pointer-events-none absolute -top-20 left-1/4 h-64 w-96 rounded-full bg-rose-600/15 blur-[100px]" aria-hidden />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" aria-hidden />
            <h2 className="font-display relative text-2xl sm:text-3xl font-bold tracking-tight">
              Your app is one sentence away.
            </h2>
            <p className="relative mt-2 text-sm text-zinc-400">No setup. No config. Just describe and ship.</p>
            <Button
              onClick={() => {
                setPrompt("");
                composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                composerRef.current?.querySelector("textarea")?.focus();
              }}
              className="relative mt-7 h-12 px-8 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold transition-all hover:brightness-110 shadow-[0_10px_36px_-10px_rgba(244,63,94,0.6)] hover:shadow-[0_10px_44px_-8px_rgba(244,63,94,0.75)]"
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Start building free
            </Button>
          </div>
        </section>
      </main>

      {/* sticky footer */}
      <footer className="relative z-10 mt-auto border-t border-white/[0.06] bg-zinc-950/80 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Blocks className="h-3.5 w-3.5 text-rose-400" />
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
