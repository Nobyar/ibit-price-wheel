import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PriceWheel } from "@/components/price-wheel";

function point(angleDeg: number, radius = 80) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    clientX: 100 + Math.cos(rad) * radius,
    clientY: 100 + Math.sin(rad) * radius,
  };
}

function renderWheel(onDelta = vi.fn(), onNudge = vi.fn(), onReset = vi.fn(), onCommit = vi.fn()) {
  render(
    <PriceWheel
      degrees={0}
      disabled={false}
      settle={false}
      percentLabel="0.00%"
      valueNow={100000}
      valueMin={10000}
      valueMax={1000000}
      valueText="Bitcoin $100,000.00"
      onDelta={onDelta}
      onNudge={onNudge}
      onReset={onReset}
      onCommit={onCommit}
    />,
  );
  return { onDelta, onNudge, onReset, onCommit };
}

function drag(
  pointerId: number,
  moves: Array<{ angle: number; radius?: number; t: number }>,
  target: Element | Window = screen.getByTestId("dial"),
) {
  const dial = screen.getByTestId("dial");
  const start = moves[0];
  if (!start) return;
  fireEvent.pointerDown(dial, {
    button: 0,
    buttons: 1,
    pointerId,
    timeStamp: start.t,
    ...point(start.angle, start.radius),
  });
  for (const move of moves.slice(1)) {
    fireEvent.pointerMove(target, {
      button: 0,
      buttons: 1,
      pointerId,
      pointerType: "mouse",
      timeStamp: move.t,
      ...point(move.angle, move.radius),
    });
  }
  const end = moves[moves.length - 1] ?? start;
  fireEvent.pointerUp(target, {
    button: 0,
    buttons: 0,
    pointerId,
    pointerType: "mouse",
    timeStamp: end.t,
    ...point(end.angle, end.radius),
  });
}

describe("price wheel interaction", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 200,
      bottom: 200,
      width: 200,
      height: 200,
      toJSON() {
        return {};
      },
    });
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      })),
    );
  });

  it("increases across the angle wrap clockwise and decreases the other way", () => {
    const { onDelta } = renderWheel();
    drag(1, [
      { angle: 170, t: 0 },
      { angle: -170, t: 16 },
    ]);
    expect(onDelta).toHaveBeenCalledTimes(1);
    expect(onDelta.mock.calls[0]?.[0]).toBeCloseTo(20, 4);

    onDelta.mockClear();
    drag(2, [
      { angle: -170, t: 100 },
      { angle: 170, t: 116 },
    ]);
    expect(onDelta.mock.calls[0]?.[0]).toBeCloseTo(-20, 4);
  });

  it("does not snap to the grab angle and follows the pointer relatively", () => {
    const { onDelta, onCommit } = renderWheel();
    const dial = screen.getByTestId("dial");
    fireEvent.pointerDown(dial, { button: 0, buttons: 1, pointerId: 1, timeStamp: 0, ...point(40) });
    expect(onDelta).not.toHaveBeenCalled();
    fireEvent.pointerMove(dial, {
      button: 0,
      buttons: 1,
      pointerId: 1,
      pointerType: "mouse",
      timeStamp: 16,
      ...point(70),
    });
    fireEvent.pointerUp(dial, { button: 0, buttons: 0, pointerId: 1, pointerType: "mouse", timeStamp: 20, ...point(70) });
    expect(onDelta).toHaveBeenCalledTimes(1);
    expect(onDelta.mock.calls[0]?.[0]).toBeCloseTo(30, 4);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("accumulates full turns and keeps going when the pointer leaves the dial", () => {
    const { onDelta } = renderWheel();
    const moves = [{ angle: 0, t: 0 }];
    for (let step = 1; step <= 36; step += 1) moves.push({ angle: step * 10, t: step });
    drag(1, moves, window);
    expect(onDelta).toHaveBeenCalledTimes(1);
    expect(onDelta.mock.calls[0]?.[0]).toBeCloseTo(360, 3);
  });

  it("follows coalesced samples through a fast turn instead of reversing", () => {
    const { onDelta } = renderWheel();
    const dial = screen.getByTestId("dial");
    fireEvent.pointerDown(dial, { button: 0, buttons: 1, pointerId: 1, timeStamp: 0, ...point(0) });
    const samples = Array.from({ length: 36 }, (_, index) => {
      const angle = (index + 1) * 10;
      const coords = point(angle);
      return new PointerEvent("pointermove", {
        bubbles: true,
        pointerId: 1,
        clientX: coords.clientX,
        clientY: coords.clientY,
      });
    });
    const last = samples.at(-1);
    const move = new PointerEvent("pointermove", {
      bubbles: true,
      pointerId: 1,
      pointerType: "mouse",
      buttons: 1,
      clientX: last?.clientX,
      clientY: last?.clientY,
    });
    Object.defineProperty(move, "getCoalescedEvents", { value: () => samples });
    dial.dispatchEvent(move);
    fireEvent.pointerUp(dial, { button: 0, buttons: 0, pointerId: 1, pointerType: "mouse", timeStamp: 30, ...point(0) });
    expect(onDelta.mock.calls[0]?.[0]).toBeCloseTo(360, 3);
  });

  it("does not spin when the pointer is in the hub or crosses it", () => {
    const { onDelta } = renderWheel();
    drag(1, [
      { angle: 0, radius: 80, t: 0 },
      { angle: 80, radius: 4, t: 10 },
      { angle: 180, radius: 90, t: 20 },
    ]);
    expect(onDelta).not.toHaveBeenCalled();
  });

  it("ignores a second finger until the first gesture ends", () => {
    const { onDelta } = renderWheel();
    const dial = screen.getByTestId("dial");
    fireEvent.pointerDown(dial, { button: 0, buttons: 1, pointerId: 1, timeStamp: 0, ...point(0) });
    fireEvent.pointerDown(dial, { button: 0, buttons: 1, pointerId: 2, timeStamp: 5, ...point(90) });
    fireEvent.pointerMove(dial, {
      button: 0,
      buttons: 1,
      pointerId: 2,
      pointerType: "mouse",
      timeStamp: 16,
      ...point(140),
    });
    fireEvent.pointerMove(dial, {
      button: 0,
      buttons: 1,
      pointerId: 1,
      pointerType: "mouse",
      timeStamp: 24,
      ...point(25),
    });
    fireEvent.pointerUp(dial, { button: 0, buttons: 0, pointerId: 1, pointerType: "mouse", timeStamp: 30, ...point(25) });
    expect(onDelta).toHaveBeenCalledTimes(1);
    expect(onDelta.mock.calls[0]?.[0]).toBeCloseTo(25, 4);
  });

  it("commits on pointercancel and when capture is lost with the button up", () => {
    const { onCommit, onDelta } = renderWheel();
    const dial = screen.getByTestId("dial");
    fireEvent.pointerDown(dial, { button: 0, buttons: 1, pointerId: 1, timeStamp: 0, ...point(0) });
    fireEvent.pointerMove(dial, {
      button: 0,
      buttons: 1,
      pointerId: 1,
      pointerType: "mouse",
      timeStamp: 16,
      ...point(15),
    });
    fireEvent.pointerCancel(window, { pointerId: 1, pointerType: "touch" });
    expect(onDelta.mock.calls[0]?.[0]).toBeCloseTo(15, 4);
    expect(onCommit).toHaveBeenCalledTimes(1);

    onCommit.mockClear();
    fireEvent.pointerDown(dial, { button: 0, buttons: 1, pointerId: 3, timeStamp: 100, ...point(0) });
    fireEvent.pointerMove(dial, {
      button: 0,
      buttons: 1,
      pointerId: 3,
      pointerType: "mouse",
      timeStamp: 116,
      ...point(12),
    });
    fireEvent.lostPointerCapture(dial, { pointerId: 3, buttons: 0 });
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("turns from the scroll wheel without letting the page consume the event", async () => {
    const { onDelta } = renderWheel();
    const dial = screen.getByTestId("dial");
    const blocked = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -96 });
    await act(async () => {
      dial.dispatchEvent(blocked);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });
    expect(blocked.defaultPrevented).toBe(true);
    expect(onDelta.mock.calls[0]?.[0]).toBeCloseTo(12, 4);

    onDelta.mockClear();
    const zoom = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -96, ctrlKey: true });
    dial.dispatchEvent(zoom);
    expect(zoom.defaultPrevented).toBe(false);
    expect(onDelta).not.toHaveBeenCalled();
  });

  it("answers arrow keys, shift for a coarse step, and Home", async () => {
    const user = userEvent.setup();
    const { onNudge, onReset } = renderWheel();
    const dial = screen.getByRole("slider", { name: /hypothetical bitcoin/i });
    dial.focus();
    await user.keyboard("{ArrowUp}");
    await user.keyboard("{ArrowLeft}");
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    await user.keyboard("{Home}");
    expect(onNudge).toHaveBeenNthCalledWith(1, 0.1);
    expect(onNudge).toHaveBeenNthCalledWith(2, -0.1);
    expect(onNudge).toHaveBeenNthCalledWith(3, 1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
