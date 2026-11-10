"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowDownUp, CaseSensitive, Regex, Search } from "lucide-react";
import * as api from "@/lib/ide/api";
import { useIde } from "@/lib/ide/store";
import { fileGlyph } from "@/lib/ide/langs";
import type { SearchHit } from "@/lib/ide/types";

export function SearchPanel() {
  const openFile = useIde((s) => s.openFile);
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regex, setRegex] = useState(false);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(
    async (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!q.trim()) {
        setHits(null);
        setError("");
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setBusy(true);
        setError("");
        try {
          setHits(await api.searchWorkspace(q, { caseSensitive, regex }));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Search failed");
          setHits([]);
        } finally {
          setBusy(false);
        }
      }, 260);
    },
    [caseSensitive, regex]
  );

  const grouped = hits
    ? hits.reduce<Record<string, SearchHit[]>>((acc, h) => {
        (acc[h.path] ??= []).push(h);
        return acc;
      }, {})
    : null;

  const toggle = (setter: (b: boolean) => void, value: boolean) => (
    <button
      type="button"
      onClick={() => {
        setter(!value);
        if (query.trim()) run(query);
      }}
      className={`flex h-6 w-6 items-center justify-center rounded-[4px] transition-colors ${
        value ? "bg-[#141414] text-[#00e5ff]" : "text-[#5c5c5c] hover:text-[#a3a3a3]"
      }`}
    >
      {value && <span className="absolute" />}
      {setter === setCaseSensitive ? (
        <CaseSensitive className="h-3.5 w-3.5" />
      ) : (
        <Regex className="h-3.5 w-3.5" />
      )}
    </button>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-3">
        <span className="micro-label">Search</span>
        <ArrowDownUp className="h-3.5 w-3.5 text-[#4a4a4a]" />
      </div>

      <div className="border-b p-2.5">
        <div className="flex items-center gap-1.5 rounded-[5px] border bg-[#0a0a0a] px-2 focus-within:border-[#00e5ff55]">
          <Search className="h-3.5 w-3.5 shrink-0 text-[#5c5c5c]" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              run(e.target.value);
            }}
            placeholder="Find in workspace…"
            className="h-8 flex-1 bg-transparent font-mono text-[12px] text-[#ededed] outline-none placeholder:text-[#4a4a4a]"
            aria-label="Search query"
          />
          <div className="relative flex items-center gap-0.5">
            {toggle(setCaseSensitive, caseSensitive)}
            {toggle(setRegex, regex)}
          </div>
        </div>
        {hits && (
          <p className="mt-1.5 px-0.5 font-mono text-[10px] text-[#5c5c5c]">
            {busy ? "searching…" : `${hits.length} result${hits.length === 1 ? "" : "s"}`}
          </p>
        )}
        {error && <p className="mt-1.5 px-0.5 font-mono text-[10px] text-[#ff5d5d]">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto">
        {grouped &&
          Object.entries(grouped).map(([path, fileHits]) => {
            const g = fileGlyph(path.split("/").pop() ?? "");
            return (
              <div key={path}>
                <div className="flex items-center gap-1.5 bg-[#080808] px-2.5 py-1.5">
                  <span className="font-mono text-[9px] font-bold" style={{ color: g.color }}>
                    {g.glyph}
                  </span>
                  <span className="truncate font-mono text-[11px] text-[#d4d4d4]">{path}</span>
                  <span className="ml-auto rounded-full bg-[#141414] px-1.5 font-mono text-[9px] text-[#8a8a8a]">
                    {fileHits.length}
                  </span>
                </div>
                {fileHits.map((hit, i) => (
                  <button
                    key={`${path}:${hit.line}:${i}`}
                    type="button"
                    onClick={() => openFile(hit.path).catch(() => undefined)}
                    className="flex w-full items-baseline gap-2 px-2.5 py-1 pl-5 text-left transition-colors hover:bg-[#0e0e0e]"
                  >
                    <span className="w-8 shrink-0 text-right font-mono text-[10px] text-[#4a4a4a]">
                      {hit.line}
                    </span>
                    <span className="truncate font-mono text-[11px] text-[#a3a3a3]">
                      {hit.text.trim()}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}

        {hits?.length === 0 && !busy && (
          <p className="px-3 py-6 text-center text-[11px] text-[#5c5c5c]">No matches.</p>
        )}
      </div>
    </div>
  );
}
