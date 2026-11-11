export const DEFAULT_DESCRIPTION =
  "A what-if dial for the relationship between a hypothetical Bitcoin price and an IBIT share price. IBIT is estimated from your baseline ratio. Not a quote, a forecast, or an order.";

export const PRODUCTION_ORIGIN = "https://ibit-price-wheel.vercel.app";

export const SOCIAL_IMAGE = {
  path: "/og.png",
  width: 1200,
  height: 630,
  alt: "IBIT Price Wheel: a charcoal dial with a green digital Bitcoin price on one side and the IBIT share price on the other.",
  type: "image/png",
} as const;

function readConfiguredOrigin(): URL | null {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (!explicit) return null;
  try {
    const url = new URL(explicit);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
}

/** Public origin for absolute share links. Production sets NEXT_PUBLIC_SITE_URL. */
export function getMetadataBase(): URL {
  return readConfiguredOrigin() ?? new URL(PRODUCTION_ORIGIN);
}

export function getSocialImage() {
  return {
    url: new URL(SOCIAL_IMAGE.path, getMetadataBase()).href,
    width: SOCIAL_IMAGE.width,
    height: SOCIAL_IMAGE.height,
    alt: SOCIAL_IMAGE.alt,
    type: SOCIAL_IMAGE.type,
  };
}

export function socialCard({
  title,
  description,
  path = "/",
}: {
  title: string;
  description: string;
  path?: string;
}) {
  const image = getSocialImage();
  return {
    openGraph: {
      title,
      description,
      type: "website" as const,
      url: path,
      siteName: "IBIT Price Wheel",
      locale: "en_US" as const,
      images: [image],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: [image],
    },
  };
}
