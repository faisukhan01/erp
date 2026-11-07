/* ONYX IDE — client API helpers for the sandboxed workspace filesystem */

import type { FileNode, GitCommit, GitFile, SearchHit } from "./types";

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

/* ------------------------------------------------------------ file system */

export async function fetchTree(): Promise<FileNode[]> {
  const res = await fetch("/api/ide/fs?op=tree", { cache: "no-store" });
  return json<{ tree: FileNode[] }>(res).then((d) => d.tree);
}

export async function readFile(path: string): Promise<string> {
  const res = await fetch(
    `/api/ide/fs?op=read&path=${encodeURIComponent(path)}`,
    { cache: "no-store" }
  );
  return json<{ content: string }>(res).then((d) => d.content);
}

export async function writeFile(path: string, content: string): Promise<void> {
  const res = await fetch("/api/ide/fs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op: "write", path, content }),
  });
  await json(res);
}

export async function createFile(path: string, content = ""): Promise<void> {
  const res = await fetch("/api/ide/fs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op: "createFile", path, content }),
  });
  await json(res);
}

export async function createDir(path: string): Promise<void> {
  const res = await fetch("/api/ide/fs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op: "createDir", path }),
  });
  await json(res);
}

export async function renameEntry(from: string, to: string): Promise<void> {
  const res = await fetch("/api/ide/fs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op: "rename", from, to }),
  });
  await json(res);
}

export async function deleteEntry(path: string): Promise<void> {
  const res = await fetch("/api/ide/fs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op: "delete", path }),
  });
  await json(res);
}

/* ---------------------------------------------------------------- search */

export async function searchWorkspace(
  query: string,
  opts?: { caseSensitive?: boolean; regex?: boolean }
): Promise<SearchHit[]> {
  const res = await fetch("/api/ide/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, ...opts }),
  });
  return json<{ hits: SearchHit[] }>(res).then((d) => d.hits);
}

/* -------------------------------------------------------------------- git */

export async function gitStatus(): Promise<{ branch: string; files: GitFile[]; repo: boolean }> {
  const res = await fetch("/api/ide/git?op=status", { cache: "no-store" });
  return json(res);
}

export async function gitLog(): Promise<GitCommit[]> {
  const res = await fetch("/api/ide/git?op=log", { cache: "no-store" });
  return json<{ commits: GitCommit[] }>(res).then((d) => d.commits);
}

export async function gitCommit(message: string): Promise<string> {
  const res = await fetch("/api/ide/git", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op: "commit", message }),
  });
  return json<{ output: string }>(res).then((d) => d.output);
}

export async function gitInit(): Promise<void> {
  const res = await fetch("/api/ide/git", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op: "init" }),
  });
  await json(res);
}
