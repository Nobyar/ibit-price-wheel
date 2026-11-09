"use client";

import { useEffect, useImperativeHandle, useRef, useState, type PointerEvent as ReactPointerEvent, type Ref } from "react";
import {
  DRAG_DEAD_ZONE_RATIO,
  INERTIA_STOP_DEG_PER_SEC,
  applyDragSample,
  createDragTrack,
  integrateInertia,
  releaseSpeed,
  wheelDeltaToDegrees,
  type DragTrack,
} from "@/lib/angle";

export type PriceWheelHandle = {
  cancelMotion: () => void;
};

type Sample = { x: number; y: number; t: number };

type Session = {
  pointerId: number;
  track: DragTrack;
  moved: boolean;
  history: { t: number; deltaDeg: number }[];
  cx: number;
  cy: number;
};

type Geometry = { cx: number; cy: number; deadZone: number; ok: boolean };

type Machine = {
  down: (event: ReactPointerEvent<HTMLDivElement>) => void;
  lostCapture: (event: ReactPointerEvent<HTMLDivElement>) => void;
  cancel: () => void;
};

function geometryOf(node: HTMLElement): Geometry {
  const rect = node.getBoundingClientRect();
  const half = Math.min(rect.width, rect.height) / 2;
  return {
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
    deadZone: half * DRAG_DEAD_ZONE_RATIO,
    ok: half > 1,
  };
}

function prefersReducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function eventTime(event: { timeStamp: number }) {
  return event.timeStamp > 0 ? event.timeStamp : performance.now();
}

function samplesFrom(event: PointerEvent): Sample[] {
  const listed = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];
  const list = listed.length > 0 ? listed : [event];
  const fallback = eventTime(event);
  return list.map((entry) => ({
    x: entry.clientX,
    y: entry.clientY,
    t: entry.timeStamp > 0 ? entry.timeStamp : fallback,
  }));
}

export function useWheelDrag({
  disabled,
  onDelta,
  onCommit,
  ref,
}: {
  disabled: boolean;
  onDelta: (deltaDeg: number) => number | void;
  onCommit: () => void;
  ref?: Ref<PriceWheelHandle>;
}) {
  const dialRef = useRef<HTMLDivElement>(null);
  const rotorRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ onDelta, onCommit, disabled });
  const machineRef = useRef<Machine | null>(null);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    propsRef.current = { onDelta, onCommit, disabled };
  });

  useEffect(() => {
    const motion = {
      session: null as Session | null,
      queue: [] as Sample[],
      wheelPending: 0,
      raf: 0,
      inertia: 0,
      wheelTimer: 0,
      lastDegrees: null as number | null,
    };
    let mounted = true;

    const paint = (degrees: number) => {
      const rotor = rotorRef.current;
      if (!rotor) return;
      rotor.style.transform = `rotate(${degrees}deg)`;
    };

    const publish = (delta: number) => {
      if (!Number.isFinite(delta) || delta === 0) return null;
      const applied = propsRef.current.onDelta(delta);
      if (typeof applied !== "number" || !Number.isFinite(applied)) return null;
      motion.lastDegrees = applied;
      paint(applied);
      return applied;
    };

    const lockPageScroll = (locked: boolean) => {
      document.documentElement.classList.toggle("dial-dragging", locked);
    };

    const track = (active: boolean) => {
      if (!mounted) return;
      setTracking(active);
    };

    const releaseCapture = (pointerId: number) => {
      const node = dialRef.current;
      if (!node) return;
      try {
        if (!node.hasPointerCapture?.(pointerId)) return;
        node.releasePointerCapture(pointerId);
      } catch {
        // jsdom does not implement pointer capture.
      }
    };

    const cancelScheduled = () => {
      if (motion.raf) cancelAnimationFrame(motion.raf);
      motion.raf = 0;
      window.clearTimeout(motion.wheelTimer);
      motion.wheelTimer = 0;
    };

    const stopInertia = () => {
      if (motion.inertia) cancelAnimationFrame(motion.inertia);
      motion.inertia = 0;
    };

    const flushSamples = () => {
      const session = motion.session;
      const queued = motion.queue;
      motion.queue = [];
      const wheel = motion.wheelPending;
      motion.wheelPending = 0;
      let delta = wheel;
      if (session && queued.length > 0) {
        const node = dialRef.current;
        const geom = node ? geometryOf(node) : null;
        if (geom?.ok) {
          if (Math.hypot(geom.cx - session.cx, geom.cy - session.cy) > 1.5) {
            session.track.previous = null;
            session.track.speedPerMs = 0;
          }
          session.cx = geom.cx;
          session.cy = geom.cy;
          for (const sample of queued) {
            const step = applyDragSample(
              session.track,
              { x: sample.x - geom.cx, y: sample.y - geom.cy, t: sample.t },
              geom.deadZone,
            );
            if (step !== 0) {
              session.moved = true;
              session.history.push({ t: sample.t, deltaDeg: step });
              if (session.history.length > 24) session.history.shift();
              delta += step;
            }
          }
        }
      }
      if (delta !== 0) publish(delta);
    };

    const schedule = () => {
      if (motion.raf) return;
      motion.raf = requestAnimationFrame(() => {
        motion.raf = 0;
        flushSamples();
      });
    };

    const finishGesture = (commit: boolean) => {
      track(false);
      lockPageScroll(false);
      if (commit) propsRef.current.onCommit();
    };

    const startInertia = (speed: number) => {
      if (speed === 0 || prefersReducedMotion()) {
        finishGesture(true);
        return;
      }
      let velocity = speed;
      let last = performance.now();
      const step = (now: number) => {
        if (motion.inertia === 0) return;
        const next = integrateInertia(velocity, now - last);
        last = now;
        velocity = next.speed;
        const before = motion.lastDegrees;
        const applied = next.deltaDeg === 0 ? before : publish(next.deltaDeg);
        const stalled =
          typeof before === "number" &&
          typeof applied === "number" &&
          Math.abs(applied - before) < Math.abs(next.deltaDeg) * 0.35;
        if (Math.abs(velocity) < INERTIA_STOP_DEG_PER_SEC || Math.abs(next.deltaDeg) < 0.01 || stalled) {
          motion.inertia = 0;
          finishGesture(true);
          return;
        }
        motion.inertia = requestAnimationFrame(step);
      };
      motion.inertia = requestAnimationFrame(step);
    };

    const endSession = (pointerId: number, kind: "up" | "cancel") => {
      const session = motion.session;
      if (!session || session.pointerId !== pointerId) return;
      cancelScheduled();
      flushSamples();
      const moved = session.moved;
      const history = session.history;
      motion.session = null;
      releaseCapture(pointerId);
      if (!moved) {
        finishGesture(false);
        return;
      }
      if (kind === "cancel" || prefersReducedMotion()) {
        finishGesture(true);
        return;
      }
      startInertia(releaseSpeed(history, performance.now()));
    };

    const onMove = (event: PointerEvent) => {
      const session = motion.session;
      if (!session || session.pointerId !== event.pointerId) return;
      if (propsRef.current.disabled) {
        endSession(event.pointerId, "cancel");
        return;
      }
      motion.queue.push(...samplesFrom(event));
      if (event.pointerType === "mouse" && event.buttons === 0) {
        endSession(event.pointerId, "up");
        return;
      }
      schedule();
    };

    const onUp = (event: PointerEvent) => {
      endSession(event.pointerId, "up");
    };

    const onCancel = (event: PointerEvent) => {
      endSession(event.pointerId, "cancel");
    };

    const onBlur = () => {
      const session = motion.session;
      if (!session) return;
      endSession(session.pointerId, "cancel");
    };

    const cancel = () => {
      const session = motion.session;
      cancelScheduled();
      stopInertia();
      motion.queue = [];
      motion.wheelPending = 0;
      motion.session = null;
      if (session) releaseCapture(session.pointerId);
      lockPageScroll(false);
      track(false);
    };

    const down = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (propsRef.current.disabled) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (motion.session) return;
      const node = dialRef.current;
      if (!node) return;
      const geom = geometryOf(node);
      if (!geom.ok) return;
      stopInertia();
      cancelScheduled();
      motion.queue = [];
      motion.wheelPending = 0;
      const drag = createDragTrack();
      applyDragSample(
        drag,
        { x: event.clientX - geom.cx, y: event.clientY - geom.cy, t: eventTime(event) },
        geom.deadZone,
      );
      motion.session = {
        pointerId: event.pointerId,
        track: drag,
        moved: false,
        history: [],
        cx: geom.cx,
        cy: geom.cy,
      };
      track(true);
      lockPageScroll(true);
      const rotor = rotorRef.current;
      if (rotor) rotor.style.transition = "none";
      try {
        node.setPointerCapture(event.pointerId);
      } catch {
        // jsdom does not implement pointer capture. Window listeners still follow the pointer.
      }
    };

    const onWheel = (event: WheelEvent) => {
      if (propsRef.current.disabled || motion.session) return;
      if (event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      stopInertia();
      const scale = event.shiftKey ? 4 : 1;
      const delta = wheelDeltaToDegrees(event.deltaY * scale, event.deltaMode, window.innerHeight);
      if (delta === 0) return;
      track(true);
      motion.wheelPending += delta;
      schedule();
      window.clearTimeout(motion.wheelTimer);
      motion.wheelTimer = window.setTimeout(() => {
        motion.wheelTimer = 0;
        cancelScheduled();
        flushSamples();
        track(false);
        propsRef.current.onCommit();
      }, 160);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (motion.session) event.preventDefault();
    };

    machineRef.current = {
      down,
      lostCapture: (event) => {
        const session = motion.session;
        if (!session || session.pointerId !== event.pointerId) return;
        if (typeof event.buttons === "number" && event.buttons > 0) return;
        endSession(event.pointerId, "up");
      },
      cancel,
    };

    const node = dialRef.current;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onBlur);
    node?.addEventListener("wheel", onWheel, { passive: false });
    node?.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      mounted = false;
      cancel();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onBlur);
      node?.removeEventListener("wheel", onWheel);
      node?.removeEventListener("touchmove", onTouchMove);
      machineRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({ cancelMotion: () => machineRef.current?.cancel() }), []);

  return {
    dialRef,
    rotorRef,
    tracking,
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => machineRef.current?.down(event),
    onLostPointerCapture: (event: ReactPointerEvent<HTMLDivElement>) => machineRef.current?.lostCapture(event),
    cancelMotion: () => machineRef.current?.cancel(),
  };
}
