/** Buildora API client — talks to the FastAPI backend (port 8000)
 *  through the gateway using the XTransformPort parameter. */

import type { ProjectDetail, ProjectMeta } from "./types";

const PORT = "8000";
const gw = (path: string) => `/api${path}${path.includes("?") ? "&" : "?"}XTransformPort=${PORT}`;

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(gw(path), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

/** Boot the mini-services (idempotent, self-healing). */
export async function ensureBoot(): Promise<void> {
  try {
    await fetch("/api/boot", { cache: "no-store" });
  } catch {
    /* non-fatal */
  }
}

// ---------------------------------------------------------------- users

const USER_KEY = "buildora_user_id";

export async function getUserId(): Promise<string> {
  const existing = typeof window !== "undefined" ? localStorage.getItem(USER_KEY) : null;
  if (existing) return existing;
  const user = await jsonFetch<{ id: string }>("/users", { method: "POST", body: "{}" });
  localStorage.setItem(USER_KEY, user.id);
  return user.id;
}

// ---------------------------------------------------------------- projects

export function listProjects(userId: string): Promise<ProjectMeta[]> {
  return jsonFetch<ProjectMeta[]>(`/projects?user_id=${encodeURIComponent(userId)}`);
}

export function createProject(userId: string, prompt: string): Promise<ProjectDetail> {
  return jsonFetch<ProjectDetail>("/projects", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, prompt }),
  });
}

export function getProject(projectId: string): Promise<ProjectDetail> {
  return jsonFetch<ProjectDetail>(`/projects/${projectId}`);
}

export function deleteProject(projectId: string): Promise<{ ok: boolean }> {
  return jsonFetch<{ ok: boolean }>(`/projects/${projectId}`, { method: "DELETE" });
}

export function addChatMessage(projectId: string, content: string) {
  return jsonFetch<{ id: string; role: string; content: string; created_at: string }>(
    `/projects/${projectId}/chat`,
    { method: "POST", body: JSON.stringify({ content }) },
  );
}

export function restoreVersion(projectId: string, versionId: string) {
  return jsonFetch<{ ok: boolean }>(`/projects/${projectId}/restore`, {
    method: "POST",
    body: JSON.stringify({ version_id: versionId }),
  });
}

// ---------------------------------------------------------------- AI generation (SSE)

export interface GenerateHandlers {
  onStatus?: (stage: string) => void;
  onChunk?: (text: string) => void;
  onDone?: (payload: {
    version_id: string | null;
    version_number: number;
    html: string;
    message_id: string | null;
    name: string | null;
    description: string | null;
    elapsed_seconds?: number;
  }) => void;
  onError?: (message: string) => void;
}

export async function generateStream(projectId: string, handlers: GenerateHandlers): Promise<void> {
  const res = await fetch(gw(`/projects/${projectId}/generate`), { method: "POST" });
  if (!res.ok || !res.body) {
    handlers.onError?.(`Generation request failed (${res.status})`);
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedError = false;

  const dispatch = (rawEvent: string) => {
    const lines = rawEvent.split("\n");
    const event = lines.find((l) => l.startsWith("event: "))?.slice(7).trim();
    const dataLine = lines.find((l) => l.startsWith("data: "))?.slice(6);
    if (!event || dataLine === undefined) return;
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(dataLine);
    } catch {
      return;
    }
    if (event === "status") handlers.onStatus?.(String(data.stage || ""));
    else if (event === "chunk") handlers.onChunk?.(String(data.text || ""));
    else if (event === "done") handlers.onDone?.(data as never);
    else if (event === "error") {
      receivedError = true;
      handlers.onError?.(String(data.message || "Unknown generation error"));
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) dispatch(part);
  }
  if (buffer.trim()) dispatch(buffer);
  if (!receivedError && !buffer.includes("event: done")) {
    // stream ended without done or error — surface a generic failure
  }
}
