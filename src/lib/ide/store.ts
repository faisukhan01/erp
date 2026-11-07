/* ONYX IDE — client state (zustand) */

"use client";

import { create } from "zustand";
import * as api from "./api";
import { languageOf } from "./langs";
import type {
  ChatMessage,
  FileNode,
  IdeSettings,
  OpenTab,
  SocketStatus,
} from "./types";

export type SidebarView = "explorer" | "search" | "git" | "settings";

interface OnyxState {
  /* layout */
  booted: boolean;
  sidebarOpen: boolean;
  sidebarView: SidebarView;
  panelOpen: boolean;
  chatOpen: boolean;
  paletteOpen: boolean;

  /* connection */
  socketStatus: SocketStatus;
  setSocketStatus: (s: SocketStatus) => void;

  /* workspace */
  workspaceName: string;
  tree: FileNode[] | null;
  treeLoading: boolean;
  expanded: Record<string, boolean>;
  loadTree: (silent?: boolean) => Promise<void>;
  toggleExpand: (path: string, value?: boolean) => void;
  expandTo: (path: string) => void;

  /* editor */
  tabs: OpenTab[];
  activePath: string | null;
  contents: Record<string, string>;
  cursor: { line: number; col: number };
  openFile: (path: string) => Promise<void>;
  closeTab: (path: string) => void;
  closeAllTabs: () => void;
  setActive: (path: string) => void;
  setContent: (path: string, content: string) => void;
  markDirty: (path: string, dirty: boolean) => void;
  saveActive: () => Promise<void>;
  applyExternal: (path: string, content: string) => void;
  setCursor: (line: number, col: number) => void;

  /* terminal */
  terminalKey: number;
  bumpTerminal: () => void;

  /* git */
  gitBranch: string;
  gitFiles: { path: string; x: string; y: string }[];
  gitRepo: boolean;
  loadGit: () => Promise<void>;

  /* chat */
  chatMessages: ChatMessage[];
  pushChat: (m: ChatMessage) => void;
  patchChat: (id: string, patch: Partial<ChatMessage>) => void;
  appendChatDelta: (id: string, delta: string) => void;
  clearChat: () => void;
  chatBusy: boolean;
  setChatBusy: (b: boolean) => void;

  /* settings */
  settings: IdeSettings;
  setSetting: <K extends keyof IdeSettings>(k: K, v: IdeSettings[K]) => void;

  /* ui actions */
  setBooted: (b: boolean) => void;
  toggleSidebar: (view?: SidebarView) => void;
  setSidebarView: (v: SidebarView) => void;
  togglePanel: () => void;
  toggleChat: () => void;
  setPaletteOpen: (b: boolean) => void;
}

const SETTINGS_KEY = "onyx.settings.v1";

function loadSettings(): IdeSettings {
  if (typeof window === "undefined") {
    return { fontSize: 13, tabSize: 2, wordWrap: false, minimap: true, lineNumbers: true };
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...{ fontSize: 13, tabSize: 2, wordWrap: false, minimap: true, lineNumbers: true }, ...JSON.parse(raw) };
    }
  } catch {
    /* ignore */
  }
  return { fontSize: 13, tabSize: 2, wordWrap: false, minimap: true, lineNumbers: true };
}

function persistSettings(s: IdeSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function flattenDirs(tree: FileNode[], trail: string[] = []): string[] {
  const out: string[] = [];
  for (const node of tree) {
    if (node.type === "dir") {
      const p = [...trail, node.name].join("/");
      out.push(p);
      if (node.children) out.push(...flattenDirs(node.children, [...trail, node.name]));
    }
  }
  return out;
}

export const useIde = create<OnyxState>((set, get) => ({
  booted: false,
  sidebarOpen: true,
  sidebarView: "explorer",
  panelOpen: true,
  chatOpen: true,
  paletteOpen: false,

  socketStatus: "connecting",
  setSocketStatus: (s) => set({ socketStatus: s }),

  workspaceName: "workspace",
  tree: null,
  treeLoading: false,
  expanded: {},

  loadTree: async (silent = false) => {
    if (!silent) set({ treeLoading: true });
    try {
      const tree = await api.fetchTree();
      set((st) => {
        // auto-expand first level on first load
        const expanded = { ...st.expanded };
        if (Object.keys(expanded).length === 0) {
          for (const d of flattenDirs(tree).slice(0, 24)) expanded[d] = true;
        }
        return { tree, expanded };
      });
    } catch {
      /* keep old tree on failure */
    } finally {
      if (!silent) set({ treeLoading: false });
    }
  },

  toggleExpand: (path, value) =>
    set((st) => ({
      expanded: { ...st.expanded, [path]: value ?? !st.expanded[path] },
    })),

  expandTo: (path) =>
    set((st) => {
      const parts = path.split("/");
      const expanded = { ...st.expanded };
      for (let i = 1; i < parts.length; i++) {
        expanded[parts.slice(0, i).join("/")] = true;
      }
      return { expanded };
    }),

  tabs: [],
  activePath: null,
  contents: {},
  cursor: { line: 1, col: 1 },

  openFile: async (path) => {
    const st = get();
    const name = path.split("/").pop() ?? path;
    const existing = st.tabs.find((t) => t.path === path);
    if (existing) {
      set({ activePath: path });
      return;
    }
    set({ activePath: path });
    if (st.contents[path] === undefined) {
      try {
        const content = await api.readFile(path);
        set((s2) => ({
          contents: { ...s2.contents, [path]: content },
          tabs:
            s2.tabs.find((t) => t.path === path)
              ? s2.tabs
              : [
                  ...s2.tabs,
                  { path, name, language: languageOf(name), dirty: false },
                ],
        }));
      } catch (err) {
        set({ activePath: st.activePath });
        throw err;
      }
    } else {
      set((s2) => ({
        tabs: s2.tabs.find((t) => t.path === path)
          ? s2.tabs
          : [...s2.tabs, { path, name, language: languageOf(name), dirty: false }],
      }));
    }
    get().expandTo(path);
  },

  closeTab: (path) =>
    set((st) => {
      const idx = st.tabs.findIndex((t) => t.path === path);
      const tabs = st.tabs.filter((t) => t.path !== path);
      let activePath = st.activePath;
      if (st.activePath === path) {
        activePath = tabs[Math.min(idx, tabs.length - 1)]?.path ?? null;
      }
      const contents = { ...st.contents };
      const stillOpen = tabs.some((t) => t.path === path);
      if (!stillOpen) delete contents[path];
      return { tabs, activePath, contents };
    }),

  closeAllTabs: () => set({ tabs: [], activePath: null, contents: {} }),

  setActive: (path) => set({ activePath: path }),

  setContent: (path, content) =>
    set((st) => ({
      contents: { ...st.contents, [path]: content },
      tabs: st.tabs.map((t) => (t.path === path ? { ...t, dirty: true } : t)),
    })),

  markDirty: (path, dirty) =>
    set((st) => ({
      tabs: st.tabs.map((t) => (t.path === path ? { ...t, dirty } : t)),
    })),

  saveActive: async () => {
    const { activePath, contents } = get();
    if (!activePath) return;
    const content = contents[activePath] ?? "";
    await api.writeFile(activePath, content);
    set((st) => ({
      tabs: st.tabs.map((t) => (t.path === activePath ? { ...t, dirty: false } : t)),
    }));
  },

  /** Content written by an outside force (AI apply) — syncs open editors. */
  applyExternal: (path, content) =>
    set((st) => ({
      contents: { ...st.contents, [path]: content },
      tabs: st.tabs.map((t) => (t.path === path ? { ...t, dirty: false } : t)),
    })),

  setCursor: (line, col) => set({ cursor: { line, col } }),

  terminalKey: 0,
  bumpTerminal: () => set((st) => ({ terminalKey: st.terminalKey + 1 })),

  gitBranch: "",
  gitFiles: [],
  gitRepo: false,
  loadGit: async () => {
    try {
      const s = await api.gitStatus();
      set({ gitBranch: s.branch, gitFiles: s.files, gitRepo: s.repo });
    } catch {
      set({ gitRepo: false, gitBranch: "", gitFiles: [] });
    }
  },

  chatMessages: [],
  pushChat: (m) => set((st) => ({ chatMessages: [...st.chatMessages, m] })),
  patchChat: (id, patch) =>
    set((st) => ({
      chatMessages: st.chatMessages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  appendChatDelta: (id, delta) =>
    set((st) => ({
      chatMessages: st.chatMessages.map((m) =>
        m.id === id ? { ...m, content: m.content + delta } : m
      ),
    })),
  clearChat: () => set({ chatMessages: [], chatBusy: false }),
  chatBusy: false,
  setChatBusy: (b) => set({ chatBusy: b }),

  settings: loadSettings(),
  setSetting: (k, v) => {
    const settings = { ...get().settings, [k]: v };
    persistSettings(settings);
    set({ settings });
  },

  setBooted: (b) => set({ booted: b }),
  toggleSidebar: (view) =>
    set((st) => {
      if (view && st.sidebarView === view && st.sidebarOpen) return { sidebarOpen: false };
      if (view) return { sidebarOpen: true, sidebarView: view };
      return { sidebarOpen: !st.sidebarOpen };
    }),
  setSidebarView: (v) => set({ sidebarView: v, sidebarOpen: true }),
  togglePanel: () => set((st) => ({ panelOpen: !st.panelOpen })),
  toggleChat: () => set((st) => ({ chatOpen: !st.chatOpen })),
  setPaletteOpen: (b) => set({ paletteOpen: b }),
}));
