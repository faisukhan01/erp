"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, FileCode2, Sparkles, Square, SquarePen, X } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import * as api from "@/lib/ide/api";
import { useIde } from "@/lib/ide/store";
import { getSocket } from "@/lib/ide/socket";
import { fileGlyph } from "@/lib/ide/langs";
import type { ChatMessage } from "@/lib/ide/types";

let msgSeq = 0;
const nextMsgId = () => `m-${Date.now().toString(36)}-${++msgSeq}`;
let aiSeq = 0;
const nextAiId = () => `ai-${Date.now().toString(36)}-${++aiSeq}`;

/* ------------------------------------------------------------ code blocks */

function CodeBlock({ code, lang, path }: { code: string; lang: string; path?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const apply = async () => {
    if (!path) return;
    try {
      await api.writeFile(path, code);
      useIde.getState().applyExternal(path, code);
      await useIde.getState().loadTree(true);
      useIde.getState().loadGit();
      toast.success(`Applied to ${path}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Apply failed");
    }
  };

  return (
    <div className="my-2.5 overflow-hidden rounded-[6px] border bg-[#080808]">
      <div className="flex h-8 items-center gap-2 border-b bg-[#0b0b0b] px-2.5">
        <span className="font-mono text-[9.5px] uppercase tracking-widest text-[#6ee7ff]">{lang || "code"}</span>
        {path && <span className="truncate font-mono text-[10px] text-[#8a8a8a]">{path}</span>}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={copy}
            title="Copy"
            className="flex h-6 items-center gap-1 rounded-[4px] px-1.5 font-mono text-[9.5px] text-[#8a8a8a] hover:bg-[#161616] hover:text-white"
          >
            {copied ? <Check className="h-3 w-3 text-[#00e5ff]" /> : <Copy className="h-3 w-3" />}
          </button>
          {path && (
            <button
              type="button"
              onClick={apply}
              className="flex h-6 items-center gap-1 rounded-[4px] border border-[#00e5ff44] px-2 font-mono text-[9.5px] text-[#00e5ff] transition-colors hover:bg-[#00e5ff14]"
            >
              Apply
            </button>
          )}
        </div>
      </div>
      <pre className="max-h-[340px] overflow-auto p-3 font-mono text-[11.5px] leading-relaxed text-[#d4d4d4]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Markdown({ content }: { content: string }) {
  return (
    <div className="text-[12.5px] leading-relaxed text-[#c9c9c9]">
      <ReactMarkdown
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code({ node, className, children }) {
            // react-markdown v10 hands us HAST nodes — mdast fence meta
            // survives at node.data.meta
            const meta =
              (node as { data?: { meta?: string } } | undefined)?.data?.meta ?? "";
            const path = /path=([^\s]+)/.exec(meta)?.[1];
            const langMatch = /language-(\S+)/.exec(className ?? "");
            const text = String(children);
            const isBlock = Boolean(langMatch || path || text.includes("\n"));
            if (!isBlock) {
              return (
                <code className="rounded-[3px] border bg-[#101010] px-1 py-px font-mono text-[11px] text-[#6ee7ff]">
                  {text}
                </code>
              );
            }
            return (
              <CodeBlock
                code={text.replace(/\n$/, "")}
                lang={langMatch?.[1] ?? ""}
                path={path}
              />
            );
          },
          a({ children, href }) {
            return (
              <a href={href} target="_blank" rel="noreferrer" className="text-[#00e5ff] underline decoration-[#00e5ff44]">
                {children}
              </a>
            );
          },
          ul({ children }) {
            return <ul className="ml-4 list-disc space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="ml-4 list-decimal space-y-1">{children}</ol>;
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>;
          },
          h1({ children }) {
            return <h1 className="mb-2 text-[15px] font-semibold text-[#f2f2f2]">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="mb-2 text-[14px] font-semibold text-[#f2f2f2]">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="mb-1.5 text-[13px] font-semibold text-[#e5e5e5]">{children}</h3>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/* --------------------------------------------------------------- the chat */

const SUGGESTIONS = [
  "Explain this project structure",
  "Add JSDoc comments to src/utils.ts",
  "Write a memoized fibonacci and a test",
  "Review main.ts and suggest improvements",
];

export function AiChat() {
  const messages = useIde((s) => s.chatMessages);
  const busy = useIde((s) => s.chatBusy);
  const toggleChat = useIde((s) => s.toggleChat);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState("");
  const [attached, setAttached] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const tree = useIde((s) => s.tree);
  const activePath = useIde((s) => s.activePath);

  const flatFiles = useMemo(() => {
    const out: { path: string; name: string }[] = [];
    const walk = (nodes: NonNullable<typeof tree>, trail: string[]) => {
      for (const n of nodes) {
        if (n.type === "dir") {
          walk(n.children ?? [], [...trail, n.name]);
        } else {
          const p = [...trail, n.name].join("/");
          out.push({ path: p, name: n.name });
        }
      }
    };
    if (tree) walk(tree, []);
    return out;
  }, [tree]);

  const mentionResults = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return flatFiles.filter((f) => f.path.toLowerCase().includes(q)).slice(0, 7);
  }, [mentionQuery, flatFiles]);

  /* socket listeners — registered once, state read via store */
  useEffect(() => {
    const socket = getSocket();
    const onDelta = (p: { id: string; delta: string }) => {
      useIde.getState().appendChatDelta(p.id, p.delta);
    };
    const onDone = (p: { id: string }) => {
      useIde.getState().patchChat(p.id, { streaming: false });
      useIde.getState().setChatBusy(false);
    };
    const onError = (p: { id: string; error: string }) => {
      useIde.getState().patchChat(p.id, { streaming: false, error: true, content: `⚠ ${p.error}` });
      useIde.getState().setChatBusy(false);
    };
    socket.on("ai:delta", onDelta);
    socket.on("ai:done", onDone);
    socket.on("ai:error", onError);
    return () => {
      socket.off("ai:delta", onDelta);
      socket.off("ai:done", onDone);
      socket.off("ai:error", onError);
    };
  }, []);

  /* auto-scroll while streaming */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const pickMention = (path: string) => {
    if (!attached.includes(path) && attached.length < 6) {
      setAttached((a) => [...a, path]);
    }
    setMentionQuery(null);
    setInput((v) => v.replace(/@[^@\s]*$/, ""));
    inputRef.current?.focus();
  };

  const onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setInput(v);
    const m = /@[^@\s]*$/.exec(v);
    setMentionQuery(m ? m[0].slice(1) : null);
  };

  const send = useCallback(
    async (raw?: string) => {
      const st = useIde.getState();
      if (st.chatBusy) return;
      const text = (raw ?? input).trim();
      if (!text && attached.length === 0) return;

      // auto-attach workspace files referenced in the message ("add JSDoc to src/utils.ts")
      const wanted = new Set(attached);
      if (flatFiles.length > 0) {
        for (const f of flatFiles) {
          if ((text.includes(`/${f.path}`) || text.includes(f.path)) && wanted.size < 6) {
            wanted.add(f.path);
          }
        }
      }
      const finalFiles = [...wanted];

      const userMsg: ChatMessage = {
        id: nextMsgId(),
        role: "user",
        content: text || "(context only)",
        files: finalFiles,
        createdAt: Date.now(),
      };
      const aiId = nextAiId();
      const aiMsg: ChatMessage = {
        id: aiId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        streaming: true,
      };
      st.pushChat(userMsg);
      st.pushChat(aiMsg);
      st.setChatBusy(true);
      setInput("");
      setAttached([]);
      setMentionQuery(null);

      // gather file context
      const files: { path: string; content: string }[] = [];
      for (const p of userMsg.files ?? []) {
        try {
          const content = st.contents[p] ?? (await api.readFile(p));
          files.push({ path: p, content });
        } catch {
          /* unreadable — skip */
        }
      }
      const history = st.chatMessages
        .filter((m) => !m.error && m.content)
        .slice(-16)
        .map((m) => ({ role: m.role, content: m.content }));

      getSocket().emit("ai:send", {
        id: aiId,
        messages: [...history, { role: "user", content: userMsg.content }],
        files,
      });
    },
    [input, attached, flatFiles]
  );

  const stop = () => {
    // ignore further deltas for the streaming message
    const streaming = messages.find((m) => m.streaming);
    if (streaming) {
      useIde.getState().patchChat(streaming.id, { streaming: false, content: streaming.content + "\n\n(stopped)" });
    }
    useIde.getState().setChatBusy(false);
  };

  const attachActive = () => {
    if (activePath && !attached.includes(activePath) && attached.length < 6) {
      setAttached((a) => [...a, activePath]);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#050505]">
      {/* header */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b px-3">
        <Sparkles className="h-3.5 w-3.5 text-[#00e5ff]" />
        <span className="micro-label">Onyx AI</span>
        <span className="rounded-full border px-1.5 py-px font-mono text-[8.5px] uppercase tracking-wider text-[#5c5c5c]">
          z.ai
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            title="New chat"
            onClick={() => useIde.getState().clearChat()}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#8a8a8a] hover:bg-[#141414] hover:text-white"
          >
            <SquarePen className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Close"
            onClick={toggleChat}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#8a8a8a] hover:bg-[#141414] hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-3 py-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center pt-10 anim-fade">
              <Sparkles className="h-6 w-6 text-[#00e5ff]" />
              <p className="mt-4 text-[13px] font-medium text-[#d4d4d4]">Pair with Onyx AI</p>
              <p className="mt-1.5 max-w-[220px] text-center text-[11px] leading-relaxed text-[#5c5c5c]">
                Ask anything about your workspace. Type <span className="font-mono text-[#6ee7ff]">@</span> to
                attach files as context.
              </p>
              <div className="mt-5 w-full space-y-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="w-full rounded-[5px] border bg-[#080808] px-2.5 py-2 text-left text-[11.5px] text-[#a3a3a3] transition-colors hover:border-[#00e5ff44] hover:text-[#e5e5e5]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={m.role === "user" ? "anim-fade-up" : "anim-fade"}>
                  {m.role === "user" ? (
                    <div className="rounded-[6px] border border-[#1a1a1a] border-l-2 border-l-[#00e5ff] bg-[#0a0a0a] px-3 py-2">
                      {!!m.files?.length && (
                        <div className="mb-1.5 flex flex-wrap gap-1">
                          {m.files.map((f) => (
                            <span
                              key={f}
                              className="flex items-center gap-1 rounded-[3px] border bg-[#101010] px-1.5 py-px font-mono text-[9.5px] text-[#6ee7ff]"
                            >
                              <FileCode2 className="h-2.5 w-2.5" />
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap text-[12.5px] text-[#e5e5e5]">{m.content}</p>
                    </div>
                  ) : (
                    <div className="flex gap-2.5">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00e5ff]" />
                      <div className="min-w-0 flex-1">
                        {m.content ? (
                          <Markdown content={m.content} />
                        ) : m.streaming ? (
                          <span className="font-mono text-[11px] text-[#5c5c5c] anim-dot">thinking…</span>
                        ) : null}
                        {m.streaming && m.content && (
                          <span className="ml-0.5 inline-block h-3 w-[6px] translate-y-[2px] bg-[#00e5ff] anim-caret" />
                        )}
                        {m.error && <p className="font-mono text-[11px] text-[#ff5d5d]">{m.content}</p>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* composer */}
      <div className="shrink-0 border-t p-2.5">
        {attached.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {attached.map((f) => (
              <span
                key={f}
                className="flex items-center gap-1 rounded-[3px] border bg-[#101010] px-1.5 py-px font-mono text-[9.5px] text-[#6ee7ff]"
              >
                <FileCode2 className="h-2.5 w-2.5" />
                {f}
                <button
                  type="button"
                  aria-label={`Remove ${f}`}
                  onClick={() => setAttached((a) => a.filter((x) => x !== f))}
                  className="text-[#5c5c5c] hover:text-white"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative rounded-[6px] border bg-[#0a0a0a] transition-colors focus-within:border-[#00e5ff55]">
          {mentionQuery !== null && mentionResults.length > 0 && (
            <div className="absolute bottom-full left-0 z-10 mb-1.5 w-full overflow-hidden rounded-[6px] border bg-[#0b0b0b] shadow-xl">
              {mentionResults.map((f) => {
                const g = fileGlyph(f.name);
                return (
                  <button
                    key={f.path}
                    type="button"
                    onClick={() => pickMention(f.path)}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-[#141414]"
                  >
                    <span className="font-mono text-[9px] font-bold" style={{ color: g.color }}>
                      {g.glyph}
                    </span>
                    <span className="truncate font-mono text-[11px] text-[#d4d4d4]">{f.path}</span>
                  </button>
                );
              })}
            </div>
          )}

          <textarea
            ref={inputRef}
            value={input}
            onChange={onInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (mentionQuery !== null && mentionResults.length > 0) {
                  pickMention(mentionResults[0].path);
                } else {
                  send();
                }
              }
              if (e.key === "Escape") setMentionQuery(null);
            }}
            rows={2}
            placeholder={busy ? "Onyx is thinking…" : "Ask Onyx AI…  @ to attach files"}
            className="max-h-28 w-full resize-none bg-transparent px-2.5 py-2 text-[12.5px] text-[#e5e5e5] outline-none placeholder:text-[#4a4a4a]"
          />

          <div className="flex items-center justify-between px-2 pb-1.5">
            <button
              type="button"
              onClick={attachActive}
              disabled={!activePath}
              title="Attach the active file"
              className="font-mono text-[9.5px] text-[#5c5c5c] transition-colors hover:text-[#6ee7ff] disabled:opacity-30"
            >
              + attach active file
            </button>
            {busy ? (
              <button
                type="button"
                onClick={stop}
                className="flex h-6 items-center gap-1.5 rounded-[4px] border px-2 font-mono text-[9.5px] text-[#ff5d5d] hover:bg-[#141414]"
              >
                <Square className="h-2.5 w-2.5 fill-[#ff5d5d]" /> stop
              </button>
            ) : (
              <button
                type="button"
                onClick={() => send()}
                disabled={!input.trim() && attached.length === 0}
                className="flex h-6 items-center gap-1 rounded-[4px] border border-[#00e5ff44] px-2.5 font-mono text-[9.5px] text-[#00e5ff] transition-colors hover:bg-[#00e5ff14] disabled:border-[#222] disabled:text-[#4a4a4a]"
              >
                send ⏎
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
