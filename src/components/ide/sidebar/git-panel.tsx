"use client";

import { useCallback, useState } from "react";
import { GitBranch, GitCommitHorizontal, History, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/ide/api";
import { useIde } from "@/lib/ide/store";
import { relativeTime } from "@/lib/ide/langs";
import type { GitCommit } from "@/lib/ide/types";

const STATUS_COLOR: Record<string, string> = {
  M: "#e0af68",
  A: "#00e5ff",
  "?:": "#4a4a4a",
  D: "#ff5d5d",
  U: "#c9c9c9",
  R: "#c792ea",
};

function statusLabel(f: { x: string; y: string }): { letter: string; color: string } {
  if (f.x === "?" && f.y === "?") return { letter: "U", color: STATUS_COLOR.U };
  const letter = (f.x !== " " && f.x !== "?") ? f.x : f.y;
  return { letter, color: STATUS_COLOR[letter] ?? "#8a8a8a" };
}

export function GitPanel() {
  const gitRepo = useIde((s) => s.gitRepo);
  const gitBranch = useIde((s) => s.gitBranch);
  const gitFiles = useIde((s) => s.gitFiles);
  const loadGit = useIde((s) => s.loadGit);
  const loadTree = useIde((s) => s.loadTree);

  const [message, setMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [log, setLog] = useState<GitCommit[] | null>(null);
  const [showLog, setShowLog] = useState(false);

  const refresh = useCallback(() => {
    loadGit();
    if (showLog) {
      api.gitLog().then(setLog).catch(() => setLog([]));
    }
  }, [loadGit, showLog]);

  const init = async () => {
    try {
      await api.gitInit();
      await loadGit();
      toast("Git repository initialized");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "init failed");
    }
  };

  const commit = async () => {
    if (!message.trim()) {
      toast("Type a commit message first");
      return;
    }
    setCommitting(true);
    try {
      const out = await api.gitCommit(message.trim());
      setMessage("");
      toast(out.includes("Nothing to commit") ? "Working tree clean" : "Committed");
      refresh();
      await loadTree(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "commit failed");
    } finally {
      setCommitting(false);
    }
  };

  const toggleLog = async () => {
    const next = !showLog;
    setShowLog(next);
    if (next && log === null) {
      try {
        setLog(await api.gitLog());
      } catch {
        setLog([]);
      }
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-3">
        <span className="micro-label">Source Control</span>
        <button
          type="button"
          title="Refresh"
          onClick={refresh}
          className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#8a8a8a] hover:bg-[#141414] hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {!gitRepo ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <GitBranch className="h-6 w-6 text-[#3a3a3a]" />
          <p className="text-[11.5px] leading-relaxed text-[#8a8a8a]">
            The workspace is not a git repository yet.
          </p>
          <button
            type="button"
            onClick={init}
            className="rounded-[5px] border bg-[#0d0d0d] px-3 py-1.5 font-mono text-[11px] text-[#d4d4d4] transition-colors hover:border-[#00e5ff55] hover:text-white"
          >
            git init
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 border-b px-3 py-2">
            <GitBranch className="h-3.5 w-3.5 text-[#00e5ff]" />
            <span className="font-mono text-[11px] text-[#d4d4d4]">{gitBranch}</span>
            <span className="ml-auto font-mono text-[10px] text-[#5c5c5c]">
              {gitFiles.length} change{gitFiles.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {gitFiles.length === 0 ? (
              <p className="px-3 py-6 text-center font-mono text-[10.5px] text-[#5c5c5c]">
                Working tree clean.
              </p>
            ) : (
              gitFiles.map((f) => {
                const { letter, color } = statusLabel(f);
                return (
                  <div
                    key={f.path}
                    className="group flex items-center gap-2 px-3 py-[5px] transition-colors hover:bg-[#0e0e0e]"
                  >
                    <span className="w-3 shrink-0 text-center font-mono text-[10px] font-bold" style={{ color }}>
                      {letter}
                    </span>
                    <span className="truncate font-mono text-[11px] text-[#a3a3a3]" title={f.path}>
                      {f.path}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="shrink-0 border-t p-2.5">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
              }}
              placeholder={`Message (⌘Enter to commit on ${gitBranch})`}
              rows={2}
              className="w-full resize-none rounded-[5px] border bg-[#0a0a0a] px-2 py-1.5 font-mono text-[11px] text-[#ededed] outline-none transition-colors placeholder:text-[#4a4a4a] focus:border-[#00e5ff55]"
            />
            <div className="mt-1.5 flex gap-1.5">
              <button
                type="button"
                onClick={commit}
                disabled={committing}
                className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-[5px] border bg-[#0d0d0d] font-mono text-[11px] text-[#d4d4d4] transition-colors hover:border-[#00e5ff55] hover:text-white disabled:opacity-50"
              >
                <GitCommitHorizontal className="h-3.5 w-3.5 text-[#00e5ff]" />
                {committing ? "Committing…" : "Commit all"}
              </button>
              <button
                type="button"
                onClick={toggleLog}
                title="History"
                className={`flex h-7 w-8 items-center justify-center rounded-[5px] border transition-colors ${
                  showLog ? "border-[#00e5ff55] text-[#00e5ff]" : "text-[#8a8a8a] hover:text-white"
                }`}
              >
                <History className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {showLog && (
            <div className="max-h-[30%] shrink-0 overflow-y-auto border-t">
              {(log ?? []).map((c) => (
                <div key={c.hash} className="flex items-baseline gap-2 px-3 py-1.5">
                  <span className="shrink-0 font-mono text-[10px] text-[#00e5ff]">{c.hash}</span>
                  <span className="truncate text-[11px] text-[#a3a3a3]" title={c.message}>
                    {c.message}
                  </span>
                  <span className="ml-auto shrink-0 font-mono text-[9px] text-[#4a4a4a]">
                    {relativeTime(c.date)}
                  </span>
                </div>
              ))}
              {log?.length === 0 && (
                <p className="px-3 py-3 text-center font-mono text-[10px] text-[#5c5c5c]">
                  No commits yet.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
