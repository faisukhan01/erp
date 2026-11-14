"use client";

import { useEffect, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Toaster } from "@/components/ui/sonner";
import { useIde } from "@/lib/ide/store";
import { getSocket } from "@/lib/ide/socket";
import { BootSplash } from "./boot-splash";
import { TitleBar } from "./title-bar";
import { ActivityBar } from "./activity-bar";
import { StatusBar } from "./status-bar";
import { EditorPane } from "./editor-pane";
import { TerminalPanel } from "./panel/terminal";
import { PreviewPane } from "./panel/preview";
import { AiChat } from "./chat/ai-chat";
import { CommandPalette } from "./command-palette";
import { Explorer } from "./sidebar/explorer";
import { SearchPanel } from "./sidebar/search-panel";
import { GitPanel } from "./sidebar/git-panel";
import { SettingsPanel } from "./sidebar/settings-panel";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

function ResizeHandle({ vertical = false }: { vertical?: boolean }) {
  return (
    <PanelResizeHandle
      className={
        vertical
          ? "group relative h-px w-full bg-[#141414] transition-colors hover:bg-[#00e5ff55] data-[resize-handle-state=drag]:bg-[#00e5ff]"
          : "group relative h-full w-px bg-[#141414] transition-colors hover:bg-[#00e5ff55] data-[resize-handle-state=drag]:bg-[#00e5ff]"
      }
    >
      <span
        className={
          vertical
            ? "absolute inset-x-0 -top-1 -bottom-1"
            : "absolute inset-y-0 -left-1 -right-1"
        }
      />
    </PanelResizeHandle>
  );
}

function SidebarContent() {
  const view = useIde((s) => s.sidebarView);
  if (view === "explorer") return <Explorer />;
  if (view === "search") return <SearchPanel />;
  if (view === "git") return <GitPanel />;
  return <SettingsPanel />;
}

function MobileOverlay({
  side,
  onClose,
  children,
}: {
  side: "left" | "right";
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
      <div
        className={`absolute inset-y-0 ${side === "left" ? "left-11 w-[78%] max-w-[300px]" : "right-0 w-[88%] max-w-[360px]"} border-x bg-[#050505] anim-fade`}
      >
        {children}
      </div>
    </div>
  );
}

export function OnyxIDE() {
  const booted = useIde((s) => s.booted);
  const sidebarOpen = useIde((s) => s.sidebarOpen);
  const chatOpen = useIde((s) => s.chatOpen);
  const panelOpen = useIde((s) => s.panelOpen);
  const previewOpen = useIde((s) => s.previewOpen);
  const isMobile = useIsMobile();
  const bootedOnce = useRef(false);

  /* boot: preconnect socket, load tree + git, splash */
  useEffect(() => {
    if (bootedOnce.current) return;
    bootedOnce.current = true;

    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (mobile) {
      useIde.setState({ sidebarOpen: false, panelOpen: false, chatOpen: false, previewOpen: false });
    }

    getSocket();
    useIde.getState().loadTree();
    useIde.getState().loadGit();
    // let the boot sequence play, then lift the curtain
    setTimeout(() => useIde.getState().setBooted(true), 1600);
  }, []);

  /* global shortcuts — capture phase so Monaco never swallows them */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const st = useIde.getState();

      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        e.stopPropagation();
        st.saveActive()
          .then(() => st.loadGit())
          .catch(() => undefined);
        return;
      }
      if (mod && (e.key.toLowerCase() === "p" || e.key.toLowerCase() === "k")) {
        e.preventDefault();
        e.stopPropagation();
        st.setPaletteOpen(!st.paletteOpen);
        return;
      }
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        e.stopPropagation();
        st.toggleSidebar();
        return;
      }
      if (mod && e.key.toLowerCase() === "l") {
        e.preventDefault();
        e.stopPropagation();
        st.toggleChat();
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        e.stopPropagation();
        st.togglePreview();
        return;
      }
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        e.stopPropagation();
        st.togglePanel();
        return;
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
  }, []);

  return (
    <div className="ide-chrome flex h-dvh flex-col overflow-hidden bg-[#030303]">
      <BootSplash done={booted} />

      <TitleBar />

      <div className="flex min-h-0 flex-1">
        <ActivityBar />

        {isMobile ? (
          <div className="relative flex min-h-0 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <EditorPane />
            </div>
            {previewOpen && (
              <div className="absolute inset-0 z-10 anim-fade">
                <PreviewPane onClose={() => useIde.setState({ previewOpen: false })} />
              </div>
            )}
            {panelOpen && (
              <div className="absolute inset-x-0 bottom-0 z-20 h-[46%] border-t">
                <TerminalPanel />
              </div>
            )}
            {sidebarOpen && (
              <MobileOverlay side="left" onClose={() => useIde.setState({ sidebarOpen: false })}>
                <SidebarContent />
              </MobileOverlay>
            )}
            {chatOpen && (
              <MobileOverlay side="right" onClose={() => useIde.setState({ chatOpen: false })}>
                <AiChat />
              </MobileOverlay>
            )}
          </div>
        ) : (
          <PanelGroup direction="horizontal" className="min-h-0 flex-1" autoSaveId="onyx-h">
            {sidebarOpen ? (
              <Panel defaultSize={19} minSize={13} maxSize={34} className="bg-[#060606]">
                <SidebarContent />
              </Panel>
            ) : null}
            {sidebarOpen && <ResizeHandle />}
            <Panel minSize={30}>
              <PanelGroup direction="vertical" autoSaveId="onyx-v">
                <Panel minSize={20}>
                  <PanelGroup direction="horizontal" autoSaveId="onyx-preview">
                    <Panel minSize={24}>
                      <EditorPane />
                    </Panel>
                    {previewOpen && (
                      <>
                        <ResizeHandle />
                        <Panel defaultSize={42} minSize={18} className="bg-[#050505]">
                          <PreviewPane onClose={() => useIde.setState({ previewOpen: false })} />
                        </Panel>
                      </>
                    )}
                  </PanelGroup>
                </Panel>
                {panelOpen && (
                  <>
                    <ResizeHandle vertical />
                    <Panel defaultSize={30} minSize={12}>
                      <TerminalPanel />
                    </Panel>
                  </>
                )}
              </PanelGroup>
            </Panel>
            {chatOpen && <ResizeHandle />}
            {chatOpen ? (
              <Panel defaultSize={25} minSize={18} maxSize={40} className="bg-[#050505]">
                <AiChat />
              </Panel>
            ) : null}
          </PanelGroup>
        )}
      </div>

      <StatusBar />
      <CommandPalette />

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#0b0b0b",
            border: "1px solid #1d1d1d",
            color: "#ededed",
            fontFamily: "var(--font-mono-code)",
            fontSize: "12px",
            borderRadius: "6px",
          },
        }}
      />
    </div>
  );
}
