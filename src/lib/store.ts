/** Buildora global state — Zustand store. */
import { create } from "zustand";

import {
  addChatMessage,
  createProject,
  deleteProject,
  generateStream,
  getProject,
  getUserId,
  listProjects,
  renameProject,
  restoreVersion,
} from "./api";
import type { Blueprint, ChatMessage, ProjectDetail, ProjectMeta, ViewName } from "./types";

interface BuildoraState {
  view: ViewName;
  activeProjectId: string | null;
  userId: string | null;
  projects: ProjectMeta[];
  projectsLoading: boolean;
  detail: ProjectDetail | null;
  detailLoading: boolean;
  // generation state
  generating: boolean;
  genStage: string;
  genStartedAt: number | null;
  streamedCode: string;
  blueprint: Blueprint | null;
  lastGenFailed: boolean;
  // workspace ui state (shared so generation flows can drive the view)
  rightTab: "preview" | "code";
  mobileTab: "chat" | "preview";
  previewNonce: number;

  setRightTab: (tab: "preview" | "code") => void;
  setMobileTab: (tab: "chat" | "preview") => void;
  reloadPreview: () => void;

  setView: (view: ViewName) => void;
  init: () => Promise<void>;
  loadProjects: () => Promise<void>;
  openProject: (id: string) => Promise<void>;
  newProject: (prompt: string) => Promise<void>; // create + go to builder
  removeProject: (id: string) => Promise<void>;
  goDashboard: () => void;
  doRenameProject: (id: string, name: string) => Promise<void>;

  sendMessage: (content: string) => Promise<void>;
  generate: () => Promise<void>;
  restore: (versionId: string) => Promise<void>;
}

export const useStore = create<BuildoraState>((set, get) => ({
  view: "landing",
  activeProjectId: null,
  userId: null,
  projects: [],
  projectsLoading: false,
  detail: null,
  detailLoading: false,
  generating: false,
  genStage: "",
  genStartedAt: null,
  streamedCode: "",
  blueprint: null,
  lastGenFailed: false,
  rightTab: "preview",
  mobileTab: "chat",
  previewNonce: 0,

  setRightTab: (tab) => set({ rightTab: tab }),
  setMobileTab: (tab) => set({ mobileTab: tab }),
  reloadPreview: () => set((s) => ({ previewNonce: s.previewNonce + 1 })),

  setView: (view) => set({ view }),

  init: async () => {
    try {
      const userId = await getUserId();
      set({ userId });
      await get().loadProjects();
    } catch {
      // backend may still be booting; ignore — user can retry by navigating
    }
  },

  loadProjects: async () => {
    const { userId } = get();
    if (!userId) return;
    set({ projectsLoading: true });
    try {
      const projects = await listProjects(userId);
      set({ projects, projectsLoading: false });
    } catch {
      set({ projectsLoading: false });
    }
  },

  openProject: async (id) => {
    set({
      activeProjectId: id,
      detail: null,
      detailLoading: true,
      streamedCode: "",
      genStage: "",
      generating: false,
      blueprint: null,
      lastGenFailed: false,
      rightTab: "preview",
      mobileTab: "chat",
    });
    set({ view: "builder" });
    try {
      const detail = await getProject(id);
      set({ detail, detailLoading: false });
    } catch {
      set({ detailLoading: false });
    }
  },

  newProject: async (prompt) => {
    let { userId } = get();
    if (!userId) {
      // self-heal: the boot may have raced the first time — retry once
      await get().init();
      userId = get().userId;
    }
    if (!userId) throw new Error("The builder backend is still waking up — try again in a few seconds.");
    const detail = await createProject(userId, prompt);
    await get().loadProjects();
    set({
      view: "builder",
      activeProjectId: detail.id,
      detail,
      detailLoading: false,
      streamedCode: "",
      genStage: "",
      generating: false,
      blueprint: null,
      lastGenFailed: false,
      rightTab: "code",
      mobileTab: "chat",
    });
    // kick off first generation automatically
    void get().generate();
  },

  removeProject: async (id) => {
    await deleteProject(id);
    const { projects } = get();
    set({ projects: projects.filter((p) => p.id !== id) });
  },

  goDashboard: () => {
    set({ view: "dashboard", activeProjectId: null, detail: null });
    if (!get().userId) {
      void get().init().then(() => get().loadProjects());
    } else {
      void get().loadProjects();
    }
  },

  doRenameProject: async (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await renameProject(id, trimmed);
    const { detail, projects } = get();
    if (detail && detail.id === id) set({ detail: { ...detail, name: trimmed } });
    set({ projects: projects.map((p) => (p.id === id ? { ...p, name: trimmed } : p)) });
  },

  sendMessage: async (content) => {
    const { activeProjectId, detail } = get();
    if (!activeProjectId || !detail) return;
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    set({ detail: { ...detail, messages: [...detail.messages, optimistic] } });
    try {
      const saved = await addChatMessage(activeProjectId, content);
      const d = get().detail;
      if (d) {
        set({
          detail: {
            ...d,
            messages: d.messages.map((m) => (m.id === optimistic.id ? { ...optimistic, id: saved.id } : m)),
          },
        });
      }
    } catch {
      // keep optimistic message anyway
    }
    await get().generate();
  },

  generate: async () => {
    const { activeProjectId, generating, detail } = get();
    if (!activeProjectId || generating) return;
    set({
      generating: true,
      genStage: "connecting",
      genStartedAt: Date.now(),
      streamedCode: "",
      blueprint: null,
      lastGenFailed: false,
      rightTab: "code",
    });
    await generateStream(activeProjectId, {
      onStatus: (stage) =>
        set((s) => ({
          genStage: stage,
          // a "connecting" status means a fresh attempt began — clear the
          // partially streamed code from the failed attempt
          streamedCode: stage === "connecting" ? "" : s.streamedCode,
        })),
      onPlan: (blueprint) => set({ blueprint }),
      onChunk: (text) => set((s) => ({ streamedCode: s.streamedCode + text })),
      onDone: (payload) => {
        const d = get().detail;
        const lastUser = d ? [...d.messages].reverse().find((m) => m.role === "user") : undefined;
        const assistantMsg: ChatMessage = {
          id: payload.message_id || `asst-${Date.now()}`,
          role: "assistant",
          content:
            payload.version_number === 1
              ? `Built **${payload.name || d?.name || "your app"}** — version 1 is live.${
                  payload.description ? `\n\n${payload.description}` : ""
                }`
              : `Updated **${d?.name || "your app"}** to version ${payload.version_number}.\n\nApplied: "${lastUser?.content.slice(0, 160) || "your change"}"`,
          created_at: new Date().toISOString(),
        };
        set({
          generating: false,
          genStage: "",
          streamedCode: "",
          lastGenFailed: false,
          rightTab: "preview",
          mobileTab: "preview",
          previewNonce: get().previewNonce + 1,
          detail: d
            ? {
                ...d,
                current_html: payload.html,
                current_version_id: payload.version_id || d.current_version_id,
                version_count: payload.version_number,
                name: payload.name || d.name,
                description: payload.description || d.description,
                messages: [...d.messages, assistantMsg],
                versions: [
                  ...d.versions.filter((v) => v.version_number !== payload.version_number),
                  {
                    id: payload.version_id || `v-${payload.version_number}`,
                    version_number: payload.version_number,
                    summary: (lastUser?.content || "").slice(0, 300),
                    created_at: new Date().toISOString(),
                  },
                ],
              }
            : d,
        });
        // refresh dashboard cards silently
        void get().loadProjects();
      },
      onError: (message) => {
        set({ generating: false, genStage: "", lastGenFailed: true });
        const d = get().detail;
        if (d) {
          set({
            detail: {
              ...d,
              messages: [
                ...d.messages,
                {
                  id: `err-${Date.now()}`,
                  role: "assistant",
                  content: `Generation failed: ${message}`,
                  created_at: new Date().toISOString(),
                },
              ],
            },
          });
        }
      },
    });
  },

  restore: async (versionId) => {
    const { activeProjectId, detail } = get();
    if (!activeProjectId || !detail) return;
    await restoreVersion(activeProjectId, versionId);
    const refreshed = await getProject(activeProjectId);
    set({ detail: refreshed, previewNonce: get().previewNonce + 1 });
  },
}));
