"use client";

import { useEffect, useMemo } from "react";
import {
  Bot,
  FilePlus,
  Files,
  GitCommitHorizontal,
  MonitorPlay,
  Play,
  RefreshCw,
  Save,
  SquareTerminal,
  Trash2,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { toast } from "sonner";
import { useIde } from "@/lib/ide/store";
import { clearTerminal, runForPath } from "@/lib/ide/bridge";
import { fileGlyph } from "@/lib/ide/langs";
import type { FileNode } from "@/lib/ide/types";

function flatten(nodes: FileNode[], trail: string[] = []): { path: string; name: string }[] {
  const out: { path: string; name: string }[] = [];
  for (const n of nodes) {
    if (n.type === "dir") {
      out.push(...flatten(n.children ?? [], [...trail, n.name]));
    } else {
      const p = [...trail, n.name].join("/");
      out.push({ path: p, name: n.name });
    }
  }
  return out;
}

export function CommandPalette() {
  const open = useIde((s) => s.paletteOpen);
  const setOpen = useIde((s) => s.setPaletteOpen);
  const tree = useIde((s) => s.tree);

  const files = useMemo(() => (tree ? flatten(tree) : []), [tree]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        useIde.getState().setPaletteOpen(!useIde.getState().paletteOpen);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  const run = (action: () => void) => {
    setOpen(false);
    // let the dialog close before side effects
    setTimeout(action, 30);
  };

  const save = async () =>
    run(() => {
      useIde
        .getState()
        .saveActive()
        .then(() => {
          toast.success("Saved", { duration: 1200 });
          useIde.getState().loadGit();
        })
        .catch(() => toast.error("Save failed"));
    });

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      className="border-[#1d1d1d] bg-[#0b0b0b] [&_[cmdk-group-heading]]:text-[#5c5c5c]"
    >
      <CommandInput placeholder="Type a command or search files…" className="font-mono text-[12px]" />
      <CommandList className="max-h-[380px]">
        <CommandEmpty className="py-6 text-center font-mono text-[11px] text-[#5c5c5c]">
          nothing matches.
        </CommandEmpty>

        <CommandGroup heading="Commands">
          <CommandItem onSelect={() => run(() => useIde.getState().setSidebarView("explorer"))} className="font-mono text-[12px]">
            <FilePlus className="mr-2 h-3.5 w-3.5 text-[#6ee7ff]" /> New file — open explorer
          </CommandItem>
          <CommandItem onSelect={save} className="font-mono text-[12px]">
            <Save className="mr-2 h-3.5 w-3.5 text-[#6ee7ff]" /> Save active file
          </CommandItem>
          <CommandItem
            onSelect={() =>
              run(() => {
                const p = useIde.getState().activePath;
                if (!p) return toast("No file open");
                runForPath(p);
                if (!useIde.getState().panelOpen) useIde.getState().togglePanel();
              })
            }
            className="font-mono text-[12px]"
          >
            <Play className="mr-2 h-3.5 w-3.5 fill-[#6ee7ff] text-[#6ee7ff]" /> Run active file
          </CommandItem>
          <CommandItem
            onSelect={() =>
              run(() => {
                useIde.getState().setSidebarView("git");
                useIde.getState().loadGit();
              })
            }
            className="font-mono text-[12px]"
          >
            <GitCommitHorizontal className="mr-2 h-3.5 w-3.5 text-[#6ee7ff]" /> Commit changes — open git
          </CommandItem>
          <CommandItem onSelect={() => run(() => useIde.getState().togglePanel())} className="font-mono text-[12px]">
            <SquareTerminal className="mr-2 h-3.5 w-3.5 text-[#6ee7ff]" /> Toggle terminal
          </CommandItem>
          <CommandItem onSelect={() => run(() => useIde.getState().toggleSidebar())} className="font-mono text-[12px]">
            <Files className="mr-2 h-3.5 w-3.5 text-[#6ee7ff]" /> Toggle sidebar
          </CommandItem>
          <CommandItem onSelect={() => run(() => useIde.getState().toggleChat())} className="font-mono text-[12px]">
            <Bot className="mr-2 h-3.5 w-3.5 text-[#6ee7ff]" /> Toggle Onyx AI
          </CommandItem>
          <CommandItem onSelect={() => run(() => useIde.getState().togglePreview())} className="font-mono text-[12px]">
            <MonitorPlay className="mr-2 h-3.5 w-3.5 text-[#6ee7ff]" /> Toggle live preview
          </CommandItem>
          <CommandItem onSelect={() => run(() => clearTerminal())} className="font-mono text-[12px]">
            <Trash2 className="mr-2 h-3.5 w-3.5 text-[#6ee7ff]" /> Clear terminal
          </CommandItem>
          <CommandItem
            onSelect={() =>
              run(() => {
                useIde.getState().loadTree(true);
                useIde.getState().loadGit();
                toast("Workspace refreshed");
              })
            }
            className="font-mono text-[12px]"
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5 text-[#6ee7ff]" /> Refresh workspace
          </CommandItem>
        </CommandGroup>

        {files.length > 0 && (
          <>
            <CommandSeparator className="bg-[#1a1a1a]" />
            <CommandGroup heading={`Files — ${files.length}`}>
              {files.slice(0, 200).map((f) => {
                const g = fileGlyph(f.name);
                return (
                  <CommandItem
                    key={f.path}
                    value={`${f.path} ${f.name}`}
                    onSelect={() => run(() => useIde.getState().openFile(f.path).catch(() => undefined))}
                    className="font-mono text-[12px]"
                  >
                    <span className="mr-2 w-4 shrink-0 text-center text-[9px] font-bold" style={{ color: g.color }}>
                      {g.glyph}
                    </span>
                    <span className="text-[#d4d4d4]">{f.name}</span>
                    <span className="ml-auto text-[10px] text-[#5c5c5c]">{f.path}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
