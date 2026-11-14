"use client";

import { useCallback } from "react";
import {
  FolderOpen,
  GitBranch,
  Github,
  MonitorPlay,
  Play,
  Search,
  SquareTerminal,
} from "lucide-react";
import { toast } from "sonner";
import { useIde } from "@/lib/ide/store";
import { runForPath } from "@/lib/ide/bridge";
import { OnyxMark, OnyxWordmark } from "./onyx-mark";

function TrafficLights() {
  return (
    <div className="flex items-center gap-[7px] pr-3 select-none" aria-hidden="true">
      <span className="h-[11px] w-[11px] rounded-full bg-[#2a2a2a] border border-[#333]" />
      <span className="h-[11px] w-[11px] rounded-full bg-[#2a2a2a] border border-[#333]" />
      <span className="h-[11px] w-[11px] rounded-full bg-[#2a2a2a] border border-[#333]" />
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  children,
  active,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-[4px] transition-colors ${
        active ? "bg-[#161616] text-[#00e5ff]" : "text-[#8a8a8a] hover:bg-[#141414] hover:text-[#e5e5e5]"
      }`}
    >
      {children}
    </button>
  );
}

export function TitleBar() {
  const workspaceName = useIde((s) => s.workspaceName);
  const gitBranch = useIde((s) => s.gitBranch);
  const socketStatus = useIde((s) => s.socketStatus);
  const setPaletteOpen = useIde((s) => s.setPaletteOpen);
  const togglePanel = useIde((s) => s.togglePanel);
  const togglePreview = useIde((s) => s.togglePreview);
  const previewOpen = useIde((s) => s.previewOpen);
  const activePath = useIde((s) => s.activePath);

  const runActive = useCallback(() => {
    const path = useIde.getState().activePath;
    if (!path) {
      toast("No file open", { description: "Open a file to run it." });
      return;
    }
    runForPath(path);
    if (!useIde.getState().panelOpen) togglePanel();
  }, [togglePanel]);

  const statusColor =
    socketStatus === "online"
      ? "bg-[#00e5ff]"
      : socketStatus === "connecting"
        ? "bg-[#e0af68] anim-dot"
        : "bg-[#ff5d5d]";

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b bg-[#060606] px-3 select-none">
      <TrafficLights />

      <div className="flex items-center gap-2.5 pl-1">
        <OnyxMark size={17} />
        <OnyxWordmark />
        <span className="micro-label hidden sm:inline">v1.0</span>
      </div>

      <div className="mx-1 hidden h-4 w-px bg-[#1d1d1d] md:block" />

      <div className="hidden items-center gap-1.5 md:flex">
        <FolderOpen className="h-3.5 w-3.5 text-[#8a8a8a]" />
        <span className="font-mono text-[11px] text-[#b3b3b3]">{workspaceName}</span>
      </div>

      {/* command palette trigger — the machined search pill */}
      <div className="flex flex-1 justify-center px-2">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="group flex h-7 w-full max-w-[420px] items-center gap-2 rounded-[5px] border bg-[#0a0a0a] px-2.5 text-left transition-colors hover:border-[#2a2a2a]"
          aria-label="Open command palette"
        >
          <Search className="h-3.5 w-3.5 text-[#5c5c5c] transition-colors group-hover:text-[#00e5ff]" />
          <span className="font-mono text-[11px] text-[#00e5ff]">onyx://</span>
          <span className="hidden flex-1 truncate text-[12px] text-[#5c5c5c] sm:block">
            Search files and commands
          </span>
          <kbd className="ml-auto hidden rounded-[3px] border bg-[#101010] px-1.5 py-px font-mono text-[9px] text-[#8a8a8a] sm:block">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={runActive}
          title="Run active file"
          className="mr-1 flex h-7 items-center gap-1.5 rounded-[5px] border bg-[#0d0d0d] px-2.5 text-[11px] font-medium text-[#d4d4d4] transition-colors hover:border-[#00e5ff55] hover:text-white"
        >
          <Play className="h-3 w-3 fill-[#00e5ff] text-[#00e5ff]" />
          <span className="hidden lg:inline">Run</span>
        </button>

        <IconBtn
          title="Toggle live preview (⌘⇧V)"
          onClick={togglePreview}
          active={previewOpen}
        >
          <MonitorPlay className="h-4 w-4" />
        </IconBtn>

        <IconBtn title="Toggle terminal (Ctrl+`)" onClick={togglePanel}>
          <SquareTerminal className="h-4 w-4" />
        </IconBtn>

        <div className="mx-1 hidden h-4 w-px bg-[#1d1d1d] sm:block" />

        <div className="hidden h-7 items-center gap-1.5 rounded-[5px] border bg-[#0a0a0a] px-2 md:flex">
          <GitBranch className="h-3 w-3 text-[#8a8a8a]" />
          <span className="font-mono text-[10.5px] text-[#b3b3b3]">
            {gitBranch || "no repo"}
          </span>
        </div>

        <span
          title={socketStatus === "online" ? "ide-server online" : `ide-server ${socketStatus}`}
          className={`ml-1 h-[7px] w-[7px] rounded-full ${statusColor} ${socketStatus === "online" ? "anim-dot" : ""}`}
        />

        <a
          href="https://github.com/faisukhan01/erp"
          target="_blank"
          rel="noreferrer"
          title="GitHub repository"
          className="ml-1 flex h-7 w-7 items-center justify-center rounded-[4px] text-[#8a8a8a] transition-colors hover:bg-[#141414] hover:text-[#e5e5e5]"
        >
          <Github className="h-4 w-4" />
        </a>
      </div>
    </header>
  );
}
