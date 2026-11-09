export function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 64" className="size-10 shrink-0" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#1c2024" />
        <circle cx="32" cy="32" r="22" fill="#121416" stroke="#8b949e" strokeWidth="3" />
        <rect x="29" y="14" width="6" height="16" rx="3" fill="#3dff9a" />
        <circle cx="32" cy="32" r="5" fill="#121416" stroke="#d9c7a6" strokeWidth="2" />
      </svg>
      <div>
        <p className="text-[0.68rem] tracking-[0.22em] text-brass">WHAT-IF ESTIMATOR</p>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          IBIT Price Wheel
        </h1>
      </div>
    </div>
  );
}
