/** Screen-space angle in degrees. 0 is 3 o'clock. Positive is clockwise. */
export function pointerAngleDeg(
  clientX: number,
  clientY: number,
  centerX: number,
  centerY: number,
): number {
  return (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI;
}

/**
 * Smallest turn from `fromDeg` to `toDeg`.
 * Positive is clockwise. A change of exactly 180 degrees is treated as clockwise.
 */
export function shortestAngleDelta(fromDeg: number, toDeg: number): number {
  const raw = toDeg - fromDeg;
  const wrapped = ((raw % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

export type DragPoint = { x: number; y: number };

export type DragTrack = {
  previous: DragPoint | null;
  lastT: number | null;
  /** Clockwise degrees per millisecond. */
  speedPerMs: number;
};

/** Fraction of the dial's half-width where the pointer angle is too noisy to trust. */
export const DRAG_DEAD_ZONE_RATIO = 0.2;

const MAX_PREDICT_MS = 48;
const MAX_SPEED_PER_MS = 3;

export function createDragTrack(): DragTrack {
  return { previous: null, lastT: null, speedPerMs: 0 };
}

/** Signed clockwise turn from one offset-from-center vector to the next. */
export function vectorTurnDeg(from: DragPoint, to: DragPoint): number | null {
  const cross = from.x * to.y - from.y * to.x;
  const dot = from.x * to.x + from.y * to.y;
  if (cross === 0 && dot === 0) return null;
  return (Math.atan2(cross, dot) * 180) / Math.PI;
}

/**
 * Keep a fast turn going when one sample hops across the ±180° branch.
 * Small motions, including a real reversal, stay on the short arc.
 */
export function continueTurn(shortestDeg: number, predictedDeg: number): number {
  if (!Number.isFinite(shortestDeg) || shortestDeg === 0) return 0;
  if (Math.abs(shortestDeg) < 120) return shortestDeg;
  if (Math.sign(shortestDeg) === Math.sign(predictedDeg)) return shortestDeg;
  if (!(Math.abs(predictedDeg) >= 20)) return shortestDeg;
  const longDeg = shortestDeg > 0 ? shortestDeg - 360 : shortestDeg + 360;
  return Math.abs(longDeg - predictedDeg) < Math.abs(shortestDeg - predictedDeg) ? longDeg : shortestDeg;
}

/**
 * One pointer sample during a relative drag.
 * The first sample outside the dead zone only anchors the grab; it does not move the wheel.
 * Samples inside the dead zone drop that anchor so a later exit cannot spin by the unstable angle.
 */
export function applyDragSample(
  track: DragTrack,
  sample: DragPoint & { t: number },
  deadZone: number,
): number {
  const radius = Math.hypot(sample.x, sample.y);
  const dt = track.lastT == null ? 0 : sample.t - track.lastT;
  track.lastT = sample.t;
  if (!(radius > deadZone)) {
    track.previous = null;
    track.speedPerMs = 0;
    return 0;
  }
  if (track.previous == null) {
    track.previous = { x: sample.x, y: sample.y };
    track.speedPerMs = 0;
    return 0;
  }
  const raw = vectorTurnDeg(track.previous, sample);
  track.previous = { x: sample.x, y: sample.y };
  if (raw == null || !Number.isFinite(raw)) {
    track.speedPerMs = 0;
    return 0;
  }
  const predicted = dt > 0 && dt <= MAX_PREDICT_MS ? track.speedPerMs * dt : 0;
  const delta = continueTurn(raw, predicted);
  if (dt > 0 && dt <= 80 && delta !== 0) {
    const speed = delta / dt;
    track.speedPerMs = Math.max(-MAX_SPEED_PER_MS, Math.min(MAX_SPEED_PER_MS, speed));
  } else if (delta === 0) {
    track.speedPerMs = 0;
  }
  return delta;
}

/** Positive deltaY (scroll down) lowers the price. Pixel, line, and page modes are normalized. */
export function wheelDeltaToDegrees(deltaY: number, deltaMode: number, viewportHeight = 800): number {
  if (!Number.isFinite(deltaY) || deltaY === 0) return 0;
  const pixels =
    deltaMode === 1 ? deltaY * 32 : deltaMode === 2 ? deltaY * Math.max(viewportHeight, 1) : deltaY;
  const degrees = -pixels / 8;
  const cap = 70;
  return Math.max(-cap, Math.min(cap, degrees));
}

export const INERTIA_MIN_DEG_PER_SEC = 360;
export const INERTIA_MAX_DEG_PER_SEC = 900;
export const INERTIA_STOP_DEG_PER_SEC = 24;
export const INERTIA_TAU_MS = 70;

export function clampReleaseSpeed(degPerSec: number): number {
  if (!Number.isFinite(degPerSec) || Math.abs(degPerSec) < INERTIA_MIN_DEG_PER_SEC) return 0;
  const sign = Math.sign(degPerSec);
  return sign * Math.min(Math.abs(degPerSec), INERTIA_MAX_DEG_PER_SEC);
}

/** Speed from recent non-zero samples. A held-still release returns 0. */
export function releaseSpeed(history: { t: number; deltaDeg: number }[], now: number): number {
  const recent = history.filter(
    (sample) => sample.deltaDeg !== 0 && now - sample.t <= 100 && now - sample.t >= 0,
  );
  if (recent.length < 2) return 0;
  const first = recent[0];
  const last = recent[recent.length - 1];
  if (!first || !last) return 0;
  const dt = last.t - first.t;
  if (dt < 16) return 0;
  const total = recent.reduce((sum, sample) => sum + sample.deltaDeg, 0);
  return clampReleaseSpeed((total / dt) * 1000);
}

/** Exact integral of exponential decay over `dtMs`, capped so a stalled frame cannot lurch. */
export function integrateInertia(
  speedDegPerSec: number,
  dtMs: number,
  tauMs = INERTIA_TAU_MS,
): { speed: number; deltaDeg: number } {
  const dt = Math.min(Math.max(dtMs, 0), MAX_PREDICT_MS);
  if (dt === 0 || speedDegPerSec === 0 || !(tauMs > 0)) {
    return { speed: speedDegPerSec, deltaDeg: 0 };
  }
  const decay = Math.exp(-dt / tauMs);
  const deltaDeg = speedDegPerSec * (tauMs / 1000) * (1 - decay);
  return { speed: speedDegPerSec * decay, deltaDeg };
}
