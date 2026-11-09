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
