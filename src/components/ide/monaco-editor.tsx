"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Editor, loader, type Monaco } from "@monaco-editor/react";
import type * as monaco from "monaco-editor";
import { useIde } from "@/lib/ide/store";
import { languageOf } from "@/lib/ide/langs";

loader.config({ paths: { vs: "/monaco/vs" } });

/* Ambient runtime globals so a bare workspace doesn't drown in squiggles */
const AMBIENT_LIBS = `
declare var process: { stdout: { write(s: string): void }; stderr: { write(s: string): void }; argv: string[]; env: Record<string, string | undefined> };
declare var console: { log(...args: unknown[]): void; error(...args: unknown[]): void; warn(...args: unknown[]): void; info(...args: unknown[]): void };
declare function setTimeout(cb: (...args: unknown[]) => void, ms?: number): number;
declare function setInterval(cb: (...args: unknown[]) => void, ms?: number): number;
declare function clearTimeout(id?: number): void;
declare function clearInterval(id?: number): void;
`;

/* Self-hosted workers: the worker is booted from a blob URL, where relative
 * imports would fail — wrap workerMain with an absolute origin instead.
 * The worker-side AMD loader resolves module ids ("vs/...") against this
 * baseUrl, so it must point at the parent of the "vs" directory. */
if (typeof window !== "undefined") {
  (window as { MonacoEnvironment?: unknown }).MonacoEnvironment = {
    getWorkerUrl() {
      const base = `${window.location.origin}/monaco/`;
      const bootstrap = `self.MonacoEnvironment={baseUrl:'${base}'};importScripts('${base}vs/base/worker/workerMain.js');`;
      return URL.createObjectURL(new Blob([bootstrap], { type: "text/javascript" }));
    },
  };
}

const THEME_RULES: Array<{ token: string; foreground: string; fontStyle?: string }> = [
  { token: "", foreground: "d4d4d4" },
  { token: "comment", foreground: "4f4f4f", fontStyle: "italic" },
  { token: "keyword", foreground: "6ee7ff" },
  { token: "keyword.control", foreground: "6ee7ff" },
  { token: "string", foreground: "d8b688" },
  { token: "string.escape", foreground: "eb9c62" },
  { token: "number", foreground: "eb9c62" },
  { token: "regexp", foreground: "eb9c62" },
  { token: "type", foreground: "ffd9a0" },
  { token: "type.identifier", foreground: "ffd9a0" },
  { token: "identifier", foreground: "d4d4d4" },
  { token: "function", foreground: "ececec" },
  { token: "delimiter", foreground: "6a6a6a" },
  { token: "operator", foreground: "8a8a8a" },
  { token: "tag", foreground: "ff8f6b" },
  { token: "attribute.name", foreground: "6ee7ff" },
  { token: "attribute.value", foreground: "d8b688" },
  { token: "metatag", foreground: "6ee7ff" },
];

function defineTheme(monaco: Monaco) {
  const ts = monaco.languages.typescript;
  if (ts) {
    ts.typescriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      allowNonTsExtensions: true,
      esModuleInterop: true,
      skipLibCheck: true,
      lib: ["esnext", "dom"],
    });
    ts.typescriptDefaults.setEagerModelSync(true);
    ts.javascriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      checkJs: false,
    });
    ts.typescriptDefaults.addExtraLib(AMBIENT_LIBS, "onyx-globals.d.ts");
    ts.javascriptDefaults.addExtraLib(AMBIENT_LIBS, "onyx-globals.d.ts");
  }
  monaco.editor.defineTheme("onyx", {
    base: "vs-dark",
    inherit: true,
    rules: THEME_RULES,
    colors: {
      "editor.background": "#050505",
      "editor.foreground": "#d4d4d4",
      "editorLineNumber.foreground": "#2e2e2e",
      "editorLineNumber.activeForeground": "#8a8a8a",
      "editorCursor.foreground": "#00e5ff",
      "editor.selectionBackground": "#00e5ff22",
      "editor.inactiveSelectionBackground": "#00e5ff14",
      "editor.lineHighlightBackground": "#0c0c0c",
      "editor.lineHighlightBorder": "#00000000",
      "editorIndentGuide.background1": "#151515",
      "editorIndentGuide.activeBackground1": "#2a2a2a",
      "editorWhitespace.foreground": "#1d1d1d",
      "editorWidget.background": "#0b0b0b",
      "editorWidget.border": "#1d1d1d",
      "editorSuggestWidget.background": "#0b0b0b",
      "editorSuggestWidget.border": "#1d1d1d",
      "editorSuggestWidget.selectedBackground": "#161616",
      "editorHoverWidget.background": "#0b0b0b",
      "editorHoverWidget.border": "#1d1d1d",
      "editorGutter.background": "#050505",
      "editorBracketMatch.background": "#00e5ff14",
      "editorBracketMatch.border": "#00e5ff44",
      "scrollbarSlider.background": "#23232366",
      "scrollbarSlider.hoverBackground": "#33333388",
      "scrollbarSlider.activeBackground": "#00e5ff33",
      "editorOverviewRuler.border": "#00000000",
      "minimap.background": "#050505",
      "editorError.foreground": "#ff5d5d",
      "editorWarning.foreground": "#e0af68",
      "editorUnnecessaryCode.opacity": "#00000055",
    },
  });
  monaco.editor.setTheme("onyx");
}

export function OnyxMonaco() {
  const activePath = useIde((s) => s.activePath);
  const contents = useIde((s) => s.contents);
  const settings = useIde((s) => s.settings);
  const editorRef = useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const modelsRef = useRef<Map<string, import("monaco-editor").editor.ITextModel>>(new Map());
  const applyingRef = useRef(false);
  const [monacoReady, setMonacoReady] = useState(false);

  const content = activePath ? contents[activePath] : undefined;

  const options = useMemo<import("monaco-editor").editor.IStandaloneEditorConstructionOptions>(
    () => ({
      fontSize: settings.fontSize,
      tabSize: settings.tabSize,
      wordWrap: settings.wordWrap ? "on" : "off",
      minimap: { enabled: settings.minimap, size: "fill", renderCharacters: false },
      lineNumbers: settings.lineNumbers ? "on" : "off",
      fontFamily: "var(--font-mono-code), JetBrains Mono, monospace",
      fontLigatures: true,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      smoothScrolling: true,
      scrollBeyondLastLine: false,
      padding: { top: 10, bottom: 24 },
      renderLineHighlight: "all",
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      automaticLayout: true,
      fixedOverflowWidgets: true,
      scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8, useShadows: false },
      overviewRulerLanes: 0,
      stickyScroll: { enabled: false },
      contextmenu: true,
    }),
    [settings]
  );

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    defineTheme(monaco);
    setMonacoReady(true);

    editor.onDidChangeCursorPosition((e) => {
      useIde.getState().setCursor(e.position.lineNumber, e.position.column);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      useIde.getState().saveActive().catch(() => undefined);
    });
  };

  /* swap model when the active tab changes (or when the editor finishes mounting) */
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !monacoReady) return;
    if (!activePath || content === undefined) return;

    let model = modelsRef.current.get(activePath);
    if (!model || model.isDisposed()) {
      model = monaco.editor.createModel(content, languageOf(activePath.split("/").pop() ?? ""));
      modelsRef.current.set(activePath, model);
      model.onDidChangeContent(() => {
        if (applyingRef.current) return;
        useIde.getState().setContent(activePath, model!.getValue());
      });
    }
    if (editor.getModel() !== model) editor.setModel(model);
  }, [activePath, content, monacoReady]);

  /* external content sync (AI apply) — only when different from editor state */
  useEffect(() => {
    const model = activePath ? modelsRef.current.get(activePath) : null;
    if (!model || content === undefined) return;
    if (model.getValue() !== content) {
      applyingRef.current = true;
      model.setValue(content);
      applyingRef.current = false;
    }
  }, [activePath, content]);

  useEffect(() => {
    const map = modelsRef.current;
    return () => {
      map.forEach((m) => m.dispose());
      map.clear();
    };
  }, []);

  if (!activePath || content === undefined) return null;

  return (
    <Editor
      height="100%"
      theme="onyx"
      options={options}
      onMount={handleMount}
      loading={
        <div className="flex h-full items-center justify-center">
          <span className="micro-label anim-dot">loading editor</span>
        </div>
      }
    />
  );
}
