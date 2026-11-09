import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("responsive instrument layout", () => {
  it("places Bitcoin and IBIT beside the wheel on desktop and stacks them on a phone", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toContain('grid-template-areas:\n    "btc ibit"\n    "wheel wheel"');
    expect(css).toContain('grid-template-areas: "btc wheel ibit"');
    expect(css).toContain("min-width: 960px");
    expect(css).toContain('grid-template-areas:\n      "btc"\n      "wheel"\n      "ibit"');
  });
});
