import { getCachedQuotes } from "@/lib/quotes/cached";

export async function GET() {
  const body = await getCachedQuotes();
  return Response.json(body, {
    headers: {
      "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
