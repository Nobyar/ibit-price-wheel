"use client";

import { MAX_FACTOR, MIN_FACTOR, TURN_GAIN } from "@/lib/price";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function MethodologyDialog() {
  const turn = (1 + TURN_GAIN).toFixed(2);
  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: "outline", className: "min-h-11" })}>
        How the estimate works
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>How the estimate works</DialogTitle>
          <DialogDescription>
            The wheel is a proportional what-if. It is not an exchange rate and not an order.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            Estimated IBIT equals the IBIT baseline times hypothetical Bitcoin divided by the
            Bitcoin baseline. Both prices therefore move by the same percentage.
          </p>
          <p className="font-mono text-xs text-foreground">
            IBIT estimate = IBIT baseline × (Bitcoin hypothetical ÷ Bitcoin baseline)
          </p>
          <p>
            One full clockwise turn multiplies the hypothetical Bitcoin price by {turn}.
            Counterclockwise divides by {turn}. The wheel stops at {MIN_FACTOR * 100}% and{" "}
            {MAX_FACTOR}× the Bitcoin baseline.
          </p>
          <p>
            Green segmented numbers are the simulation. Stone-colored figures are baselines, with
            a source and a time when they came from a quote check. A shared link stores those
            baselines and the hypothetical Bitcoin price. It does not place a trade.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
