import { cacheLife, cacheTag } from "next/cache";
import { loadQuotes } from "@/lib/quotes/load";

export async function getCachedQuotes() {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  cacheTag("market-quotes");
  return loadQuotes();
}
