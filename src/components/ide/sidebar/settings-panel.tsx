"use client";

import { useIde } from "@/lib/ide/store";
import { Switch } from "@/components/ui/switch";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div>
        <p className="text-[12px] text-[#d4d4d4]">{label}</p>
        {hint && <p className="mt-0.5 font-mono text-[9.5px] text-[#5c5c5c]">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsPanel() {
  const settings = useIde((s) => s.settings);
  const setSetting = useIde((s) => s.setSetting);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center border-b px-3">
        <span className="micro-label">Settings</span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#111]">
        <div className="py-1">
          <p className="micro-label px-3 pb-1 pt-2">Editor</p>
          <Row label="Font size" hint={`${settings.fontSize}px`}>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSetting("fontSize", Math.max(10, settings.fontSize - 1))}
                className="h-6 w-6 rounded-[4px] border font-mono text-[11px] text-[#8a8a8a] hover:text-white"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setSetting("fontSize", Math.min(20, settings.fontSize + 1))}
                className="h-6 w-6 rounded-[4px] border font-mono text-[11px] text-[#8a8a8a] hover:text-white"
              >
                +
              </button>
            </div>
          </Row>
          <Row label="Tab size" hint="spaces per indentation">
            <div className="flex gap-1">
              {[2, 4, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSetting("tabSize", n)}
                  className={`h-6 w-7 rounded-[4px] border font-mono text-[11px] transition-colors ${
                    settings.tabSize === n
                      ? "border-[#00e5ff55] text-[#00e5ff]"
                      : "text-[#8a8a8a] hover:text-white"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Word wrap">
            <Switch
              checked={settings.wordWrap}
              onCheckedChange={(v) => setSetting("wordWrap", v)}
            />
          </Row>
          <Row label="Line numbers">
            <Switch
              checked={settings.lineNumbers}
              onCheckedChange={(v) => setSetting("lineNumbers", v)}
            />
          </Row>
          <Row label="Minimap">
            <Switch
              checked={settings.minimap}
              onCheckedChange={(v) => setSetting("minimap", v)}
            />
          </Row>
        </div>

        <div className="py-1">
          <p className="micro-label px-3 pb-1 pt-2">Keybindings</p>
          {[
            ["⌘K / ⌘P", "Command palette & files"],
            ["⌘S", "Save file"],
            ["⌘B", "Toggle sidebar"],
            ["Ctrl+`", "Toggle terminal"],
            ["⌘L", "Toggle Onyx AI"],
          ].map(([keys, desc]) => (
            <div key={keys} className="flex items-center justify-between px-3 py-2">
              <span className="text-[12px] text-[#8a8a8a]">{desc}</span>
              <kbd className="rounded-[3px] border bg-[#101010] px-1.5 py-px font-mono text-[9.5px] text-[#b3b3b3]">
                {keys}
              </kbd>
            </div>
          ))}
        </div>

        <div className="py-1">
          <p className="micro-label px-3 pb-1 pt-2">About</p>
          <div className="px-3 py-2 font-mono text-[10.5px] leading-relaxed text-[#5c5c5c]">
            <p className="text-[#a3a3a3]">ONYX IDE 1.0</p>
            <p>machined-black · ai-native</p>
            <p>Next.js 16 · Monaco · xterm · socket.io</p>
            <p>brain: Z.AI</p>
          </div>
        </div>
      </div>
    </div>
  );
}
