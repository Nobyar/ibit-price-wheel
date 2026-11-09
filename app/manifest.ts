import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IBIT Price Wheel",
    short_name: "IBIT Wheel",
    description:
      "What-if dial relating a hypothetical Bitcoin price to an IBIT share price.",
    start_url: "/",
    display: "standalone",
    background_color: "#121416",
    theme_color: "#121416",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
