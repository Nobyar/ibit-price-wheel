import { describe, expect, it } from "vitest";
import { pointerAngleDeg, shortestAngleDelta } from "@/lib/angle";

describe("dial angle", () => {
  it("treats screen-down as clockwise from 3 o'clock", () => {
    expect(pointerAngleDeg(110, 100, 100, 100)).toBeCloseTo(0);
    expect(pointerAngleDeg(100, 110, 100, 100)).toBeCloseTo(90);
    expect(pointerAngleDeg(100, 90, 100, 100)).toBeCloseTo(-90);
  });

  it("wraps the branch cut without spinning the long way", () => {
    expect(shortestAngleDelta(170, -170)).toBeCloseTo(20);
    expect(shortestAngleDelta(-170, 170)).toBeCloseTo(-20);
    expect(shortestAngleDelta(350, 10)).toBeCloseTo(20);
    expect(shortestAngleDelta(10, 350)).toBeCloseTo(-20);
    expect(shortestAngleDelta(10, 10)).toBe(0);
    expect(shortestAngleDelta(0, 180)).toBe(180);
  });
});
