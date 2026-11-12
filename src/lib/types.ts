/** Shared types for the Buildora frontend. */

export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  initial_prompt: string;
  current_version_id: string | null;
  version_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface VersionMeta {
  id: string;
  version_number: number;
  summary: string;
  created_at: string;
}

export interface ProjectDetail extends ProjectMeta {
  messages: ChatMessage[];
  versions: VersionMeta[];
  current_html: string | null;
}

/** Z.AI's build blueprint — shown in chat before the code streams. */
export interface Blueprint {
  name: string | null;
  description: string | null;
  tagline: string | null;
  features: string[];
  palette: string[];
  vibe: string | null;
}

export type ViewName = "landing" | "dashboard" | "builder";

export type GenStage =
  | ""
  | "connecting"
  | "planning"
  | "building"
  | "retrying"
  | "saving";
