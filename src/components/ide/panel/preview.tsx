"use client";

import { useCallback, useState } from "react";
import { ExternalLink, MonitorPlay, RotateCw, X } from "lucide-react";
import { useIde } from "@/lib/ide/store";

/* index.html explicitly — skips Next.js's trailing-slash 308, which would
 * break relative asset resolution inside the iframe. */
const PREVIEW_URL = "/api/ide/preview/index.html";

/**
 * Live preview — an iframe pointed at the workspace preview server.
 * Any file write (editor save, terminal, or Onyx AI agent) bumps
 * `previewRev`, which remounts the iframe for an instant refresh; the
 * served pages also self-poll as a safety net.
 */
export function PreviewPane({ onClose }: { onClose?: () => void }) {
  const previewRev = useIde((s) => s.previewRev);
  const bumpPreview = useIde((s) => s.bumpPreview);
  const [nudge, setNudge] = useState(false);

  const reload = useCallback(() => {
    setNudge(true);
    setTimeout(() => setNudge(false), 450);
    bumpPreview();
  }, [bumpPreview]);

  const openExternal = useCallback(() => {
    window.open(PREVIEW_URL, "_blank", "noopener");
  }, []);

  return (
    <section className="flex h-full min-w-0 flex-col bg-[#050505]" aria-label="Live preview">
      {/* toolbar */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b bg-[#060606] px-2.5">
        <MonitorPlay className="h-3.5 w-3.5 shrink-0 text-[#00e5ff]" />
        <span className="micro-label">Live Preview</span>
        <span className="hidden min-w-0 items-center gap-1 rounded-[4px] border bg-[#0a0a0a] px-2 py-px md:flex">
          <span className="font-mono text-[9.5px] text-[#00e5ff]">localhost</span>
          <span className="truncate font-mono text-[9.5px] text-[#5c5c5c]">/api/ide/preview/</span>
        </span>

        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            title="Reload preview"
            aria-label="Reload preview"
            onClick={reload}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#8a8a8a] hover:bg-[#141414] hover:text-white"
          >
            <RotateCw className={`h-3 w-3 ${nudge ? "anim-spin-once" : ""}`} />
          </button>
          <button
            type="button"
            title="Open preview in a new tab"
            aria-label="Open preview in a new tab"
            onClick={openExternal}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#8a8a8a] hover:bg-[#141414] hover:text-white"
          >
            <ExternalLink className="h-3 w-3" />
          </button>
          {onClose && (
            <button
              type="button"
              title="Close preview"
              aria-label="Close preview"
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#8a8a8a] hover:bg-[#141414] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* the served workspace */}
      <div className="min-h-0 flex-1 bg-[#0a0a0a]">
        <iframe
          key={previewRev}
          src={PREVIEW_URL}
          title="Live preview of the workspace"
          className="h-full w-full border-0 bg-white"
        />
      </div>
    </section>
  );
}
