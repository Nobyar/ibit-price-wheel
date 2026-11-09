import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WheelApp } from "@/components/wheel-app";
import type { QuotesEnvelope } from "@/lib/quotes/types";

const market: QuotesEnvelope = {
  ok: true,
  fetchedAt: "2026-11-09T02:35:00.000Z",
  btc: {
    ok: true,
    symbol: "BTC-USD",
    price: 75357.07,
    currency: "USD",
    asOf: "2026-11-09T02:38:34.004Z",
    asOfIsTradeTime: true,
    sourceName: "Coinbase Exchange",
    sourceUrl: "https://www.coinbase.com/price/bitcoin",
    notes: ["Last trade on the Coinbase Exchange BTC-USD book."],
    bid: 75357.06,
    ask: 75357.07,
  },
  ibit: {
    ok: true,
    symbol: "IBIT",
    name: "iShares Bitcoin Trust ETF",
    price: 42.88,
    currency: "USD",
    asOf: "2026-11-06T21:00:01.000Z",
    asOfPrecision: "timestamp",
    asOfLabel: null,
    sourceName: "Yahoo Finance chart",
    sourceUrl: "https://finance.yahoo.com/quote/IBIT/",
    exchange: "NasdaqGM",
    vendorMarketStatus: "Closed",
    vendorRealtime: null,
    fullDayPrice: 42.7,
    notes: ["Nasdaq public quote agrees and marks the feed not real-time."],
    crossCheck: null,
  },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("IBIT Price Wheel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    window.history.replaceState(null, "", "/");
  });

  it("turns from the keyboard, resets, and keeps the scenario in the URL", async () => {
    const user = userEvent.setup();
    render(
      <WheelApp
        initialScenario={{ kind: "ready", btc: 100000, ibit: 50, sim: 100000 }}
        ignoredLinkReason={null}
      />,
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText(/Loaded from this link/)).toBeInTheDocument();
    expect(screen.getByTestId("instrument")).toHaveClass("instrument-grid");
    expect(screen.getByTestId("btc-readout")).toHaveClass("area-btc");
    expect(screen.getByTestId("ibit-readout")).toHaveClass("area-ibit");
    expect(screen.getByTestId("wheel-column")).toHaveClass("area-wheel");
    expect(screen.getByTestId("btc-simulated")).toHaveAttribute("data-tone", "simulated");

    const dial = screen.getByRole("slider", { name: /hypothetical bitcoin/i });
    dial.focus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByTestId("change-percent")).toHaveTextContent("+0.10%");
    expect(screen.getByTestId("btc-readout")).toHaveTextContent("$100,100.00");
    expect(screen.getByTestId("ibit-readout")).toHaveTextContent("$50.05");

    await user.keyboard("{Home}");
    expect(screen.getByTestId("change-percent")).toHaveTextContent("0.00%");
    expect(screen.getByTestId("btc-readout")).toHaveTextContent("$100,000.00");

    await user.keyboard("{ArrowDown}");
    expect(screen.getByTestId("change-percent")).toHaveTextContent("−0.10%");
    expect(screen.getByTestId("btc-readout")).toHaveTextContent("$99,900.00");
    expect(screen.getByTestId("ibit-readout")).toHaveTextContent("$49.95");

    await user.keyboard("{Home}");
    await user.keyboard("{Shift>}{ArrowUp}{/Shift}");
    expect(screen.getByTestId("btc-readout")).toHaveTextContent("$101,000.00");
    expect(screen.getByTestId("ibit-readout")).toHaveTextContent("$50.50");

    await user.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByTestId("change-percent")).toHaveTextContent("0.00%");
    expect(screen.getByTestId("btc-readout")).toHaveTextContent("$100,000.00");
    expect(screen.getByTestId("ibit-readout")).toHaveTextContent("$50.00");

    await waitFor(() => {
      expect(window.location.search).toContain("btc=100000");
      expect(window.location.search).toContain("ibit=50");
      expect(window.location.search).toContain("sim=100000");
    });
    expect(window.location.search).not.toMatch(/[<>]/);
  });

  it("shows a closed Sunday market baseline separately from the green simulation", async () => {
    vi.mocked(fetch).mockResolvedValue(json(market));
    render(<WheelApp initialScenario={null} ignoredLinkReason={null} />);
    expect(await screen.findByTestId("btc-baseline-price")).toHaveTextContent("$75,357.07");
    expect(screen.getByTestId("ibit-baseline-price")).toHaveTextContent("$42.88");
    expect(screen.getByTestId("btc-baseline-price")).toHaveAttribute("data-tone", "baseline");
    expect(screen.getByTestId("btc-baseline-price").className).not.toContain("text-phosphor");
    expect(screen.getByTestId("btc-simulated")).toHaveAttribute("data-tone", "simulated");
    expect(screen.getByTestId("btc-readout")).toHaveTextContent("$75,357.07");
    expect(screen.getByTestId("ibit-readout")).toHaveTextContent("$42.88");
    expect(screen.getByText("US stock market closed (Sunday).")).toBeInTheDocument();
    expect(screen.getAllByText(/Coinbase Exchange/).length).toBeGreaterThan(0);
    expect(screen.getByText(/does not label this feed as real-time/)).toBeInTheDocument();
  });

  it("keeps manual entry and the labeled example usable when quotes fail", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    render(
      <WheelApp
        initialScenario={null}
        ignoredLinkReason="A shared scenario needs both btc and ibit prices."
      />,
    );
    expect(await screen.findByText(/Public quotes are unavailable/)).toBeInTheDocument();
    expect(screen.getByText(/both btc and ibit/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Bitcoin baseline/i), "nope");
    await user.type(screen.getByLabelText(/IBIT baseline/i), "50");
    await user.click(screen.getByRole("button", { name: "Apply baselines" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/plain dollar amount|digits/i);
    expect(screen.getByTestId("btc-simulated")).toHaveAttribute("data-tone", "empty");

    await user.clear(screen.getByLabelText(/Bitcoin baseline/i));
    await user.type(screen.getByLabelText(/Bitcoin baseline/i), "100,000");
    await user.click(screen.getByRole("button", { name: "Apply baselines" }));
    expect(screen.getByText(/Manual baseline/)).toBeInTheDocument();
    expect(screen.getByTestId("btc-readout")).toHaveTextContent("$100,000.00");
    expect(screen.getByTestId("ibit-readout")).toHaveTextContent("$50.00");

    await user.click(screen.getByRole("button", { name: /offline example/i }));
    expect(screen.getByText(/not a market quote/i)).toBeInTheDocument();
    expect(screen.getByText(/No market-data vendor supplied/)).toBeInTheDocument();
    expect(screen.getByTestId("btc-readout")).toHaveTextContent("$100,000.00");
    expect(screen.getByTestId("ibit-readout")).toHaveTextContent("$50.00");
  });
});
