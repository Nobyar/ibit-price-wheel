import { existsSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { getMetadataBase, getSocialImage, PRODUCTION_ORIGIN, socialCard } from "@/lib/site";

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
const ORIGINAL_VERCEL_URL = process.env.VERCEL_URL;

afterEach(() => {
  if (ORIGINAL_SITE_URL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  if (ORIGINAL_VERCEL_URL === undefined) delete process.env.VERCEL_URL;
  else process.env.VERCEL_URL = ORIGINAL_VERCEL_URL;
});

describe("share card origin", () => {
  it("uses NEXT_PUBLIC_SITE_URL when it is a public origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://ibit-price-wheel.vercel.app";
    expect(getMetadataBase().origin).toBe(PRODUCTION_ORIGIN);
    expect(getSocialImage().url).toBe(`${PRODUCTION_ORIGIN}/og.png`);
  });

  it("falls back to the production origin and ignores a deployment host", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = "ibit-price-wheel-git-preview.vercel.app";
    expect(getMetadataBase().origin).toBe(PRODUCTION_ORIGIN);
    expect(getSocialImage().url).toBe("https://ibit-price-wheel.vercel.app/og.png");
  });

  it("ignores a malformed public origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "not a url";
    expect(getSocialImage().url).toBe("https://ibit-price-wheel.vercel.app/og.png");
  });

  it("describes a large-image card and keeps scenario query params on the same image", () => {
    process.env.NEXT_PUBLIC_SITE_URL = PRODUCTION_ORIGIN;
    const card = socialCard({
      title: "+4.50% Bitcoin what-if",
      description: "Shared what-if.",
      path: "/?btc=100000&ibit=50&sim=104500",
    });
    expect(card.twitter.card).toBe("summary_large_image");
    expect(card.twitter.title).toBe("+4.50% Bitcoin what-if");
    expect(card.twitter.description).toBe("Shared what-if.");
    expect(card.twitter.images[0]?.url).toBe("https://ibit-price-wheel.vercel.app/og.png");
    expect(card.openGraph.type).toBe("website");
    expect(card.openGraph.url).toBe("/?btc=100000&ibit=50&sim=104500");
    expect(card.openGraph.images[0]).toMatchObject({
      url: "https://ibit-price-wheel.vercel.app/og.png",
      width: 1200,
      height: 630,
      type: "image/png",
    });
    expect(card.openGraph.images[0]?.alt).toContain("Bitcoin");
    expect(card.openGraph.images[0]?.alt).toContain("IBIT");
  });
});

describe("public preview file", () => {
  it("is a 1200 by 630 PNG under 5MB", () => {
    const bytes = readFileSync("public/og.png");
    expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(bytes.readUInt32BE(16)).toBe(1200);
    expect(bytes.readUInt32BE(20)).toBe(630);
    expect(bytes.byteLength).toBeLessThan(5 * 1024 * 1024);
  });

  it("is referenced by the page metadata, including scenario links", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    const page = readFileSync("app/page.tsx", "utf8");
    const robots = readFileSync("app/robots.ts", "utf8");
    expect(layout).toContain("socialCard");
    expect(page).toContain("socialCard");
    expect(page).toContain("/?btc=${scenario.btc}&ibit=${scenario.ibit}&sim=${scenario.sim}");
    expect(robots).toContain('allow: "/"');
    expect(existsSync("app/opengraph-image.tsx")).toBe(false);
    expect(existsSync("app/twitter-image.tsx")).toBe(false);
    expect(existsSync("app/og-card/page.tsx")).toBe(false);
  });
});
