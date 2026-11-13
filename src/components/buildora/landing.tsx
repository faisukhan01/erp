"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { motion, useScroll, useSpring } from "framer-motion";
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

/* ------------------------------------------------------------------ */
/* Obsidian motion token — smooth, never bouncy                        */
/* ------------------------------------------------------------------ */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

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

const MARQUEE_ITEMS = [
  "Blueprint-first builds",
  "Token-level streaming",
  "Version time machine",
  "Live device previews",
  "Self-healing code",
  "Own your code forever",
  "Zero setup",
  "Cloud PostgreSQL",
];

const STATS = [
  { value: "10K+", label: "characters streamed per build" },
  { value: "4", label: "stages visible live" },
  { value: "∞", label: "versions snapshotted" },
  { value: "1", label: "sentence to ship" },
];

const STEPS = [
  {
    n: "01",
    t: "Describe",
    d: "Type your idea in one sentence. Add detail as you like.",
    icon: Sparkles,
  },
  {
    n: "02",
    t: "Watch",
    d: "Z.AI plans the blueprint, then streams your app into existence.",
    icon: Zap,
  },
  {
    n: "03",
    t: "Refine",
    d: "Chat tweaks, version snapshots, device previews, download.",
    icon: Smartphone,
  },
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

/* ------------------------------------------------------------------ */
/* Background grid layers (hero-wide + CTA band, masked radially)      */
/* ------------------------------------------------------------------ */
const HERO_GRID: CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px)",
  backgroundSize: "56px 56px",
  maskImage: "radial-gradient(ellipse 85% 65% at 50% 0%, black 35%, transparent 100%)",
  WebkitMaskImage: "radial-gradient(ellipse 85% 65% at 50% 0%, black 35%, transparent 100%)",
};

const CTA_GRID: CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px)",
  backgroundSize: "56px 56px",
  maskImage: "radial-gradient(ellipse 70% 90% at 50% 40%, black 25%, transparent 100%)",
  WebkitMaskImage: "radial-gradient(ellipse 70% 90% at 50% 40%, black 25%, transparent 100%)",
};

/* ------------------------------------------------------------------ */
/* Typewriter placeholder — logic unchanged                            */
/* ------------------------------------------------------------------ */
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
      <span className="animate-caret text-amber-400">|</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Feature visuals — kept, tuned to the black surfaces                 */
/* ------------------------------------------------------------------ */
function BlueprintVisual() {
  return (
    <div className="mt-5 space-y-2.5" aria-hidden>
      <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-black/50 px-3 py-2">
        <PenTool className="h-3.5 w-3.5 text-amber-300" />
        <span className="text-xs text-zinc-300 font-medium">Aurora Finance</span>
        <span className="ml-auto flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-zinc-300" />
          <span className="h-3 w-3 rounded-full bg-zinc-600" />
        </span>
      </div>
      {["Spending charts with animated counters", "Budget envelopes with progress rings", "CSV export & dark mode"].map(
        (f, i) => (
          <motion.div
            key={f}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 * i, duration: 0.4, ease: EASE }}
            className="flex items-center gap-2 text-xs text-zinc-400"
          >
            <Check className="h-3.5 w-3.5 shrink-0 text-amber-300" />
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
    <div className="mt-4 space-y-2 overflow-hidden rounded-lg border border-white/[0.07] bg-black/50 p-3" aria-hidden>
      {lines.map((w, i) => (
        <div key={i} className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className="animate-stream-line absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-amber-400/70 to-transparent"
            style={{ animationDelay: `${i * 0.45}s` }}
          />
          <div className="absolute inset-y-0 left-0 rounded-full bg-white/[0.07]" style={{ width: `${w}%` }} />
        </div>
      ))}
      <div className="pt-1 font-mono text-[10px] text-emerald-300/80">
        &lt;html&gt; <span className="animate-caret">▍</span> streaming…
      </div>
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="mt-4 space-y-2" aria-hidden>
      <div className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-amber-400 px-3 py-1.5 text-[11px] font-medium text-[#0c0a09]">
        make the cards glassy
      </div>
      <div className="w-fit max-w-[90%] rounded-xl rounded-bl-sm border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-[11px] text-zinc-300">
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
              ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
              : "border-white/[0.06] bg-black/40 text-zinc-500"
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
      <div className="animate-float h-16 w-24 rounded-lg border border-white/10 bg-white/[0.04] p-1.5">
        <div className="h-full w-full rounded-md bg-black/50 p-1">
          <div className="h-1 w-2/3 rounded-full bg-white/20" />
          <div className="mt-1 h-1 w-1/2 rounded-full bg-white/10" />
          <div className="mt-1.5 h-4 w-full rounded-sm bg-amber-400/25" />
        </div>
      </div>
      <div className="animate-float h-20 w-11 rounded-lg border border-white/10 bg-gradient-to-b from-white/10 to-transparent p-1 [animation-delay:1.2s]">
        <div className="mx-auto h-0.5 w-4 rounded-full bg-white/20" />
        <div className="mt-1 h-1 w-full rounded-full bg-white/10" />
        <div className="mt-1 h-6 w-full rounded-sm bg-amber-400/20" />
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
              ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
              : "border-white/[0.08] bg-white/[0.04] text-zinc-400"
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

/* ------------------------------------------------------------------ */
/* Landing                                                             */
/* ------------------------------------------------------------------ */
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
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  const submit = () => {
    const p = prompt.trim();
    if (p) onBuild(p);
  };

  const scrollToComposer = () => {
    setPrompt("");
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    composerRef.current?.querySelector("textarea")?.focus();
  };

  /* cursor-follow spotlight — write CSS vars directly, no re-renders */
  const handleHeroMouseMove = (event: ReactMouseEvent<HTMLElement>) => {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[#030303] text-zinc-100">
      {/* ------------------------------------------------ ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-amber-500/[0.07] blur-[160px]" />
        <div className="absolute -left-40 top-[55%] h-[380px] w-[380px] rounded-full bg-white/[0.025] blur-[140px]" />
        <div className="animate-grid-pan absolute inset-0 opacity-[0.09]" style={HERO_GRID} />
        <div className="noise-overlay absolute inset-0" />
      </div>

      {/* ---------------------------------------------------------------- nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#030303]/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-[#0c0a09] shadow-[0_0_24px_rgba(251,191,36,0.25)] ring-1 ring-amber-200/40">
              <Blocks className="h-4.5 w-4.5" strokeWidth={2.25} />
            </div>
            <span className="text-[17px] font-semibold tracking-tight text-zinc-50">Buildora</span>
            <span className="hidden rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/90 sm:inline-flex sm:items-center">
              Z.AI inside
            </span>
          </div>
          <Button
            variant="outline"
            onClick={onDashboard}
            className="h-11 rounded-xl border-white/10 bg-white/[0.04] px-4 text-zinc-200 hover:bg-white/[0.08] hover:text-white"
          >
            {projectCount > 0 ? `My Projects (${projectCount})` : "My Projects"}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        {/* scroll progress */}
        <motion.div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-amber-400/0 via-amber-400 to-amber-200/80"
          style={{ scaleX }}
        />
      </header>

      {/* ---------------------------------------------------------------- main */}
      <main className="relative z-10 flex-1">
        {/* hero */}
        <section
          ref={heroRef}
          onMouseMove={handleHeroMouseMove}
          className="relative mx-auto w-full max-w-3xl px-4 pb-12 pt-32 text-center sm:px-6 sm:pt-40"
        >
          <div className="spotlight pointer-events-none absolute inset-0" aria-hidden />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-xs text-zinc-300 backdrop-blur"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Powered by Z.AI — the brain behind every pixel
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: EASE, delay: 0.08 }}
            className="mt-8 text-[2.75rem] font-bold leading-[1.02] tracking-[-0.03em] text-zinc-50 sm:text-6xl lg:text-7xl xl:text-[84px]"
          >
            Describe it.
            <br />
            <span className="gold-text-animated">Watch it ship.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.16 }}
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg"
          >
            Buildora turns one sentence into a stunning, working web app — then refines it
            through conversation. Blueprint, live code streaming, version history and
            device previews included.
          </motion.p>

          {/* composer */}
          <motion.div
            ref={composerRef}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.24 }}
            className="relative mt-10 sm:mt-14"
          >
            <div className="conic-card rounded-2xl p-5 text-left shadow-[0_0_80px_-20px_rgba(251,191,36,0.25)] transition-shadow duration-500 focus-within:shadow-[0_0_90px_-16px_rgba(251,191,36,0.4)] sm:p-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/90">
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
                  className="min-h-[96px] resize-none border-0 bg-transparent p-0 pt-2 text-[15px] text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0 sm:min-h-[110px] sm:text-base"
                  aria-label="Describe the app you want to build"
                />
                {prompt === "" && (
                  <div
                    className="pointer-events-none absolute inset-x-0 top-2 text-[15px] text-zinc-500 sm:text-base"
                    aria-hidden
                  >
                    <RotatingPlaceholder />
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-center text-[11px] text-zinc-500 sm:text-left">
                  <kbd className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    ⌘
                  </kbd>
                  {" + "}
                  <kbd className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    ↵
                  </kbd>
                  <span className="ml-1.5">
                    to launch ·{" "}
                    {projectCount > 0
                      ? `${projectCount} project${projectCount === 1 ? "" : "s"} in workspace`
                      : "your first build is seconds away"}
                  </span>
                </p>
                <Button
                  onClick={submit}
                  disabled={!prompt.trim()}
                  className="group/btn relative h-11 w-full overflow-hidden rounded-xl bg-amber-400 text-[#0c0a09] font-semibold shadow-[0_10px_30px_-10px_rgba(251,191,36,0.5)] transition-all hover:bg-amber-300 active:scale-[0.99] disabled:opacity-40 sm:w-auto"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-[150%] bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 ease-out group-hover/btn:translate-x-[250%]"
                  />
                  <span className="relative">Start building</span>
                  <ArrowRight className="relative ml-1.5 h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* examples */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.4 }}
            className="mt-8 flex flex-wrap justify-center gap-2.5"
          >
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs text-zinc-400 transition-colors duration-300 hover:border-amber-400/40 hover:bg-amber-400/[0.07] hover:text-amber-100"
              >
                {ex}
              </button>
            ))}
          </motion.div>
        </section>

        {/* marquee band */}
        <section className="border-y border-white/[0.06] bg-white/[0.015] py-3.5" aria-label="Buildora highlights">
          <div className="relative overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#030303] to-transparent sm:w-28"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#030303] to-transparent sm:w-28"
            />
            <div className="marquee">
              {[0, 1].map((half) => (
                <div key={half} className="flex shrink-0 items-center" aria-hidden={half === 1}>
                  {MARQUEE_ITEMS.map((item) => (
                    <span key={item} className="flex items-center whitespace-nowrap">
                      <span aria-hidden className="mx-7 text-[9px] leading-none text-amber-400/50">
                        ◆
                      </span>
                      <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">{item}</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* stats band */}
        <section className="mx-auto w-full max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20" aria-label="Buildora in numbers">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, ease: EASE, delay: i * 0.07 }}
                className="flex flex-col items-center gap-2 text-center"
              >
                <dd className="gold-text order-1 text-2xl font-bold tabular-nums sm:text-3xl">{s.value}</dd>
                <dt className="order-2 text-xs text-zinc-500">{s.label}</dt>
              </motion.div>
            ))}
          </dl>
        </section>

        {/* bento features */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24" aria-label="Features">
          <div className="mb-12 text-center sm:mb-14">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
              Everything Lovable does. <span className="gold-text">Then some.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-500 sm:text-base">
              A complete builder platform — brain, blueprint, storage, preview and history included.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => {
              const Visual = VISUALS[f.visual];
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.55, ease: EASE, delay: (i % 3) * 0.08 }}
                  whileHover={{ y: -4 }}
                  className={`group hover-conic relative rounded-2xl bg-[#0a0a0c] p-6 ${f.span}`}
                >
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
                    <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-amber-400/[0.09] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
                  </div>
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300 transition-shadow duration-500 group-hover:shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-semibold text-zinc-100">{f.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{f.body}</p>
                    <Visual />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* how it works */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 sm:pb-24" aria-label="How it works">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent p-8 sm:p-12"
          >
            <h2 className="text-center text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
              Three steps to shipped
            </h2>
            <div className="relative mt-12 grid gap-12 sm:grid-cols-3 sm:gap-8">
              {/* animated dashed connector — sm+ only, masked by the step tiles */}
              <svg
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-[26px] hidden h-1 w-full sm:block"
              >
                <line
                  x1="15%"
                  y1="2"
                  x2="85%"
                  y2="2"
                  stroke="rgba(251,191,36,0.4)"
                  strokeWidth="1.5"
                  className="animate-dash-flow"
                />
              </svg>
              {STEPS.map((s) => (
                <div key={s.n} className="relative text-center sm:text-left">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0a0a0c] sm:mx-0">
                    <span className="gold-text text-xl font-bold tracking-tight">{s.n}</span>
                  </div>
                  <div className="mt-5 flex items-center justify-center gap-2 font-semibold text-zinc-100 sm:justify-start">
                    {s.t}
                    <s.icon className="h-4 w-4 text-zinc-600" />
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{s.d}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* CTA band */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65, ease: EASE }}
            className="conic-card relative rounded-3xl p-10 text-center sm:p-14"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden>
              <div className="absolute -top-28 left-1/2 h-64 w-[520px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[120px]" />
              <div className="absolute inset-0 opacity-[0.05]" style={CTA_GRID} />
              <div className="noise-overlay absolute inset-0" />
            </div>
            <h2 className="relative text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
              Your app is one sentence away.
            </h2>
            <p className="relative mt-3 text-sm text-zinc-400 sm:text-base">
              No setup. No config. Just describe and ship.
            </p>
            <Button
              onClick={scrollToComposer}
              className="group/btn relative mt-8 h-12 w-full overflow-hidden rounded-xl bg-amber-400 px-8 text-[#0c0a09] font-semibold shadow-[0_10px_30px_-10px_rgba(251,191,36,0.5)] transition-all hover:bg-amber-300 active:scale-[0.99] sm:w-auto"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-[150%] bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 ease-out group-hover/btn:translate-x-[250%]"
              />
              <Wand2 className="relative mr-1.5 h-4 w-4" />
              <span className="relative">Start building free</span>
            </Button>
          </motion.div>
        </section>
      </main>

      {/* sticky footer */}
      <footer className="relative z-10 mt-auto border-t border-white/[0.06] bg-[#030303]/80 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-center text-xs text-zinc-500 sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <div className="flex items-center gap-2">
            <Blocks className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-medium text-zinc-400">Buildora</span>
            <span className="text-zinc-600">— describe it, watch it ship.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span>Powered by Z.AI</span>
            <span className="hidden text-zinc-700 sm:inline">·</span>
            <span>Neon PostgreSQL</span>
            <span className="hidden text-zinc-700 sm:inline">·</span>
            <span>Next.js 16 · FastAPI</span>
          </div>
          <span>© {new Date().getFullYear()} Buildora</span>
        </div>
      </footer>
    </div>
  );
}
