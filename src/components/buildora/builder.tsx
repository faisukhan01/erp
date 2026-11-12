"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Code2,
  Download,
  Eye,
  Layers,
  Loader2,
  MessageSquare,
  Monitor,
  RefreshCw,
  SendHorizontal,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";
import { toast } from "sonner";

/** Render **bold** + newlines from assistant messages. */
function RichText({ text }: { text: string }) {
  const parts = useMemo(
    () =>
      text.split("\n").map((line, li) => (
        <span key={li} className="block">
          {line.split(/(\*\*[^*]+\*\*)/g).map((seg, si) =>
            seg.startsWith("**") && seg.endsWith("**") ? (
              <strong key={si} className="text-zinc-100 font-semibold">
                {seg.slice(2, -2)}
              </strong>
            ) : (
              <span key={si}>{seg}</span>
            )
          )}
        </span>
      )),
    [text]
  );
  return <div className="leading-relaxed">{parts}</div>;
}

type Device = "desktop" | "mobile";

export default function Builder() {
  const {
    detail,
    detailLoading,
    generating,
    genStage,
    streamedCode,
    sendMessage,
    goDashboard,
    restore,
  } = useStore();

  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<Device>("desktop");
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  const [input, setInput] = useState("");
  const [iframeKey, setIframeKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const html = detail?.current_html || "";
  const isGenerating = generating;
  const stageLabel =
    genStage === "naming" ? "Naming your app…" : genStage === "building" ? "Building your app…" : "Connecting to Z.AI…";
  // while generating, the code panel is always front and center (derived, no effect needed)
  const activeTab = isGenerating ? ("code" as const) : tab;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [detail?.messages.length, isGenerating, streamedCode]);

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

  const send = () => {
    const content = input.trim();
    if (!content || isGenerating) return;
    setInput("");
    void sendMessage(content);
  };

  const sortedVersions = useMemo(
    () => [...(detail?.versions || [])].sort((a, b) => b.version_number - a.version_number),
    [detail?.versions]
  );

  if (detailLoading || (!detail && !detailLoading)) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
          <p className="text-sm text-zinc-500">Opening workspace…</p>
        </div>
      </div>
    );
  }

  const name = detail?.name || "Untitled";
  const version = sortedVersions[0]?.version_number || 0;

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
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-sm truncate max-w-[180px] sm:max-w-xs">{name}</h1>
            {version > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                <Check className="h-3 w-3" /> v{version} live
              </span>
            )}
          </div>
          {detail?.description && (
            <p className="text-[11px] text-zinc-500 truncate max-w-[220px] sm:max-w-md hidden sm:block">
              {detail.description}
            </p>
          )}
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
          <DropdownMenuContent align="end" className="border-white/10 bg-zinc-900 text-zinc-200 max-h-72 overflow-y-auto">
            <DropdownMenuLabel className="text-xs text-zinc-500">Version history</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            {sortedVersions.map((v) => (
              <DropdownMenuItem
                key={v.id}
                onClick={() => {
                  void restore(v.id).then(() => {
                    toast.success(`Restored to version ${v.version_number}`);
                    setIframeKey((k) => k + 1);
                  });
                }}
                className="gap-2 cursor-pointer focus:bg-white/10"
              >
                <span className="font-mono text-[10px] text-fuchsia-300">v{v.version_number}</span>
                <span className="text-xs truncate max-w-[220px]">{v.summary || `Version ${v.version_number}`}</span>
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
  const chatPanel = (
    <div className="flex flex-col h-full min-h-0 bg-zinc-950">
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4 buildora-scroll" role="log" aria-label="Chat with Buildora AI">
        {detail?.messages.length === 0 && (
          <div className="text-center py-10 px-4">
            <Sparkles className="h-6 w-6 text-fuchsia-400 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Your app is being built…</p>
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
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-fuchsia-500/90 to-fuchsia-600/90 text-white px-3.5 py-2.5 text-sm shadow-lg shadow-fuchsia-950/40">
                {m.content}
              </div>
            ) : (
              <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.04] px-3.5 py-2.5 text-sm text-zinc-300">
                <div className="flex items-center gap-1.5 mb-1 text-[10px] uppercase tracking-wider text-fuchsia-300/80 font-medium">
                  <Sparkles className="h-3 w-3" /> Buildora AI
                </div>
                <RichText text={m.content} />
              </div>
            )}
          </motion.div>
        ))}

        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-fuchsia-500/20 bg-fuchsia-500/[0.06] px-3.5 py-3 text-sm">
                <div className="flex items-center gap-2 text-fuchsia-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-xs font-medium">{stageLabel}</span>
                </div>
                {streamedCode && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {streamedCode.length.toLocaleString()} characters written
                    {activeTab === "code" && <span className="text-zinc-600">— watch it stream in the code panel →</span>}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-white/[0.06] p-3">
        <div className="relative rounded-xl border border-white/10 bg-white/[0.04] focus-within:border-fuchsia-500/50 transition-colors">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={version === 0 ? "Describe your first change…" : "Tell Buildora what to change… (Enter to send)"}
            disabled={isGenerating}
            className="min-h-[52px] max-h-32 border-0 bg-transparent px-3.5 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0 resize-none pr-12"
            aria-label="Message Buildora AI"
          />
          <Button
            onClick={send}
            disabled={!input.trim() || isGenerating}
            size="icon"
            className="absolute right-2.5 bottom-2.5 h-8 w-8 rounded-lg bg-gradient-to-r from-fuchsia-500 to-amber-400 text-zinc-950 hover:opacity-90 disabled:opacity-30"
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
            onClick={() => setTab("preview")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === "preview" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            aria-pressed={activeTab === "preview"}
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
          <button
            onClick={() => setTab("code")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === "code" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            aria-pressed={activeTab === "code"}
          >
            <Code2 className="h-3.5 w-3.5" /> Code
            {isGenerating && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {activeTab === "preview" && (
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
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIframeKey((k) => k + 1)}
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
                key={iframeKey}
                title={`${name} preview`}
                srcDoc={html}
                sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
                className={`h-full border-0 bg-white ${device === "mobile" ? "w-[390px] max-w-full rounded-xl border border-white/10 shadow-2xl" : "w-full"}`}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <motion.div
                animate={isGenerating ? { rotate: 360 } : {}}
                transition={isGenerating ? { repeat: Infinity, duration: 2.4, ease: "linear" } : {}}
                className="h-14 w-14 rounded-2xl bg-gradient-to-br from-fuchsia-500/30 to-amber-400/20 border border-white/10 flex items-center justify-center mb-4"
              >
                <Sparkles className="h-6 w-6 text-fuchsia-300" />
              </motion.div>
              <p className="text-sm font-medium text-zinc-300">
                {isGenerating ? stageLabel : "No preview yet"}
              </p>
              <p className="mt-1 text-xs text-zinc-600 max-w-xs">
                {isGenerating
                  ? `Z.AI is writing ${streamedCode.length.toLocaleString()} characters so far — the preview appears when the build completes.`
                  : "Send a message to Buildora and your app will materialize here."}
              </p>
            </div>
          )
        ) : (
          <div className="h-full overflow-auto buildora-scroll bg-[#0c0a09]">
            {streamedCode || html ? (
              <pre className="p-4 text-[11.5px] leading-[1.6] font-mono text-emerald-100/90 whitespace-pre-wrap break-words min-h-full">
                <code>{isGenerating ? streamedCode : html}</code>
              </pre>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-zinc-600">
                Code appears here as Z.AI writes it.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // -------------------------------------------------------------- layout
  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {topBar}

      {/* mobile tabs */}
      <div className="flex sm:hidden items-center gap-1 border-b border-white/[0.06] px-3 py-1.5">
        <button
          onClick={() => setMobileTab("chat")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${mobileTab === "chat" ? "bg-white/10 text-white" : "text-zinc-400"}`}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Chat
        </button>
        <button
          onClick={() => setMobileTab("preview")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${mobileTab === "preview" ? "bg-white/10 text-white" : "text-zinc-400"}`}
        >
          <Eye className="h-3.5 w-3.5" /> Preview
        </button>
        {isGenerating && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-fuchsia-300">
            <Loader2 className="h-3 w-3 animate-spin" /> {stageLabel}
          </span>
        )}
      </div>

      {/* desktop split */}
      <div className="hidden sm:grid flex-1 min-h-0 grid-cols-[minmax(340px,2fr)_3fr]">
        <div className="border-r border-white/[0.06] min-h-0">{chatPanel}</div>
        <div className="min-h-0">{previewPanel}</div>
      </div>

      {/* mobile stack */}
      <div className="sm:hidden flex-1 min-h-0">
        {mobileTab === "chat" ? chatPanel : previewPanel}
      </div>
    </div>
  );
}
