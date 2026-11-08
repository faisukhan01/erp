"use client";

import { useIde } from "@/lib/ide/store";

export function StatusBar() {
  const gitBranch = useIde((s) => s.gitBranch);
  const gitFiles = useIde((s) => s.gitFiles);
  const activePath = useIde((s) => s.activePath);
  const tabs = useIde((s) => s.tabs);
  const cursor = useIde((s) => s.cursor);
  const settings = useIde((s) => s.settings);
  const socketStatus = useIde((s) => s.socketStatus);

  const activeTab = tabs.find((t) => t.path === activePath);
  const language = activePath ? activePath.split(".").pop()?.toUpperCase() ?? "PLAIN" : "—";

  return (
    <footer
      className="flex h-[26px] shrink-0 items-center justify-between border-t bg-[#080808] px-3 font-mono text-[10px] select-none"
      aria-label="Status bar"
    >
      <div className="flex items-center gap-4 text-[#8a8a8a]">
        <span className="flex items-center gap-1.5">
          <span className="text-[#00e5ff]">◆</span>
          {gitBranch ? gitBranch : "no repo"}
          {gitFiles.length > 0 && (
            <span className="ml-1 rounded-[3px] bg-[#141414] px-1.5 py-px text-[9px] text-[#b3b3b3]">
              {gitFiles.length}±
            </span>
          )}
        </span>
        {activeTab?.dirty && <span className="text-[#e0af68]">● unsaved</span>}
        {activePath && <span className="hidden text-[#5c5c5c] md:inline">{activePath}</span>}
      </div>

      <div className="flex items-center gap-4 text-[#737373]">
        <span className="hidden sm:inline">
          Ln {cursor.line}, Col {cursor.col}
        </span>
        <span className="hidden sm:inline">Spaces: {settings.tabSize}</span>
        <span className="hidden md:inline">UTF-8</span>
        <span className="hidden md:inline">LF</span>
        <span>{language}</span>
        <span
          className={
            socketStatus === "online"
              ? "text-[#00e5ff]"
              : socketStatus === "connecting"
                ? "text-[#e0af68]"
                : "text-[#ff5d5d]"
          }
        >
          {socketStatus === "online" ? "● LINK" : socketStatus === "connecting" ? "◐ SYNC" : "○ OFFLINE"}
        </span>
      </div>
    </footer>
  );
}
