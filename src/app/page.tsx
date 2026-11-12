"use client";

import dynamic from "next/dynamic";

const OnyxIDE = dynamic(() => import("@/components/ide/onyx-ide").then((m) => m.OnyxIDE), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-[#030303]">
      <span className="micro-label anim-dot">onyx</span>
    </div>
  ),
});

export default function Page() {
  return <OnyxIDE />;
}
