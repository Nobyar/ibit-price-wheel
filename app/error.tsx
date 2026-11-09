"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">The wheel hit a problem</h1>
      <p className="text-sm leading-6 text-muted-foreground">
        The page failed to render. If you already built a scenario, its prices are still in the
        address bar.
      </p>
      <Button type="button" className="min-h-11 w-fit" onClick={() => reset()}>
        Try again
      </Button>
    </main>
  );
}
