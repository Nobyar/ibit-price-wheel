import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PriceWheel } from "@/components/price-wheel";

function point(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    clientX: 100 + Math.cos(rad) * 80,
    clientY: 100 + Math.sin(rad) * 80,
  };
}

function renderWheel(onDelta = vi.fn(), onNudge = vi.fn(), onReset = vi.fn()) {
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
      onCommit={vi.fn()}
    />,
  );
  return { onDelta, onNudge, onReset };
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
  });

  it("increases across the angle wrap clockwise and decreases the other way", () => {
    const { onDelta } = renderWheel();
    const dial = screen.getByTestId("dial");
    const clockwiseStart = point(170);
    const clockwiseEnd = point(-170);
    fireEvent.pointerDown(dial, { button: 0, pointerId: 1, ...clockwiseStart });
    fireEvent.pointerMove(dial, { button: 0, pointerId: 1, ...clockwiseEnd });
    expect(onDelta).toHaveBeenCalled();
    expect(onDelta.mock.calls.at(-1)?.[0]).toBeCloseTo(20, 4);

    onDelta.mockClear();
    const counterStart = point(-170);
    const counterEnd = point(170);
    fireEvent.pointerDown(dial, { button: 0, pointerId: 2, ...counterStart });
    fireEvent.pointerMove(dial, { button: 0, pointerId: 2, ...counterEnd });
    expect(onDelta.mock.calls.at(-1)?.[0]).toBeCloseTo(-20, 4);
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
