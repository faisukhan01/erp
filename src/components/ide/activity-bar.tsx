"use client";

import { Bot, Files, GitBranch, Search, Settings } from "lucide-react";
import { useIde, type SidebarView } from "@/lib/ide/store";

const TOP: { view: SidebarView; icon: typeof Files; label: string }[] = [
  { view: "explorer", icon: Files, label: "Explorer" },
  { view: "search", icon: Search, label: "Search" },
  { view: "git", icon: GitBranch, label: "Source Control" },
];

export function ActivityBar() {
  const sidebarView = useIde((s) => s.sidebarView);
  const sidebarOpen = useIde((s) => s.sidebarOpen);
  const toggleSidebar = useIde((s) => s.toggleSidebar);
  const chatOpen = useIde((s) => s.chatOpen);
  const toggleChat = useIde((s) => s.toggleChat);
  const gitFiles = useIde((s) => s.gitFiles);

  const badge = gitFiles.length;

  return (
    <nav
      className="flex h-full w-11 shrink-0 flex-col items-center border-r bg-[#050505] py-2"
      aria-label="Activity bar"
    >
      {TOP.map(({ view, icon: Icon, label }) => {
        const active = sidebarOpen && sidebarView === view;
        return (
          <button
            key={view}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={() => toggleSidebar(view)}
            className={`relative flex h-10 w-10 items-center justify-center rounded-[5px] transition-colors ${
              active ? "text-[#f2f2f2]" : "text-[#5c5c5c] hover:text-[#a3a3a3]"
            }`}
          >
            {active && (
              <span className="absolute left-[-6px] top-1/2 h-5 w-[2px] -translate-y-1/2 bg-[#00e5ff]" />
            )}
            <Icon className="h-[18px] w-[18px]" />
            {view === "git" && badge > 0 && (
              <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#00e5ff] px-1 font-mono text-[8px] font-bold text-black">
                {badge > 99 ? "99" : badge}
              </span>
            )}
          </button>
        );
      })}

      <div className="flex-1" />

      <button
        type="button"
        title="Onyx AI (Ctrl+L)"
        aria-label="Onyx AI"
        aria-pressed={chatOpen}
        onClick={toggleChat}
        className={`relative flex h-10 w-10 items-center justify-center rounded-[5px] transition-colors ${
          chatOpen ? "text-[#00e5ff]" : "text-[#5c5c5c] hover:text-[#a3a3a3]"
        }`}
      >
        <Bot className="h-[18px] w-[18px]" />
      </button>

      <button
        type="button"
        title="Settings"
        aria-label="Settings"
        aria-pressed={sidebarOpen && sidebarView === "settings"}
        onClick={() => toggleSidebar("settings")}
        className={`relative flex h-10 w-10 items-center justify-center rounded-[5px] transition-colors ${
          sidebarOpen && sidebarView === "settings"
            ? "text-[#f2f2f2]"
            : "text-[#5c5c5c] hover:text-[#a3a3a3]"
        }`}
      >
        {sidebarOpen && sidebarView === "settings" && (
          <span className="absolute left-[-6px] top-1/2 h-5 w-[2px] -translate-y-1/2 bg-[#00e5ff]" />
        )}
        <Settings className="h-[18px] w-[18px]" />
      </button>
    </nav>
  );
}
