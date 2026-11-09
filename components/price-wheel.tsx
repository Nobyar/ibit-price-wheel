"use client";

import { useId, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { pointerAngleDeg, shortestAngleDelta } from "@/lib/angle";
import { Button } from "@/components/ui/button";

export function PriceWheel({
  degrees,
  disabled,
  settle,
  percentLabel,
  valueNow,
  valueMin,
  valueMax,
  valueText,
  onDelta,
  onNudge,
  onReset,
  onCommit,
}: {
  degrees: number;
  disabled: boolean;
  settle: boolean;
  percentLabel: string;
  valueNow: number;
  valueMin: number;
  valueMax: number;
  valueText: string;
  onDelta: (deltaDeg: number) => void;
  onNudge: (percent: number) => void;
  onReset: () => void;
  onCommit: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; last: number; moved: boolean } | null>(null);
  const shadowId = `${useId().replace(/:/g, "")}-shadow`;

  const angleOf = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return pointerAngleDeg(
      event.clientX,
      event.clientY,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    drag.current = { pointerId: event.pointerId, last: angleOf(event), moved: false };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // jsdom does not implement pointer capture.
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId || disabled) return;
    const next = angleOf(event);
    const delta = shortestAngleDelta(current.last, next);
    current.last = next;
    if (delta !== 0) {
      current.moved = true;
      onDelta(delta);
    }
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    if (current.moved) onCommit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const coarse = event.shiftKey;
    const step = coarse ? 1 : 0.1;
    if (event.key === "ArrowUp" || event.key === "ArrowRight" || event.key === "+" || event.key === "=") {
      event.preventDefault();
      onNudge(step);
    } else if (
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft" ||
      event.key === "-" ||
      event.key === "_"
    ) {
      event.preventDefault();
      onNudge(-step);
    } else if (event.key === "Home") {
      event.preventDefault();
      onReset();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={ref}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Hypothetical Bitcoin price"
        aria-valuemin={valueMin}
        aria-valuemax={valueMax}
        aria-valuenow={valueNow}
        aria-valuetext={valueText}
        aria-describedby="dial-instructions"
        aria-keyshortcuts="ArrowUp ArrowDown Shift+ArrowUp Shift+ArrowDown Home"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        data-testid="dial"
        className={`dial relative aspect-square w-[min(100%,380px)] touch-none select-none rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-phosphor ${
          disabled ? "cursor-not-allowed opacity-70" : "cursor-grab active:cursor-grabbing"
        }`}
      >
        <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden="true">
          <defs>
            <radialGradient id={`${shadowId}-face`} cx="38%" cy="32%" r="70%">
              <stop offset="0%" stopColor="#4a545e" />
              <stop offset="58%" stopColor="#1c2228" />
              <stop offset="100%" stopColor="#0c0e10" />
            </radialGradient>
            <radialGradient id={`${shadowId}-housing`} cx="35%" cy="28%" r="75%">
              <stop offset="0%" stopColor="#6a737c" />
              <stop offset="42%" stopColor="#2a3138" />
              <stop offset="100%" stopColor="#090b0d" />
            </radialGradient>
            <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="12" stdDeviation="8" floodColor="#000" floodOpacity="0.5" />
            </filter>
          </defs>
          <circle cx="200" cy="200" r="188" fill={`url(#${shadowId}-housing)`} filter={`url(#${shadowId})`} />
          <circle cx="200" cy="200" r="176" fill="none" stroke="#0c0e10" strokeWidth="10" />
          {Array.from({ length: 24 }, (_, index) => (
            <line
              key={index}
              x1="200"
              y1="16"
              x2="200"
              y2={index % 2 === 0 ? 30 : 25}
              stroke="#d9c7a6"
              strokeOpacity={index % 2 === 0 ? 0.75 : 0.35}
              strokeWidth={index % 2 === 0 ? 2 : 1}
              strokeLinecap="round"
              transform={`rotate(${index * 15} 200 200)`}
            />
          ))}
          <g
            className="knob-rotor"
            style={{
              transform: `rotate(${degrees}deg)`,
              transition: settle ? "transform 140ms linear" : "none",
            }}
          >
            <circle cx="200" cy="200" r="158" fill={`url(#${shadowId}-face)`} />
            <circle cx="200" cy="200" r="158" fill="none" stroke="#111418" strokeWidth="2" />
            {Array.from({ length: 60 }, (_, index) => (
              <rect
                key={index}
                x="196.5"
                y="44"
                width="7"
                height="18"
                rx="1.4"
                fill={index % 2 === 0 ? "#9aa3ad" : "#2a3138"}
                transform={`rotate(${index * 6} 200 200)`}
              />
            ))}
            <rect x="193" y="62" width="14" height="52" rx="7" fill="#3dff9a" />
            <rect x="196.5" y="66" width="7" height="18" rx="3.5" fill="#f3fff8" opacity="0.85" />
            <circle cx="200" cy="200" r="62" fill="#101214" stroke="#3a424a" strokeWidth="4" />
          </g>
          <polygon points="200,6 188,26 212,26" fill="#d9c7a6" />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex w-[7.5rem] flex-col items-center text-center">
            <span className="text-[0.62rem] tracking-[0.18em] text-brass">
              {disabled ? "SET BASE" : "CHANGE"}
            </span>
            <span className="text-glow font-mono text-lg text-phosphor sm:text-xl">{percentLabel}</span>
          </div>
        </div>
      </div>
      <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-2 px-1">
        <Button type="button" variant="outline" className="min-h-11 px-3" disabled={disabled} onClick={() => onNudge(-1)}>
          −1%
        </Button>
        <Button type="button" variant="outline" className="min-h-11 px-3" disabled={disabled} onClick={() => onNudge(-0.1)}>
          −0.1%
        </Button>
        <Button type="button" className="min-h-11 px-4" disabled={disabled} onClick={onReset}>
          Reset
        </Button>
        <Button type="button" variant="outline" className="min-h-11 px-3" disabled={disabled} onClick={() => onNudge(0.1)}>
          +0.1%
        </Button>
        <Button type="button" variant="outline" className="min-h-11 px-3" disabled={disabled} onClick={() => onNudge(1)}>
          +1%
        </Button>
      </div>
      <p id="dial-instructions" className="max-w-sm text-center text-xs leading-5 text-muted-foreground">
        Drag clockwise to raise Bitcoin and counterclockwise to lower it. Arrow keys change 0.1%.
        Shift plus an arrow changes 1%. Home resets to the baseline.
      </p>
    </div>
  );
}
