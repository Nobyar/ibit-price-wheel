"use client";

import { forwardRef, useEffect, useId, useRef, type KeyboardEvent, type Ref } from "react";
import { Button } from "@/components/ui/button";
import { useWheelDrag, type PriceWheelHandle } from "@/components/use-wheel-drag";

export type { PriceWheelHandle };

export const PriceWheel = forwardRef(function PriceWheel(
  {
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
    onDelta: (deltaDeg: number) => number | void;
    onNudge: (percent: number) => void;
    onReset: () => void;
    onCommit: () => void;
  },
  ref: Ref<PriceWheelHandle>,
) {
  const shadowId = `${useId().replace(/:/g, "")}-shadow`;
  const previousDegrees = useRef(degrees);
  const degreeStep = degrees - previousDegrees.current;
  useEffect(() => {
    previousDegrees.current = degrees;
  }, [degrees]);

  const { dialRef, rotorRef, tracking, onPointerDown, onLostPointerCapture, cancelMotion } = useWheelDrag({
    disabled,
    onDelta,
    onCommit,
    ref,
  });

  const animate = settle && !tracking && Math.abs(degreeStep) <= 90;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const coarse = event.shiftKey;
    const step = coarse ? 1 : 0.1;
    if (event.key === "ArrowUp" || event.key === "ArrowRight" || event.key === "+" || event.key === "=") {
      event.preventDefault();
      cancelMotion();
      onNudge(step);
    } else if (
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft" ||
      event.key === "-" ||
      event.key === "_"
    ) {
      event.preventDefault();
      cancelMotion();
      onNudge(-step);
    } else if (event.key === "Home") {
      event.preventDefault();
      cancelMotion();
      onReset();
    }
  };

  const nudge = (percent: number) => {
    cancelMotion();
    onNudge(percent);
  };

  const reset = () => {
    cancelMotion();
    onReset();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={dialRef}
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
        onLostPointerCapture={onLostPointerCapture}
        onKeyDown={onKeyDown}
        data-testid="dial"
        className={`dial relative aspect-square w-[min(100%,380px)] bg-transparent touch-none select-none rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-phosphor ${
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
          <polygon points="200,6 188,26 212,26" fill="#d9c7a6" />
        </svg>
        <div
          ref={rotorRef}
          className={`knob-rotor pointer-events-none absolute inset-0 ${tracking ? "will-change-transform" : ""}`}
          style={{
            transform: `rotate(${degrees}deg)`,
            transition: animate ? "transform 140ms linear" : "none",
          }}
        >
          <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden="true">
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
          </svg>
        </div>
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
        <Button type="button" variant="outline" className="min-h-11 px-3" disabled={disabled} onClick={() => nudge(-1)}>
          −1%
        </Button>
        <Button type="button" variant="outline" className="min-h-11 px-3" disabled={disabled} onClick={() => nudge(-0.1)}>
          −0.1%
        </Button>
        <Button type="button" className="min-h-11 px-4" disabled={disabled} onClick={reset}>
          Reset
        </Button>
        <Button type="button" variant="outline" className="min-h-11 px-3" disabled={disabled} onClick={() => nudge(0.1)}>
          +0.1%
        </Button>
        <Button type="button" variant="outline" className="min-h-11 px-3" disabled={disabled} onClick={() => nudge(1)}>
          +1%
        </Button>
      </div>
      <p id="dial-instructions" className="max-w-sm text-center text-xs leading-5 text-muted-foreground">
        Drag clockwise to raise Bitcoin and counterclockwise to lower it. Scrolling over the dial turns it
        too. Arrow keys change 0.1%. Shift plus an arrow changes 1%. Home resets to the baseline.
      </p>
    </div>
  );
});
