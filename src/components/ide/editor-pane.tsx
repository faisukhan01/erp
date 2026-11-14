"use client";

import { useCallback } from "react";
import { ChevronRight, MonitorPlay, X } from "lucide-react";
import { toast } from "sonner";
import { useIde } from "@/lib/ide/store";
import { fileGlyph } from "@/lib/ide/langs";
import { OnyxMark, OnyxWordmark } from "./onyx-mark";
import { OnyxMonaco } from "./monaco-editor";

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#050505] px-6">
      <div className="anim-fade-up flex flex-col items-center">
        <OnyxMark size={56} className="opacity-90" />
        <div className="mt-6 flex items-baseline gap-2">
          <OnyxWordmark className="!text-[22px]" />
          <span className="font-mono text-[11px] text-[#5c5c5c]">1.0</span>
        </div>
        <p className="mt-2 max-w-xs text-center text-[12px] leading-relaxed text-[#5c5c5c]">
          A machined-black workspace with a real terminal, git bridge and an AI pair programmer.
        </p>
      </div>

      <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-1.5 sm:grid-cols-3">
        {[
          ["⌘K", "palette"],
          ["⌘P", "files"],
          ["⌘S", "save"],
          ["⌘B", "sidebar"],
          ["^`", "terminal"],
          ["⌘L", "onyx ai"],
        ].map(([key, label], i) => (
          <div
            key={key}
            className="anim-fade-up flex items-center gap-2 rounded-[5px] border bg-[#080808] px-2.5 py-2"
            style={{ animationDelay: `${0.15 + i * 0.05}s` }}
          >
            <kbd className="font-mono text-[10px] text-[#00e5ff]">{key}</kbd>
            <span className="micro-label">{label}</span>
          </div>
        ))}
      </div>

      <p className="mt-8 anim-fade micro-label" style={{ animationDelay: "0.5s" }}>
        open a file from the explorer — or ask onyx ai to do it
      </p>
    </div>
  );
}

export function EditorPane() {
  const tabs = useIde((s) => s.tabs);
  const activePath = useIde((s) => s.activePath);
  const setActive = useIde((s) => s.setActive);
  const closeTab = useIde((s) => s.closeTab);
  const saveActive = useIde((s) => s.saveActive);
  const previewOpen = useIde((s) => s.previewOpen);
  const togglePreview = useIde((s) => s.togglePreview);

  const close = useCallback(
    (path: string) => {
      closeTab(path);
    },
    [closeTab]
  );

  const save = useCallback(async () => {
    try {
      await saveActive();
      toast.success("Saved", { duration: 1200 });
      useIde.getState().loadGit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }, [saveActive]);

  const activeTab = tabs.find((t) => t.path === activePath);

  return (
    <section className="flex h-full min-w-0 flex-col bg-[#050505]" aria-label="Editor">
      {/* tab strip */}
      <div className="flex h-9 shrink-0 items-stretch border-b bg-[#060606]">
        <div className="flex flex-1 items-stretch overflow-x-auto">
          {tabs.map((tab) => {
            const g = fileGlyph(tab.name);
            const active = tab.path === activePath;
            return (
              <div
                key={tab.path}
                role="tab"
                aria-selected={active}
                tabIndex={0}
                onMouseDown={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    close(tab.path);
                  }
                }}
                onClick={() => setActive(tab.path)}
                onKeyDown={(e) => e.key === "Enter" && setActive(tab.path)}
                className={`group relative flex min-w-[110px] max-w-[190px] cursor-pointer items-center gap-1.5 border-r px-2.5 transition-colors ${
                  active
                    ? "bg-[#050505] text-[#f2f2f2]"
                    : "bg-[#060606] text-[#6a6a6a] hover:bg-[#0a0a0a] hover:text-[#a3a3a3]"
                }`}
              >
                {active && <span className="absolute inset-x-0 top-0 h-[2px] bg-[#00e5ff]" />}
                <span className="shrink-0 font-mono text-[9px] font-bold" style={{ color: g.color }}>
                  {g.glyph}
                </span>
                <span className="truncate font-mono text-[11.5px]">{tab.name}</span>
                {tab.dirty && (
                  <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-[#00e5ff]" aria-label="unsaved" />
                )}
                <button
                  type="button"
                  aria-label={`Close ${tab.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    close(tab.path);
                  }}
                  className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] text-[#5c5c5c] opacity-0 transition-all hover:bg-[#1a1a1a] hover:text-white group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
        {activeTab && (
          <button
            type="button"
            onClick={save}
            className="shrink-0 border-l px-3 font-mono text-[10px] text-[#8a8a8a] transition-colors hover:bg-[#0e0e0e] hover:text-[#00e5ff]"
            title="Save (⌘S)"
          >
            SAVE
          </button>
        )}
        <button
          type="button"
          onClick={togglePreview}
          title="Toggle live preview (⌘⇧V)"
          aria-pressed={previewOpen}
          className={`flex shrink-0 items-center gap-1.5 border-l px-3 font-mono text-[10px] transition-colors hover:bg-[#0e0e0e] ${
            previewOpen ? "text-[#00e5ff]" : "text-[#8a8a8a] hover:text-[#e5e5e5]"
          }`}
        >
          <MonitorPlay className="h-3 w-3" />
          PREVIEW
        </button>
      </div>

      {/* breadcrumb */}
      {activePath && (
        <div className="flex h-7 shrink-0 items-center gap-0.5 overflow-x-auto border-b bg-[#050505] px-3 font-mono text-[10px] text-[#5c5c5c]">
          {activePath.split("/").map((seg, i, arr) => (
            <span key={i} className="flex items-center gap-0.5">
              {i > 0 && <ChevronRight className="h-3 w-3 text-[#333]" />}
              <span className={i === arr.length - 1 ? "text-[#a3a3a3]" : ""}>{seg}</span>
            </span>
          ))}
        </div>
      )}

      {/* editor surface */}
      <div className="relative min-h-0 flex-1">
        {activePath ? <OnyxMonaco /> : <EmptyState />}
      </div>
    </section>
  );
}
