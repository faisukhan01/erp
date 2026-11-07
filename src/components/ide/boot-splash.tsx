"use client";

import { useEffect, useState } from "react";
import { OnyxMark } from "./onyx-mark";

/** Boot sequence — pure black, the mark draws itself, the wordmark lands. */
export function BootSplash({ done }: { done: boolean }) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const visible = !done || !minTimeElapsed;
  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030303] transition-opacity duration-500 ${
        done && minTimeElapsed ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          className="anim-draw"
          d="M12 1.5 22.5 12 12 22.5 1.5 12 12 1.5Z"
          stroke="#f2f2f2"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
        <path className="anim-draw" d="M1.5 12h21" stroke="#3a3a3a" strokeWidth="0.7" />
        <path className="anim-draw" d="M12 1.5 6 12l6 10.5" stroke="#3a3a3a" strokeWidth="0.7" />
        <path
          d="M12 1.5 18 12l-6 10.5L12 1.5Z"
          fill="#00e5ff"
          className="anim-fade"
          style={{ animationDelay: "0.9s" }}
        />
      </svg>

      <div className="mt-8 anim-fade-up" style={{ animationDelay: "0.5s" }}>
        <span className="brand-wordmark text-2xl font-semibold text-[#f2f2f2]">
          ONYX<span className="text-[#00e5ff]">.</span>
        </span>
      </div>

      <div className="mt-3 anim-fade" style={{ animationDelay: "1s" }}>
        <span className="micro-label">AI-native IDE — booting workspace</span>
      </div>

      <div className="absolute bottom-8 flex items-center gap-2 anim-fade" style={{ animationDelay: "1.2s" }}>
        <span className="h-1 w-1 rounded-full bg-[#00e5ff] anim-dot" />
        <span className="micro-label">z.ai · monaco · xterm</span>
      </div>
    </div>
  );
}
