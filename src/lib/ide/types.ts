/* ONYX IDE — shared types */

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
  size?: number;
  updatedAt?: string;
}

export interface OpenTab {
  path: string;
  name: string;
  language: string;
  dirty: boolean;
  preview?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  files?: string[];
  createdAt: number;
  streaming?: boolean;
  error?: boolean;
  /** Files the agent wrote to disk for this message (from ai:file events). */
  wroteFiles?: { path: string; action: "created" | "updated"; lines: number }[];
}

export interface ChatContextFile {
  path: string;
  content: string;
}

export interface GitFile {
  path: string;
  x: string; // index status
  y: string; // worktree status
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface SearchHit {
  path: string;
  line: number;
  col: number;
  text: string;
}

export interface IdeSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
}

export type SocketStatus = "connecting" | "online" | "offline";
