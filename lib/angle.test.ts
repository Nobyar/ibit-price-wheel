import { describe, expect, it } from "vitest";
import {
  applyDragSample,
  continueTurn,
  createDragTrack,
  integrateInertia,
  pointerAngleDeg,
  releaseSpeed,
  shortestAngleDelta,
  wheelDeltaToDegrees,
  type DragTrack,
} from "@/lib/angle";

function at(deg: number, radius = 80, t = 0) {
  const rad = (deg * Math.PI) / 180;
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius, t };
}

function follow(samples: Array<{ x: number; y: number; t: number }>, deadZone = 16) {
  const track = createDragTrack();
  let total = 0;
  for (const sample of samples) total += applyDragSample(track, sample, deadZone);
  return total;
}

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
    expect(shortestAngleDelta(180, -180)).toBe(0);
  });
});

describe("relative drag", () => {
  it("anchors on the grab and rotates by the pointer delta, not to the pointer angle", () => {
    const track = createDragTrack();
    expect(applyDragSample(track, at(40, 80, 0), 16)).toBe(0);
    expect(applyDragSample(track, at(70, 80, 16), 16)).toBeCloseTo(30);
    const grabbedAtTop = createDragTrack();
    expect(applyDragSample(grabbedAtTop, at(-90, 80, 0), 16)).toBe(0);
    expect(applyDragSample(grabbedAtTop, at(-60, 80, 16), 16)).toBeCloseTo(30);
  });

  it("crosses the atan2 branch as a short clockwise or counterclockwise step", () => {
    expect(follow([at(170, 80, 0), at(-170, 80, 16)])).toBeCloseTo(20);
    expect(follow([at(-170, 80, 0), at(170, 80, 16)])).toBeCloseTo(-20);
    expect(follow([at(350, 80, 0), at(10, 80, 16)])).toBeCloseTo(20);
    const acrossTop = follow([at(-100, 80, 0), at(-80, 80, 16)]);
    expect(acrossTop).toBeCloseTo(20);
  });

  it("accumulates several full turns from small steps", () => {
    const samples = [];
    for (let deg = 0; deg <= 360 * 3; deg += 5) samples.push(at(deg, 90, deg));
    expect(follow(samples)).toBeCloseTo(1080, 4);
  });

  it("keeps a fast arc when one sample hops past 180 degrees", () => {
    expect(continueTurn(-140, 200)).toBeCloseTo(220);
    expect(continueTurn(140, -200)).toBeCloseTo(-220);
    expect(continueTurn(-20, 200)).toBeCloseTo(-20);
    expect(continueTurn(-140, 0)).toBeCloseTo(-140);

    const samples = [at(0, 80, 0)];
    for (let step = 1; step <= 4; step += 1) samples.push(at(step * 50, 80, step * 16));
    samples.push(at(200 + 220, 80, 5 * 16));
    expect(follow(samples)).toBeCloseTo(420, 3);
  });

  it("ignores the hub and does not jump when the pointer crosses it", () => {
    expect(follow([at(0, 80, 0), at(90, 4, 16), at(180, 5, 32)])).toBe(0);
    expect(follow([at(0, 80, 0), at(20, 4, 16), at(180, 90, 32)])).toBeCloseTo(0, 4);
    const aroundTheHub = follow([at(0, 40, 0), at(90, 40, 16), at(180, 40, 32), at(270, 40, 48)]);
    expect(aroundTheHub).toBeCloseTo(270, 3);
  });
});

describe("wheel and inertia", () => {
  it("maps scroll down to a counterclockwise turn and caps a single event", () => {
    expect(wheelDeltaToDegrees(-96, 0)).toBeCloseTo(12);
    expect(wheelDeltaToDegrees(96, 0)).toBeCloseTo(-12);
    expect(wheelDeltaToDegrees(-3, 1)).toBeCloseTo(12);
    expect(wheelDeltaToDegrees(1, 2, 800)).toBeCloseTo(-70);
    expect(wheelDeltaToDegrees(0, 0)).toBe(0);
    expect(wheelDeltaToDegrees(Number.NaN, 0)).toBe(0);
  });

  it("coasts in the release direction and comes to rest", () => {
    const flick = releaseSpeed(
      [
        { t: 1000, deltaDeg: 20 },
        { t: 1020, deltaDeg: 24 },
        { t: 1040, deltaDeg: 22 },
      ],
      1050,
    );
    expect(flick).toBeGreaterThanOrEqual(360);
    expect(
      releaseSpeed(
        [
          { t: 1000, deltaDeg: 6 },
          { t: 1080, deltaDeg: 6 },
          { t: 1160, deltaDeg: 6 },
        ],
        1170,
      ),
    ).toBe(0);
    expect(releaseSpeed([{ t: 1000, deltaDeg: 30 }], 1010)).toBe(0);
    expect(
      releaseSpeed(
        [
          { t: 1000, deltaDeg: 40 },
          { t: 1010, deltaDeg: 40 },
        ],
        1200,
      ),
    ).toBe(0);

    let speed = 400;
    let traveled = 0;
    for (let frame = 0; frame < 90; frame += 1) {
      const step = integrateInertia(speed, 16);
      expect(Math.sign(step.deltaDeg)).toBe(1);
      expect(Math.abs(step.speed)).toBeLessThan(Math.abs(speed));
      speed = step.speed;
      traveled += step.deltaDeg;
    }
    expect(traveled).toBeGreaterThan(20);
    expect(traveled).toBeLessThan(400 * 0.07 + 1);
    expect(Math.abs(speed)).toBeLessThan(24);
    expect(integrateInertia(-200, 16).deltaDeg).toBeLessThan(0);
  });
});

describe("drag track mutation", () => {
  it("does not keep speed after the pointer leaves the usable ring", () => {
    const track: DragTrack = createDragTrack();
    applyDragSample(track, at(0, 80, 0), 16);
    applyDragSample(track, at(30, 80, 16), 16);
    expect(track.speedPerMs).not.toBe(0);
    applyDragSample(track, at(40, 2, 32), 16);
    expect(track.previous).toBeNull();
    expect(track.speedPerMs).toBe(0);
  });
});
