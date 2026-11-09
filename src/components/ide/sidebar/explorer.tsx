"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  File as FileIcon,
  FilePlus,
  FolderPlus,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import * as api from "@/lib/ide/api";
import { useIde } from "@/lib/ide/store";
import { fileGlyph } from "@/lib/ide/langs";
import type { FileNode } from "@/lib/ide/types";

/* --------------------------------------------------------------- tree row */

function TreeRow({
  node,
  depth,
}: {
  node: FileNode;
  depth: number;
}) {
  const expanded = useIde((s) => s.expanded[node.path] ?? false);
  const toggleExpand = useIde((s) => s.toggleExpand);
  const activePath = useIde((s) => s.activePath);
  const openFile = useIde((s) => s.openFile);
  const tabs = useIde((s) => s.tabs);
  const loadTree = useIde((s) => s.loadTree);

  const [creating, setCreating] = useState<null | "file" | "dir">(null);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = activePath === node.path;
  const tab = tabs.find((t) => t.path === node.path);
  const glyph = node.type === "file" ? fileGlyph(node.name) : null;

  const commitCreate = async () => {
    const name = draft.trim();
    setCreating(null);
    if (!name) return;
    const path = node.type === "dir" ? `${node.path}/${name}` : name;
    try {
      if (creating === "dir") await api.createDir(path);
      else await api.createFile(path);
      await loadTree(true);
      if (creating === "file") await openFile(path);
      toast(`Created ${path}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    }
  };

  const commitRename = async () => {
    const name = draft.trim();
    setRenaming(false);
    if (!name || name === node.name) return;
    const parent = node.path.includes("/") ? node.path.slice(0, node.path.lastIndexOf("/")) : "";
    const to = parent ? `${parent}/${name}` : name;
    try {
      await api.renameEntry(node.path, to);
      await loadTree(true);
      toast(`Renamed to ${name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rename failed");
    }
  };

  const remove = useCallback(async () => {
    try {
      await api.deleteEntry(node.path);
      const st = useIde.getState();
      if (node.type === "file") st.closeTab(node.path);
      await st.loadTree(true);
      st.loadGit();
      toast(`Deleted ${node.path}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }, [node.path, node.type]);

  const menu = (
    <ContextMenuContent
      className="w-44 border-[#222] bg-[#0b0b0b] font-mono text-[11px]"
    >
      {node.type === "dir" && (
        <>
          <ContextMenuItem onClick={() => { setCreating("file"); setDraft(""); }}>
            <FilePlus className="mr-2 h-3.5 w-3.5" /> New File
          </ContextMenuItem>
          <ContextMenuItem onClick={() => { setCreating("dir"); setDraft(""); }}>
            <FolderPlus className="mr-2 h-3.5 w-3.5" /> New Folder
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-[#1d1d1d]" />
        </>
      )}
      {node.type === "file" && (
        <ContextMenuItem onClick={() => openFile(node.path)}>
          <FileIcon className="mr-2 h-3.5 w-3.5" /> Open
        </ContextMenuItem>
      )}
      <ContextMenuItem onClick={() => { setRenaming(true); setDraft(node.name); }}>
        <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => navigator.clipboard?.writeText(node.path).catch(() => undefined)}
      >
        <FileIcon className="mr-2 h-3.5 w-3.5" /> Copy Path
      </ContextMenuItem>
      <ContextMenuSeparator className="bg-[#1d1d1d]" />
      <ContextMenuItem onClick={remove} className="text-[#ff5d5d] focus:text-[#ff5d5d]">
        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
      </ContextMenuItem>
    </ContextMenuContent>
  );

  const rowContent = (
    <div
      className={`group relative flex h-7 w-full cursor-pointer items-center gap-1 pr-2 transition-colors ${
        isActive
          ? "bg-[#131313] text-[#f2f2f2]"
          : menuOpen
            ? "bg-[#0e0e0e] text-[#d4d4d4]"
            : "text-[#a3a3a3] hover:bg-[#0e0e0e] hover:text-[#d4d4d4]"
      }`}
      style={{ paddingLeft: 6 + depth * 12 }}
      onClick={() => {
        if (node.type === "dir") toggleExpand(node.path);
        else openFile(node.path).catch(() => undefined);
      }}
      role="treeitem"
      aria-expanded={node.type === "dir" ? expanded : undefined}
      aria-selected={isActive}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (node.type === "dir") toggleExpand(node.path);
          else openFile(node.path).catch(() => undefined);
        }
      }}
    >
      {isActive && <span className="absolute left-0 top-0 h-full w-[2px] bg-[#00e5ff]" />}

      {node.type === "dir" ? (
        <>
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#5c5c5c]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#5c5c5c]" />
          )}
          <span className="truncate text-[12.5px]">{node.name}</span>
        </>
      ) : (
        <>
          <span className="w-3.5 shrink-0 text-center font-mono text-[9px] font-bold" style={{ color: glyph?.color }}>
            {glyph?.glyph}
          </span>
          <span className="truncate text-[12.5px]">{node.name}</span>
          {tab?.dirty && <span className="ml-auto mr-0.5 h-1.5 w-1.5 rounded-full bg-[#00e5ff]" />}
        </>
      )}
    </div>
  );

  return (
    <div>
      <ContextMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
        <ContextMenuTrigger asChild>
          <div>{rowContent}</div>
        </ContextMenuTrigger>
        {menu}
      </ContextMenu>

      {(creating || renaming) && (
        <div style={{ paddingLeft: 10 + depth * 12 }} className="py-0.5">
          <input
            autoFocus
            value={draft}
            placeholder={creating === "dir" ? "folder name" : creating === "file" ? "file name" : ""}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (creating) commitCreate();
              if (renaming) commitRename();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (creating) commitCreate();
                if (renaming) commitRename();
              }
              if (e.key === "Escape") {
                setCreating(null);
                setRenaming(false);
              }
            }}
            className="h-6 w-[85%] rounded-[3px] border border-[#00e5ff55] bg-[#0a0a0a] px-1.5 font-mono text-[11px] text-[#ededed] outline-none"
          />
        </div>
      )}

      {node.type === "dir" && expanded && (
        <div role="group">
          {node.children?.map((child) => (
            <TreeRow key={child.path} node={child} depth={depth + 1} />
          ))}
          {node.children?.length === 0 && (
            <div
              className="flex h-6 items-center text-[11px] italic text-[#4a4a4a]"
              style={{ paddingLeft: 24 + depth * 12 }}
            >
              empty
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- explorer */

export function Explorer() {
  const tree = useIde((s) => s.tree);
  const treeLoading = useIde((s) => s.treeLoading);
  const loadTree = useIde((s) => s.loadTree);
  const expanded = useIde((s) => s.expanded);
  const toggleExpand = useIde((s) => s.toggleExpand);
  const openFile = useIde((s) => s.openFile);

  const [creating, setCreating] = useState<null | "file" | "dir">(null);
  const [draft, setDraft] = useState("");

  const collapseAll = useCallback(() => {
    const st = useIde.getState();
    for (const key of Object.keys(st.expanded)) {
      st.toggleExpand(key, false);
    }
  }, []);

  const commitCreate = async () => {
    const name = draft.trim();
    setCreating(null);
    if (!name) return;
    try {
      if (creating === "dir") await api.createDir(name);
      else {
        await api.createFile(name);
        await openFile(name);
      }
      await loadTree(true);
      toast(`Created ${name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    }
  };

  const flatCount = useMemo(() => tree?.length ?? 0, [tree]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-3">
        <span className="micro-label">Explorer</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="New file at root"
            onClick={() => { setCreating("file"); setDraft(""); }}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#8a8a8a] hover:bg-[#141414] hover:text-white"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="New folder at root"
            onClick={() => { setCreating("dir"); setDraft(""); }}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#8a8a8a] hover:bg-[#141414] hover:text-white"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Refresh"
            onClick={() => loadTree(true)}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#8a8a8a] hover:bg-[#141414] hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${treeLoading ? "anim-spin" : ""}`} />
          </button>
          <button
            type="button"
            title="Collapse all"
            onClick={collapseAll}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#8a8a8a] hover:bg-[#141414] hover:text-white"
          >
            <ChevronsDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1" role="tree" aria-label="Workspace files">
        {creating && (
          <div className="px-2.5 py-1">
            <input
              autoFocus
              value={draft}
              placeholder={creating === "dir" ? "folder name" : "file name"}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitCreate}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitCreate();
                if (e.key === "Escape") setCreating(null);
              }}
              className="h-6 w-full rounded-[3px] border border-[#00e5ff55] bg-[#0a0a0a] px-1.5 font-mono text-[11px] text-[#ededed] outline-none"
            />
          </div>
        )}

        {tree === null && !treeLoading && (
          <div className="px-3 py-6 text-center text-[11px] text-[#5c5c5c]">
            Workspace failed to load.
          </div>
        )}

        {tree?.length === 0 && (
          <div className="px-3 py-6 text-center text-[11px] text-[#5c5c5c]">
            Empty workspace — create your first file.
          </div>
        )}

        {tree?.map((node) => <TreeRow key={node.path} node={node} depth={0} />)}
      </div>

      <div className="flex h-6 shrink-0 items-center justify-between border-t px-3">
        <span className="font-mono text-[9px] text-[#4a4a4a]">
          {flatCount} top-level · {Object.values(expanded).filter(Boolean).length} open
        </span>
        <span className="font-mono text-[9px] text-[#00e5ff]">SANDBOXED</span>
      </div>
    </div>
  );
}
