/** Buildora API client — talks to the FastAPI backend (port 8000)
 *  through the gateway using the XTransformPort parameter. */

import type { Blueprint, ProjectDetail, ProjectMeta } from "./types";

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
export async function ensureBoot(): Promise<{ api: string; worker: string } | null> {
  try {
    const res = await fetch("/api/boot", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as { api: string; worker: string };
  } catch {
    return null;
  }
}

/** Wait until the FastAPI backend answers, booting it if necessary. */
export async function waitForBackend(maxMs = 25000): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    try {
      const res = await fetch(gw("/health"), { cache: "no-store" });
      if (res.ok) return true;
    } catch {
      /* keep trying */
    }
    await ensureBoot();
    await new Promise((r) => setTimeout(r, 1200));
  }
  return false;
}

// ---------------------------------------------------------------- users

const USER_KEY = "buildora_user_id";

export async function getUserId(): Promise<string> {
  const existing = typeof window !== "undefined" ? localStorage.getItem(USER_KEY) : null;
  if (existing) return existing;
  if (!(await waitForBackend())) {
    throw new Error("The Buildora backend is still waking up. Try again in a moment.");
  }
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

export function renameProject(projectId: string, name: string): Promise<ProjectDetail> {
  return jsonFetch<ProjectDetail>(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
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

/** URL that serves the generated app as a real page (new tab / thumbnails). */
export function previewUrl(projectId: string, version?: number): string {
  const v = version ? `&v=${version}` : "";
  return gw(`/projects/${projectId}/preview${v}`);
}

// ---------------------------------------------------------------- AI generation (SSE)

export interface GenerateHandlers {
  onStatus?: (stage: string) => void;
  onPlan?: (blueprint: Blueprint) => void;
  onChunk?: (text: string) => void;
  onDone?: (payload: {
    version_id: string | null;
    version_number: number;
    html: string;
    message_id: string | null;
    name: string | null;
    description: string | null;
    chars?: number;
    elapsed_seconds?: number;
  }) => void;
  onError?: (message: string) => void;
}

async function once(
  projectId: string,
  handlers: GenerateHandlers
): Promise<{ ok: boolean; retriable: boolean; message?: string }> {
  let res: Response;
  try {
    res = await fetch(gw(`/projects/${projectId}/generate`), {
      method: "POST",
      cache: "no-store",
    });
  } catch {
    return { ok: false, retriable: true, message: "Network error while contacting the builder." };
  }
  if (!res.ok || !res.body) {
    return {
      ok: false,
      retriable: res.status >= 500 || res.status === 404,
      message: `Generation request failed (${res.status})`,
    };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let failed = false;
  let message = "";

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
    else if (event === "plan") handlers.onPlan?.((data.blueprint || {}) as Blueprint);
    else if (event === "chunk") handlers.onChunk?.(String(data.text || ""));
    else if (event === "done") handlers.onDone?.(data as never);
    else if (event === "error") {
      failed = true;
      message = String(data.message || "Unknown generation error");
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

  if (failed) return { ok: false, retriable: false, message };
  return { ok: true, retriable: false };
}

/**
 * Stream a full AI build. Resilient by design: if the FastAPI service is
 * restarting (the 502 the first release suffered), it boots it and retries.
 */
export async function generateStream(
  projectId: string,
  handlers: GenerateHandlers,
  opts?: { maxBootRetries?: number }
): Promise<void> {
  const maxRetries = opts?.maxBootRetries ?? 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await once(projectId, handlers);
    if (result.ok) return;
    if (result.retriable && attempt < maxRetries) {
      handlers.onStatus?.("connecting");
      await waitForBackend();
      continue;
    }
    handlers.onError?.(result.message || "Generation failed");
    return;
  }
}
