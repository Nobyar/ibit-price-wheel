export const DEFAULT_DESCRIPTION =
  "A what-if dial for the relationship between a hypothetical Bitcoin price and an IBIT share price. IBIT is estimated from your baseline ratio. Not a quote, a forecast, or an order.";

export function getMetadataBase(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) {
    try {
      return new URL(explicit);
    } catch {
      // Ignore a malformed public origin and fall through.
    }
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  return new URL("http://localhost:3847");
}
