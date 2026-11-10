"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Ban, Trash2, X } from "lucide-react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { getSocket } from "@/lib/ide/socket";
import { useIde } from "@/lib/ide/store";
import { drainPending } from "@/lib/ide/bridge";

const PROMPT = "\x1b[36m➜\x1b[0m \x1b[90m";
const PROMPT_END = "\x1b[0m \x1b[36m❯\x1b[0m ";

let execSeq = 0;
const nextId = () => `t-${Date.now().toString(36)}-${++execSeq}`;

export function TerminalPanel() {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const bufferRef = useRef("");
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const runningRef = useRef<string | null>(null);
  const cwdRef = useRef("");
  const lineCleanRef = useRef(true); // last thing written ended with a newline
  const promptShownRef = useRef(false);

  const [cwdLabel, setCwdLabel] = useState("~");
  const [running, setRunning] = useState(false);

  const relCwd = useCallback((abs: string) => {
    const m = abs.match(/ide-workspace(.*)$/);
    if (!m) return "~";
    return m[1] ? "~" + m[1] : "~";
  }, []);

  const showPrompt = useCallback(() => {
    const term = termRef.current;
    if (!term || runningRef.current) return;
    promptShownRef.current = true;
    term.write(PROMPT + relCwd(cwdRef.current) + PROMPT_END + " ");
    lineCleanRef.current = false;
  }, [relCwd]);

  const exec = useCallback((cmd: string, echo = false) => {
    const term = termRef.current;
    if (!term || runningRef.current) return;
    const id = nextId();
    runningRef.current = id;
    setRunning(true);
    if (!lineCleanRef.current) term.write("\r\n");
    if (echo) {
      // programmatic exec (Run button) — show what was launched, dimmed
      term.write(`\x1b[90m$ ${cmd}\x1b[0m\r\n`);
    }
    lineCleanRef.current = true;
    bufferRef.current = "";
    if (cmd.trim()) {
      historyRef.current.push(cmd);
      if (historyRef.current.length > 200) historyRef.current.shift();
    }
    historyIdxRef.current = -1;
    getSocket().emit("exec", { id, cmd });
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const term = new Terminal({
      fontFamily: "var(--font-mono-code), JetBrains Mono, monospace",
      fontSize: 12.5,
      lineHeight: 1.35,
      cursorBlink: true,
      cursorStyle: "bar",
      allowTransparency: true,
      convertEol: false,
      scrollback: 4000,
      theme: {
        background: "#050505",
        foreground: "#c9c9c9",
        cursor: "#00e5ff",
        cursorAccent: "#050505",
        selectionBackground: "#00e5ff2e",
        black: "#1a1a1a",
        red: "#ff5d5d",
        green: "#8be0a4",
        yellow: "#e0af68",
        blue: "#6ee7ff",
        magenta: "#c792ea",
        cyan: "#00e5ff",
        white: "#d4d4d4",
        brightBlack: "#5c5c5c",
        brightWhite: "#f2f2f2",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    try {
      fit.fit();
    } catch {
      /* first layout pending */
    }
    termRef.current = term;

    term.writeln("\x1b[90m── ONYX TERMINAL ─────────────────────────────\x1b[0m");
    term.writeln("\x1b[90mbash · sandboxed to the workspace · ctrl+c kills a job\x1b[0m");

    const socket = getSocket();

    const onData = (payload: { id: string; out?: string; err?: string; special?: string }) => {
      if (payload.special === "clear") {
        term.clear();
        lineCleanRef.current = true;
        return;
      }
      if (payload.out) {
        term.write(payload.out);
        lineCleanRef.current = payload.out.endsWith("\n");
      }
      if (payload.err) {
        term.write(payload.err);
        lineCleanRef.current = payload.err.endsWith("\n");
      }
    };

    const onExit = (payload: { id: string; code: number }) => {
      if (payload.id !== runningRef.current) return;
      if (payload.code !== 0) {
        term.write(`\x1b[90m[exit ${payload.code}]\x1b[0m`);
        lineCleanRef.current = false;
      }
      runningRef.current = null;
      setRunning(false);
      showPrompt();
    };

    const onCwd = (payload: { cwd: string }) => {
      cwdRef.current = payload.cwd;
      setCwdLabel(relCwd(payload.cwd));
      if (!promptShownRef.current && !runningRef.current) showPrompt();
    };

    socket.on("data", onData);
    socket.on("exit", onExit);
    socket.on("cwd", onCwd);

    // drain queued execs (Run button pressed while panel was closed)
    const drain = () => {
      const cmds = drainPending();
      if (cmds.length && !runningRef.current) {
        exec(cmds[cmds.length - 1], true);
      }
    };
    drain();
    window.addEventListener("onyx:term-queued", drain);

    const keyHandler = term.onData((data) => {
      // ctrl+c — kill the running job, or clear the line
      if (data === "\x03") {
        if (runningRef.current) {
          socket.emit("kill", { id: runningRef.current });
          term.write("^C");
          lineCleanRef.current = false;
        } else {
          bufferRef.current = "";
          term.write("^C\r\n");
          lineCleanRef.current = true;
          showPrompt();
        }
        return;
      }
      if (runningRef.current) return; // input locked while a job runs

      if (data === "\r") {
        const cmd = bufferRef.current;
        bufferRef.current = "";
        if (!cmd.trim()) {
          if (!lineCleanRef.current) term.write("\r\n");
          showPrompt();
          return;
        }
        exec(cmd);
        return;
      }
      if (data === "\x7f") {
        if (bufferRef.current.length > 0) {
          bufferRef.current = bufferRef.current.slice(0, -1);
          term.write("\b \b");
        }
        return;
      }
      if (data === "\x1b[A" || data === "\x1b[B") {
        const hist = historyRef.current;
        if (hist.length === 0) return;
        if (data === "\x1b[A") {
          historyIdxRef.current = Math.min(hist.length - 1, historyIdxRef.current + 1);
        } else {
          historyIdxRef.current = Math.max(-1, historyIdxRef.current - 1);
        }
        bufferRef.current = historyIdxRef.current === -1 ? "" : hist[hist.length - 1 - historyIdxRef.current];
        term.write(`\x1b[2K\r${PROMPT}${relCwd(cwdRef.current)}${PROMPT_END} ${bufferRef.current}`);
        return;
      }
      // printable characters
      if (data >= " " || data === "\t") {
        bufferRef.current += data;
        term.write(data === "\t" ? "    " : data);
      }
    });

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        /* zero-size during transition */
      }
    });
    ro.observe(host);

    // fallback prompt if the socket never connects
    const fallback = setTimeout(() => {
      if (!promptShownRef.current) showPrompt();
    }, 3000);

    return () => {
      ro.disconnect();
      clearTimeout(fallback);
      window.removeEventListener("onyx:term-queued", drain);
      term.dispose();
      termRef.current = null;
      socket.off("data", onData);
      socket.off("exit", onExit);
      socket.off("cwd", onCwd);
      runningRef.current = null;
    };
  }, [exec, showPrompt, relCwd]);

  const kill = () => {
    if (runningRef.current) getSocket().emit("kill", { id: runningRef.current });
  };

  const clear = () => {
    termRef.current?.clear();
    termRef.current?.focus();
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#050505]">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b px-3">
        <span className="micro-label">Terminal</span>
        <span className="h-3 w-px bg-[#1d1d1d]" />
        <span className="font-mono text-[10px] text-[#5c5c5c]">{cwdLabel}</span>
        {running && (
          <span className="flex items-center gap-1 font-mono text-[9px] text-[#e0af68]">
            <span className="h-1 w-1 rounded-full bg-[#e0af68] anim-dot" /> running — ctrl+c to kill
          </span>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            title="Clear"
            aria-label="Clear terminal"
            onClick={clear}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#8a8a8a] hover:bg-[#141414] hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Kill job"
            aria-label="Kill running job"
            onClick={kill}
            disabled={!running}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#8a8a8a] hover:bg-[#141414] hover:text-[#ff5d5d] disabled:opacity-30"
          >
            <Ban className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Close panel"
            aria-label="Close terminal panel"
            onClick={() => useIde.getState().togglePanel()}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#8a8a8a] hover:bg-[#141414] hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div ref={hostRef} className="terminal-host min-h-0 flex-1 overflow-hidden pl-2 pt-1" />
    </div>
  );
}
