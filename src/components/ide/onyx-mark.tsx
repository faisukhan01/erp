/* ONYX — the machined diamond mark. One line of cyan, the rest steel. */

export function OnyxMark({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 1.5 22.5 12 12 22.5 1.5 12 12 1.5Z"
        stroke="#3a3a3a"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M1.5 12h21" stroke="#3a3a3a" strokeWidth="1.1" />
      <path d="M12 1.5 6 12l6 10.5" stroke="#262626" strokeWidth="1.1" />
      <path d="M12 1.5 18 12l-6 10.5L12 1.5Z" fill="#00e5ff" fillOpacity="0.9" />
      <path d="M12 1.5 18 12l-6 10.5" stroke="#8df3ff" strokeWidth="1" />
    </svg>
  );
}

export function OnyxWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-wordmark font-semibold text-[13px] text-[#f2f2f2] ${className}`}>
      ONYX
      <span className="text-[#00e5ff]">.</span>
    </span>
  );
}
