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
  Wand2,
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
import type { Blueprint, ChatMessage } from "@/lib/types";

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

/** Render markdown from assistant messages with Buildora styling. */
function AssistantMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        strong: ({ children }) => <strong className="text-zinc-100 font-semibold">{children}</strong>,
        em: ({ children }) => <em className="text-zinc-300">{children}</em>,
        code: ({ children }) => (
          <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[12px] text-rose-200">
            {children}
          </code>
        ),
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-rose-300 underline underline-offset-2">
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
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="mt-1 overflow-hidden rounded-xl border border-rose-500/25 bg-gradient-to-br from-rose-500/[0.08] to-orange-500/[0.06]"
      aria-label="Build blueprint"
    >
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3.5 py-2.5">
        <Palette className="h-3.5 w-3.5 text-rose-300" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">
          Build blueprint
        </span>
        {bp.vibe && (
          <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-300">
            {bp.vibe}
          </span>
        )}
      </div>
      <div className="px-3.5 py-3 space-y-3">
        <div>
          <div className="text-sm font-semibold text-zinc-100">{bp.name || "Your app"}</div>
          {bp.tagline && <div className="text-xs text-rose-200/80 mt-0.5">{bp.tagline}</div>}
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
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-rose-400" />
                {f}
              </motion.li>
            ))}
          </ul>
        )}
        {bp.palette.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Palette</span>
            {bp.palette.map((c, i) => (
              <span
                key={i}
                className="h-4 w-4 rounded-full border border-white/20 shadow-inner"
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
      <div className="w-full max-w-[92%] rounded-2xl rounded-bl-md border border-rose-500/20 bg-rose-500/[0.05] px-3.5 py-3">
        {/* stepper */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STAGES.map((s, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <div
                key={s.key}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  done
                    ? "border-white/15 bg-white/[0.06] text-zinc-300"
                    : active
                      ? "animate-pulse-ring border-rose-500/40 bg-rose-500/15 text-rose-200"
                      : "border-white/[0.06] bg-white/[0.02] text-zinc-600"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : <s.icon className={`h-3 w-3 ${active ? "animate-pulse" : ""}`} />}
                {s.label}
              </div>
            );
          })}
          <span className="ml-auto flex items-center gap-1 text-[10px] text-zinc-500 tabular-nums">
            <Loader2 className="h-3 w-3 animate-spin text-rose-400" />
            {elapsed}s
          </span>
        </div>

        {/* live code counter */}
        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-zinc-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
          <span className="tabular-nums">{streamedCode.length.toLocaleString()}</span> characters written
          <span className="text-zinc-600">— Z.AI is typing…</span>
        </div>

        {/* mini progress shimmer */}
        <div className="relative mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.05]" aria-hidden>
          <div className="animate-stream-line absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-rose-400/80 to-transparent" />
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
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-rose-500/20 blur-xl animate-pulse" aria-hidden />
            <Loader2 className="h-8 w-8 animate-spin text-rose-400 relative" />
          </div>
          <p className="text-sm text-zinc-500">Opening workspace…</p>
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
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur px-3 sm:px-4 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={goDashboard}
          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10 shrink-0"
          aria-label="Back to projects"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-rose-500 via-rose-500 to-orange-500 p-[1.2px] shrink-0 hidden sm:block">
          <div className="h-full w-full rounded-[7px] bg-zinc-950 flex items-center justify-center">
            <Wand2 className="h-3.5 w-3.5 text-rose-400" />
          </div>
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
              className="h-7 w-48 rounded-lg border-rose-500/40 bg-white/5 text-sm"
              aria-label="Project name"
            />
          ) : (
            <button
              onClick={startRename}
              className="group/name flex items-center gap-1.5 min-w-0"
              aria-label={`Rename ${name}`}
            >
              <h1 className="font-semibold text-sm truncate max-w-[160px] sm:max-w-xs group-hover/name:text-white transition-colors">
                {name}
              </h1>
              <Pencil className="h-3 w-3 text-zinc-600 opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
          <div className="flex items-center gap-2">
            {version > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-300">
                <Check className="h-3 w-3" /> v{version} live
              </span>
            )}
            {isGenerating && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-300">
                <Loader2 className="h-3 w-3 animate-spin" />
                {genStage === "planning" ? "planning" : "building"}…
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-white/10 bg-white/5 hover:bg-white/10 text-xs text-zinc-300"
              disabled={sortedVersions.length === 0}
            >
              <Layers className="mr-1 h-3.5 w-3.5" />
              <span className="hidden sm:inline">History</span>
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-white/10 bg-[#0e0e11] text-zinc-200 max-h-80 overflow-y-auto buildora-scroll w-72">
            <DropdownMenuLabel className="text-xs text-zinc-500">Version history</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            {sortedVersions.map((v) => (
              <DropdownMenuItem
                key={v.id}
                onClick={() => {
                  void restore(v.id).then(() => {
                    toast.success(`Restored to version ${v.version_number}`);
                    reloadPreview();
                  });
                }}
                className="gap-2 cursor-pointer focus:bg-white/10 items-start py-2"
              >
                <span className="font-mono text-[10px] text-rose-300 mt-0.5 shrink-0">v{v.version_number}</span>
                <div className="min-w-0">
                  <div className="text-xs truncate max-w-[220px]">{v.summary || `Version ${v.version_number}`}</div>
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
          className="h-8 border-white/10 bg-white/5 hover:bg-white/10 text-xs text-zinc-300"
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
    <div className="flex flex-col h-full min-h-0 bg-zinc-950">
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4 buildora-scroll" role="log" aria-label="Chat with Buildora AI">
        {detail?.messages.length === 0 && (
          <div className="text-center py-10 px-4">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-500/25 to-orange-500/10 border border-white/10 flex items-center justify-center mb-4"
            >
              <Sparkles className="h-6 w-6 text-rose-300" />
            </motion.div>
            <p className="text-sm font-medium text-zinc-300">Your app is being conceived…</p>
            <p className="mt-1 text-xs text-zinc-600 max-w-[240px] mx-auto">
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
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-rose-500 to-orange-500 text-white px-3.5 py-2.5 text-sm shadow-lg shadow-rose-950/40">
                {m.content}
              </div>
            ) : m.content.startsWith("Generation failed:") ? (
              <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-red-500/25 bg-red-500/[0.06] px-3.5 py-3 text-sm">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-red-300/90 font-medium mb-1">
                  <X className="h-3 w-3" /> Buildora AI
                </div>
                <div className="text-zinc-300">{m.content.replace("Generation failed: ", "")}</div>
                <Button
                  size="sm"
                  onClick={() => void generate()}
                  disabled={isGenerating}
                  className="mt-2.5 h-8 rounded-lg bg-red-500/90 text-white hover:bg-red-500 text-xs"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Retry build
                </Button>
              </div>
            ) : (
              <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.04] px-3.5 py-2.5 text-sm text-zinc-300">
                <div className="flex items-center gap-1.5 mb-1 text-[10px] uppercase tracking-wider text-rose-300/80 font-medium">
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
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-100 hover:border-rose-500/40 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-white/[0.06] p-3">
        <div className="relative rounded-xl border border-white/10 bg-white/[0.04] focus-within:border-rose-500/50 transition-colors">
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
            className="min-h-[52px] max-h-32 border-0 bg-transparent px-3.5 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0 resize-none pr-12"
            aria-label="Message Buildora AI"
          />
          <Button
            onClick={send}
            disabled={!input.trim() || isGenerating}
            size="icon"
            className="absolute right-2.5 bottom-2.5 h-8 w-8 rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 text-white hover:opacity-90 disabled:opacity-30"
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
    <div className="flex flex-col h-full min-h-0 bg-zinc-900/40">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
        <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
          <button
            onClick={() => setRightTab("preview")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === "preview" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            aria-pressed={activeTab === "preview"}
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
          <button
            onClick={() => setRightTab("code")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === "code" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            aria-pressed={activeTab === "code"}
          >
            <Code2 className="h-3.5 w-3.5" /> Code
            {isGenerating && <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {activeTab === "preview" && (
            <>
              <div className="hidden sm:flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5 mr-1">
                <button
                  onClick={() => setDevice("desktop")}
                  className={`rounded-md p-1.5 transition-colors ${device === "desktop" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                  aria-label="Desktop viewport"
                  aria-pressed={device === "desktop"}
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDevice("mobile")}
                  className={`rounded-md p-1.5 transition-colors ${device === "mobile" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
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
                    className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
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
                    className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
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
              className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
              aria-label="Copy code"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={reloadPreview}
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
            aria-label="Reload preview"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {activeTab === "preview" ? (
          html ? (
            <div className={`h-full w-full flex justify-center bg-zinc-950/60 ${device === "mobile" ? "py-4" : ""}`}>
              <iframe
                key={previewNonce}
                title={`${name} preview`}
                srcDoc={html}
                sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
                className={`h-full border-0 bg-white ${device === "mobile" ? "w-[390px] max-w-full rounded-xl border border-white/10 shadow-2xl" : "w-full"}`}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <motion.div
                animate={isGenerating ? { rotate: 360 } : { y: [0, -6, 0] }}
                transition={
                  isGenerating
                    ? { repeat: Infinity, duration: 2.4, ease: "linear" }
                    : { repeat: Infinity, duration: 3.5, ease: "easeInOut" }
                }
                className="h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-500/30 to-orange-500/20 border border-white/10 flex items-center justify-center mb-4"
              >
                <Sparkles className="h-6 w-6 text-rose-300" />
              </motion.div>
              <p className="text-sm font-medium text-zinc-300">
                {isGenerating ? "Z.AI is writing your app…" : "No preview yet"}
              </p>
              <p className="mt-1 text-xs text-zinc-600 max-w-xs">
                {isGenerating
                  ? `${streamedCode.length.toLocaleString()} characters so far — the preview appears the moment the build lands.`
                  : "Send a message to Buildora and your app will materialize here."}
              </p>
            </div>
          )
        ) : (
          <div className="h-full flex flex-col min-h-0">
            <div className="flex items-center justify-between border-b border-white/[0.05] bg-black/30 px-3 py-1.5 text-[11px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5 font-mono">
                <FileCode2 className="h-3.5 w-3.5 text-rose-300" /> index.html
              </span>
              {codeStats && (
                <span className="tabular-nums">
                  {codeStats.lines.toLocaleString()} lines · {codeStats.kb} KB
                </span>
              )}
            </div>
            <div ref={codeScrollRef} className="flex-1 min-h-0 overflow-auto buildora-scroll">
              {streamedCode || html ? (
                isGenerating ? (
                  <pre className="p-4 text-[11.5px] leading-[1.6] font-mono text-zinc-200 whitespace-pre-wrap break-words min-h-full">
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
                    lineNumberStyle={{ color: "rgba(255,255,255,0.18)", minWidth: "2.2em" }}
                  >
                    {html}
                  </SyntaxHighlighter>
                )
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-zinc-600">
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
    <div className="h-dvh flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {topBar}

      {/* mobile tabs */}
      <div className="flex sm:hidden items-center gap-1 border-b border-white/[0.06] px-3 py-1.5">
        <button
          onClick={() => setMobileTab("chat")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${mobileTab === "chat" ? "bg-white/10 text-white" : "text-zinc-400"}`}
          aria-pressed={mobileTab === "chat"}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Chat
        </button>
        <button
          onClick={() => setMobileTab("preview")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${mobileTab === "preview" ? "bg-white/10 text-white" : "text-zinc-400"}`}
          aria-pressed={mobileTab === "preview"}
        >
          <Eye className="h-3.5 w-3.5" /> Preview
        </button>
        {isGenerating && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-rose-300">
            <Loader2 className="h-3 w-3 animate-spin" /> building…
          </span>
        )}
      </div>

      {/* desktop split — resizable */}
      <div className="hidden sm:block flex-1 min-h-0">
        <PanelGroup direction="horizontal" autoSaveId="buildora-split">
          <Panel defaultSize={38} minSize={24} className="min-h-0">
            <div className="h-full border-r border-white/[0.06] min-h-0">{chatPanel}</div>
          </Panel>
          <PanelResizeHandle className="w-1 bg-white/[0.03] hover:bg-rose-500/30 data-[resize-handle-state=drag]:bg-rose-500/50" />
          <Panel defaultSize={62} minSize={30} className="min-h-0">
            <div className="h-full min-h-0">{previewPanel}</div>
          </Panel>
        </PanelGroup>
      </div>

      {/* mobile stack */}
      <div className="sm:hidden flex-1 min-h-0">{mobileTab === "chat" ? chatPanel : previewPanel}</div>

      {/* fullscreen preview */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-[100vw] sm:max-w-[95vw] h-[95vh] p-0 sm:p-1 border-white/10 bg-zinc-950 overflow-hidden [&>button]:hidden">
          <DialogTitle className="sr-only">Fullscreen preview of {name}</DialogTitle>
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
            <span className="text-xs text-zinc-400 font-medium truncate">{name} — fullscreen preview</span>
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
              className="w-full h-[calc(95vh-41px)] border-0 bg-white"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-zinc-500">Nothing to preview yet.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
