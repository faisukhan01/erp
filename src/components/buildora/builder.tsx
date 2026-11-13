"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Brain,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCode2,
  Layers,
  Loader2,
  Maximize2,
  MessageSquare,
  Monitor,
  Palette,
  Pencil,
  RefreshCw,
  RotateCcw,
  SendHorizontal,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResizablePanel as Panel,
  ResizablePanelGroup as PanelGroup,
  ResizableHandle as PanelResizeHandle,
} from "@/components/ui/resizable";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { useStore } from "@/lib/store";
import { previewUrl } from "@/lib/api";
import type { Blueprint } from "@/lib/types";

const SUGGESTIONS = [
  "Add dark mode with a toggle",
  "Make it fully mobile responsive",
  "Add smooth entrance animations",
  "Improve the empty states",
  "Add keyboard shortcuts",
];

const STAGES = [
  { key: "connecting", label: "Connecting", icon: Sparkles },
  { key: "planning", label: "Planning", icon: Brain },
  { key: "building", label: "Writing code", icon: Code2 },
  { key: "reviewing", label: "Polishing", icon: Check },
] as const;

function stageIndex(stage: string): number {
  if (stage === "connecting") return 0;
  if (stage === "planning") return 1;
  if (stage === "building" || stage === "retrying" || stage === "saving") return 2;
  if (stage === "reviewing") return 3;
  return 0;
}

function WordmarkSmall() {
  return (
    <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.03]">
      <span className="h-[8px] w-[8px] rounded-[2px] bg-cyan-400" />
    </span>
  );
}

/** Render markdown from assistant messages with Buildora styling. */
function AssistantMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
        em: ({ children }) => <em className="text-zinc-300">{children}</em>,
        code: ({ children }) => (
          <code className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[12px] text-cyan-200">
            {children}
          </code>
        ),
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-cyan-300 underline underline-offset-2">
            {children}
          </a>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function BlueprintCard({ bp }: { bp: Blueprint }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mt-1 overflow-hidden rounded-xl border border-white/[0.09] bg-[#0a0a0a]"
      aria-label="Build blueprint"
    >
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-3.5 py-2.5">
        <Palette className="h-3.5 w-3.5 text-cyan-400" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
          Build blueprint
        </span>
        {bp.vibe && (
          <span className="ml-auto rounded-md border border-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
            {bp.vibe}
          </span>
        )}
      </div>
      <div className="space-y-3 px-3.5 py-3">
        <div>
          <div className="font-display text-sm font-semibold text-zinc-100">{bp.name || "Your app"}</div>
          {bp.tagline && <div className="mt-0.5 text-xs text-cyan-200/80">{bp.tagline}</div>}
          {bp.description && <div className="mt-1 text-xs text-zinc-400">{bp.description}</div>}
        </div>
        {bp.features.length > 0 && (
          <ul className="space-y-1.5">
            {bp.features.map((f, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="flex items-start gap-2 text-xs text-zinc-300"
              >
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-cyan-400" />
                {f}
              </motion.li>
            ))}
          </ul>
        )}
        {bp.palette.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Palette</span>
            {bp.palette.map((c, i) => (
              <span
                key={i}
                className="h-4 w-4 rounded-full border border-white/20"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function GenerationBubble() {
  const { genStage, streamedCode, genStartedAt } = useStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!genStartedAt) return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - genStartedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [genStartedAt]);

  const current = stageIndex(genStage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex justify-start"
    >
      <div className="w-full max-w-[92%] rounded-xl border border-white/[0.09] bg-[#0a0a0a] px-3.5 py-3">
        {/* stepper */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STAGES.map((s, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <div
                key={s.key}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  done
                    ? "border-white/15 bg-white/[0.05] text-zinc-300"
                    : active
                      ? "animate-pulse-ring border-cyan-400/40 bg-cyan-400/[0.08] text-cyan-300"
                      : "border-white/[0.07] bg-transparent text-zinc-600"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : <s.icon className={`h-3 w-3 ${active ? "animate-pulse" : ""}`} />}
                {s.label}
              </div>
            );
          })}
          <span className="ml-auto flex items-center gap-1 font-mono text-[10px] tabular-nums text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
            {elapsed}s
          </span>
        </div>

        {/* live code counter */}
        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-zinc-500">
          <span className="animate-blink inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />
          <span className="tabular-nums">{streamedCode.length.toLocaleString()}</span> characters
          written — Z.AI is typing
        </div>

        {/* progress — solid block, no gradient */}
        <div className="relative mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
          <div className="animate-stream-block absolute inset-y-0 w-1/4 rounded-full bg-cyan-400" />
        </div>
      </div>
    </motion.div>
  );
}

type Device = "desktop" | "mobile";

export default function Builder() {
  const {
    detail,
    detailLoading,
    generating,
    genStage,
    streamedCode,
    blueprint,
    lastGenFailed,
    rightTab,
    mobileTab,
    previewNonce,
    setRightTab,
    setMobileTab,
    reloadPreview,
    sendMessage,
    generate,
    goDashboard,
    restore,
    doRenameProject,
  } = useStore();

  const [device, setDevice] = useState<Device>("desktop");
  const [input, setInput] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const codeScrollRef = useRef<HTMLDivElement>(null);

  const html = detail?.current_html || "";
  const isGenerating = generating;
  const activeTab = isGenerating ? ("code" as const) : rightTab;

  // auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [detail?.messages.length, isGenerating, streamedCode]);

  // auto-scroll streaming code panel
  useEffect(() => {
    if (isGenerating && codeScrollRef.current) {
      codeScrollRef.current.scrollTop = codeScrollRef.current.scrollHeight;
    }
  }, [streamedCode, isGenerating]);

  const download = () => {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(detail?.name || "buildora-app").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("App downloaded — it's 100% yours.");
  };

  const copyCode = async () => {
    if (!html) return;
    try {
      await navigator.clipboard.writeText(html);
      toast.success("Code copied to clipboard");
    } catch {
      toast.error("Could not copy — your browser blocked clipboard access.");
    }
  };

  const send = () => {
    const content = input.trim();
    if (!content || isGenerating) return;
    setInput("");
    void sendMessage(content);
  };

  const startRename = () => {
    if (!detail) return;
    setRenameValue(detail.name);
    setRenaming(true);
  };

  const commitRename = async () => {
    setRenaming(false);
    if (detail && renameValue.trim() && renameValue.trim() !== detail.name) {
      try {
        await doRenameProject(detail.id, renameValue);
        toast.success("Project renamed");
      } catch {
        toast.error("Rename failed");
      }
    }
  };

  const sortedVersions = useMemo(
    () => [...(detail?.versions || [])].sort((a, b) => b.version_number - a.version_number),
    [detail?.versions]
  );

  const codeStats = useMemo(() => {
    if (!html && !streamedCode) return null;
    const code = isGenerating ? streamedCode : html;
    return {
      lines: code.split("\n").length,
      kb: (new Blob([code]).size / 1024).toFixed(1),
    };
  }, [html, streamedCode, isGenerating]);

  if (detailLoading || (!detail && !detailLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            Opening workspace
          </p>
        </div>
      </div>
    );
  }

  const name = detail?.name || "Untitled";
  const version =
    sortedVersions.find((v) => v.id === detail?.current_version_id)?.version_number ??
    sortedVersions[0]?.version_number ??
    0;

  // -------------------------------------------------------------- chrome
  const topBar = (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#050505]/90 px-3 py-2.5 backdrop-blur sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={goDashboard}
          className="h-8 w-8 shrink-0 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
          aria-label="Back to projects"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="hidden sm:block">
          <WordmarkSmall />
        </div>
        <div className="min-w-0">
          {renaming ? (
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") void commitRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              className="h-7 w-48 rounded-lg border-white/15 bg-white/[0.04] text-sm"
              aria-label="Project name"
            />
          ) : (
            <button
              onClick={startRename}
              className="group/name flex min-w-0 items-center gap-1.5"
              aria-label={`Rename ${name}`}
            >
              <h1 className="max-w-[160px] truncate text-sm font-semibold sm:max-w-xs group-hover/name:text-white">
                {name}
              </h1>
              <Pencil className="h-3 w-3 shrink-0 text-zinc-600 opacity-0 transition-opacity group-hover/name:opacity-100" />
            </button>
          )}
          <div className="flex items-center gap-2">
            {version > 0 && (
              <span className="hidden items-center gap-1.5 rounded-md border border-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400 sm:inline-flex">
                <span className="h-1 w-1 rounded-full bg-cyan-400" /> v{version} live
              </span>
            )}
            {isGenerating && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-400/25 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                <Loader2 className="h-3 w-3 animate-spin" />
                {genStage === "planning" ? "planning" : "building"}…
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-white/10 bg-transparent text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-white"
              disabled={sortedVersions.length === 0}
            >
              <Layers className="mr-1 h-3.5 w-3.5" />
              <span className="hidden sm:inline">History</span>
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="buildora-scroll max-h-80 w-72 overflow-y-auto border-white/10 bg-[#0a0a0a] text-zinc-200"
          >
            <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Version history
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.08]" />
            {sortedVersions.map((v) => (
              <DropdownMenuItem
                key={v.id}
                onClick={() => {
                  void restore(v.id).then(() => {
                    toast.success(`Restored to version ${v.version_number}`);
                    reloadPreview();
                  });
                }}
                className="save cursor-pointer items-start gap-2 py-2 focus:bg-white/[0.06]"
              >
                <span className="mt-0.5 shrink-0 font-mono text-[10px] text-cyan-300">v{v.version_number}</span>
                <div className="min-w-0">
                  <div className="max-w-[220px] truncate text-xs">{v.summary || `Version ${v.version_number}`}</div>
                  <div className="text-[10px] text-zinc-600">
                    {new Date(v.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="sm"
          onClick={download}
          disabled={!html}
          className="h-8 border-white/10 bg-transparent text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-white"
        >
          <Download className="mr-1 h-3.5 w-3.5" />
          <span className="hidden sm:inline">Download</span>
        </Button>
      </div>
    </div>
  );

  // -------------------------------------------------------------- chat panel
  const showSuggestions =
    !isGenerating && version > 0 && !lastGenFailed && detail?.messages.length ? detail.messages.length > 1 : false;

  const chatPanel = (
    <div className="flex h-full min-h-0 flex-col bg-[#050505]">
      <div
        className="buildora-scroll flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4"
        role="log"
        aria-label="Chat with Buildora AI"
      >
        {detail?.messages.length === 0 && (
          <div className="px-4 py-10 text-center">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]"
            >
              <Sparkles className="h-5 w-5 text-cyan-400" />
            </motion.div>
            <p className="font-display text-sm font-semibold text-zinc-200">Your app is being conceived…</p>
            <p className="mx-auto mt-1 max-w-[240px] text-xs text-zinc-600">
              Z.AI is planning the blueprint, then it will write every line in front of you.
            </p>
          </div>
        )}
        {detail?.messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-white px-3.5 py-2.5 text-sm font-medium text-black">
                {m.content}
              </div>
            ) : m.content.startsWith("Generation failed:") ? (
              <div className="max-w-[88%] rounded-xl rounded-bl-md border border-red-500/25 bg-red-500/[0.05] px-3.5 py-3 text-sm">
                <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-red-300/90">
                  <X className="h-3 w-3" /> Buildora AI
                </div>
                <div className="text-zinc-300">{m.content.replace("Generation failed: ", "")}</div>
                <Button
                  size="sm"
                  onClick={() => void generate()}
                  disabled={isGenerating}
                  className="mt-2.5 h-8 rounded-lg bg-red-500/90 text-xs text-white hover:bg-red-500"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Retry build
                </Button>
              </div>
            ) : (
              <div className="max-w-[88%] rounded-xl rounded-bl-md border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-zinc-300">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-cyan-300/80">
                  <Sparkles className="h-3 w-3" /> Buildora AI
                </div>
                <AssistantMarkdown text={m.content} />
              </div>
            )}
          </motion.div>
        ))}

        {/* blueprint card while building */}
        <AnimatePresence>
          {isGenerating && blueprint && <BlueprintCard key="bp" bp={blueprint} />}
        </AnimatePresence>

        <AnimatePresence>{isGenerating && <GenerationBubble key="gen" />}</AnimatePresence>

        {/* follow-up suggestions */}
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-1.5 pt-1"
          >
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <button
                key={s}
                onClick={() => !isGenerating && void sendMessage(s)}
                disabled={isGenerating}
                className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-zinc-500 transition-colors hover:border-white/25 hover:text-zinc-100 disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-white/[0.07] p-3">
        <div className="relative rounded-xl border border-white/10 bg-white/[0.03] transition-colors focus-within:border-cyan-400/40">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={version === 0 ? "Your app is being built — follow along…" : "Tell Buildora what to change… (Enter to send)"}
            disabled={isGenerating}
            className="max-h-32 min-h-[52px] resize-none border-0 bg-transparent px-3.5 py-3 pr-12 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0"
            aria-label="Message Buildora AI"
          />
          <Button
            onClick={send}
            disabled={!input.trim() || isGenerating}
            size="icon"
            className="absolute bottom-2.5 right-2.5 h-8 w-8 rounded-lg bg-white text-black hover:bg-zinc-200 disabled:opacity-25"
            aria-label="Send message"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );

  // -------------------------------------------------------------- preview panel
  const previewPanel = (
    <div className="flex h-full min-h-0 flex-col bg-[#0a0a0a]">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-3 py-2">
        <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
          <button
            onClick={() => setRightTab("preview")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "preview" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"
            }`}
            aria-pressed={activeTab === "preview"}
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
          <button
            onClick={() => setRightTab("code")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "code" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200"
            }`}
            aria-pressed={activeTab === "code"}
          >
            <Code2 className="h-3.5 w-3.5" /> Code
            {isGenerating && <span className="animate-blink h-1.5 w-1.5 rounded-full bg-cyan-400" />}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {activeTab === "preview" && (
            <>
              <div className="mr-1 hidden items-center gap-0.5 rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5 sm:flex">
                <button
                  onClick={() => setDevice("desktop")}
                  className={`rounded-md p-1.5 transition-colors ${
                    device === "desktop" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                  aria-label="Desktop viewport"
                  aria-pressed={device === "desktop"}
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDevice("mobile")}
                  className={`rounded-md p-1.5 transition-colors ${
                    device === "mobile" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                  aria-label="Mobile viewport"
                  aria-pressed={device === "mobile"}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>
              {html && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFullscreen(true)}
                    className="h-8 w-8 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    aria-label="Fullscreen preview"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      window.open(previewUrl(detail!.id), "_blank", "noopener");
                      toast.success("Opened in a new tab");
                    }}
                    className="h-8 w-8 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    aria-label="Open preview in new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </>
          )}
          {activeTab === "code" && html && !isGenerating && (
            <Button
              variant="ghost"
              size="icon"
              onClick={copyCode}
              className="h-8 w-8 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              aria-label="Copy code"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={reloadPreview}
            className="h-8 w-8 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
            aria-label="Reload preview"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {activeTab === "preview" ? (
          html ? (
            <div className={`flex h-full w-full justify-center bg-[#050505] ${device === "mobile" ? "py-4" : ""}`}>
              <iframe
                key={previewNonce}
                title={`${name} preview`}
                srcDoc={html}
                sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
                className={`h-full border-0 bg-white ${
                  device === "mobile" ? "w-[390px] max-w-full rounded-xl border border-white/10" : "w-full"
                }`}
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <motion.div
                animate={isGenerating ? { rotate: 360 } : { y: [0, -5, 0] }}
                transition={
                  isGenerating
                    ? { repeat: Infinity, duration: 2.4, ease: "linear" }
                    : { repeat: Infinity, duration: 3.5, ease: "easeInOut" }
                }
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]"
              >
                <Sparkles className="h-5 w-5 text-cyan-400" />
              </motion.div>
              <p className="font-display text-sm font-semibold text-zinc-200">
                {isGenerating ? "Z.AI is writing your app…" : "No preview yet"}
              </p>
              <p className="mt-1 max-w-xs text-xs text-zinc-600">
                {isGenerating
                  ? `${streamedCode.length.toLocaleString()} characters so far — the preview appears the moment the build lands.`
                  : "Send a message to Buildora and your app will materialize here."}
              </p>
            </div>
          )
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-white/[0.06] bg-black/40 px-3 py-1.5 text-[11px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5 font-mono">
                <FileCode2 className="h-3.5 w-3.5 text-cyan-400" /> index.html
              </span>
              {codeStats && (
                <span className="tabular-nums">
                  {codeStats.lines.toLocaleString()} lines · {codeStats.kb} KB
                </span>
              )}
            </div>
            <div ref={codeScrollRef} className="buildora-scroll min-h-0 flex-1 overflow-auto">
              {streamedCode || html ? (
                isGenerating ? (
                  <pre className="min-h-full whitespace-pre-wrap break-words p-4 font-mono text-[11.5px] leading-[1.6] text-zinc-200">
                    <code>{streamedCode}</code>
                  </pre>
                ) : (
                  <SyntaxHighlighter
                    language="html"
                    style={oneDark}
                    showLineNumbers
                    wrapLongLines
                    customStyle={{
                      margin: 0,
                      background: "transparent",
                      fontSize: "11.5px",
                      lineHeight: 1.6,
                      minHeight: "100%",
                    }}
                    lineNumberStyle={{ color: "rgba(255,255,255,0.16)", minWidth: "2.2em" }}
                  >
                    {html}
                  </SyntaxHighlighter>
                )
              ) : (
                <div className="flex h-full items-center justify-center font-mono text-xs text-zinc-600">
                  Code appears here, live, as Z.AI writes it.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // -------------------------------------------------------------- layout
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#050505] text-zinc-100">
      {topBar}

      {/* mobile tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.07] px-3 py-1.5 sm:hidden">
        <button
          onClick={() => setMobileTab("chat")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
            mobileTab === "chat" ? "bg-white/10 text-white" : "text-zinc-500"
          }`}
          aria-pressed={mobileTab === "chat"}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Chat
        </button>
        <button
          onClick={() => setMobileTab("preview")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
            mobileTab === "preview" ? "bg-white/10 text-white" : "text-zinc-500"
          }`}
          aria-pressed={mobileTab === "preview"}
        >
          <Eye className="h-3.5 w-3.5" /> Preview
        </button>
        {isGenerating && (
          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] text-cyan-300">
            <Loader2 className="h-3 w-3 animate-spin" /> building…
          </span>
        )}
      </div>

      {/* desktop split — resizable */}
      <div className="hidden min-h-0 flex-1 sm:block">
        <PanelGroup direction="horizontal" autoSaveId="buildora-split">
          <Panel defaultSize={38} minSize={24} className="min-h-0">
            <div className="h-full min-h-0 border-r border-white/[0.07]">{chatPanel}</div>
          </Panel>
          <PanelResizeHandle className="w-1 bg-white/[0.04] hover:bg-cyan-400/20 data-[resize-handle-state=drag]:bg-cyan-400/40" />
          <Panel defaultSize={62} minSize={30} className="min-h-0">
            <div className="h-full min-h-0">{previewPanel}</div>
          </Panel>
        </PanelGroup>
      </div>

      {/* mobile stack */}
      <div className="min-h-0 flex-1 sm:hidden">{mobileTab === "chat" ? chatPanel : previewPanel}</div>

      {/* fullscreen preview */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="h-[95vh] max-w-[100vw] overflow-hidden border-white/10 bg-[#050505] p-0 sm:max-w-[95vw] sm:p-1 [&>button]:hidden">
          <DialogTitle className="sr-only">Fullscreen preview of {name}</DialogTitle>
          <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-2">
            <span className="truncate text-xs font-medium text-zinc-400">{name} — fullscreen preview</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={reloadPreview}
                className="h-7 w-7 text-zinc-400 hover:text-white"
                aria-label="Reload fullscreen preview"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFullscreen(false)}
                className="h-7 w-7 text-zinc-400 hover:text-white"
                aria-label="Exit fullscreen"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {html ? (
            <iframe
              key={`fs-${previewNonce}`}
              title={`${name} fullscreen preview`}
              srcDoc={html}
              sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
              className="h-[calc(95vh-41px)] w-full border-0 bg-white"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              Nothing to preview yet.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
