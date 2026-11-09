import { describe, expect, it } from "vitest";
import { buildScenarioSearch, readScenario } from "@/lib/scenario";

describe("share URL", () => {
  it("round-trips a scenario and defaults a missing sim to the baseline", () => {
    const search = buildScenarioSearch({ btc: 75357.07, ibit: 42.88, sim: 80000 });
    const params = Object.fromEntries(new URLSearchParams(search.slice(1)));
    expect(readScenario(params)).toEqual({
      kind: "ready",
      btc: 75357.07,
      ibit: 42.88,
      sim: 80000,
    });
    expect(readScenario({ btc: "100000", ibit: "50" })).toMatchObject({
      kind: "ready",
      sim: 100000,
    });
    expect(search).not.toMatch(/[<>]/);
  });

  it("rejects scripts, exponents, partial links, and prices outside the wheel", () => {
    expect(readScenario({})).toEqual({ kind: "empty" });
    expect(readScenario({ btc: "<script>alert(1)</script>", ibit: "50", sim: "50" }).kind).toBe(
      "invalid",
    );
    expect(readScenario({ btc: "1e5", ibit: "50" }).kind).toBe("invalid");
    expect(readScenario({ btc: "-10", ibit: "50" }).kind).toBe("invalid");
    expect(readScenario({ btc: "100000" }).kind).toBe("invalid");
    expect(readScenario({ btc: "100000", ibit: "50", sim: "2000000" }).kind).toBe("invalid");
    expect(readScenario({ btc: "0", ibit: "50" }).kind).toBe("invalid");
  });
});
