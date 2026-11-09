import { SegmentValue } from "@/components/seven-segment";
import { formatLedDigits, formatSignedUsd, formatUsd } from "@/lib/money";
import { cn } from "@/lib/utils";

export function DigitalReadout({
  id,
  title,
  spokenName,
  price,
  baseline,
  change,
  className,
}: {
  id: "btc" | "ibit";
  title: string;
  spokenName: string;
  price: number | null;
  baseline: number | null;
  change: number | null;
  className?: string;
}) {
  const changeClass =
    change == null || change === 0
      ? "text-muted-foreground"
      : change > 0
        ? "text-up"
        : "text-down";
  return (
    <article
      data-testid={`${id}-readout`}
      className={cn(
        "readout flex flex-col rounded-3xl border border-border bg-card px-3 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:px-4 sm:py-4",
        className,
      )}
    >
      <header className="flex items-baseline justify-between gap-2">
        <p className="text-[0.68rem] tracking-[0.18em] text-brass">{title}</p>
        <p className="text-[0.68rem] tracking-[0.16em] text-phosphor">SIMULATED</p>
      </header>
      <p className="sr-only">
        {price == null
          ? `${spokenName} simulated price is not set.`
          : `Simulated ${spokenName} ${formatUsd(price)}.`}
      </p>
      <div
        className="recess mt-3 flex min-h-[4.5rem] items-center justify-center px-2 py-3"
        data-testid={`${id}-simulated`}
        data-tone={price == null ? "empty" : "simulated"}
      >
        {price == null ? (
          <p className="text-center font-mono text-sm text-muted-foreground">
            No simulated price yet
          </p>
        ) : (
          <div className="segment-row flex items-end justify-center gap-[0.16em] text-phosphor">
            <span className="text-glow font-mono text-[0.55em] leading-[0.7]" aria-hidden="true">
              $
            </span>
            <SegmentValue value={formatLedDigits(price)} />
          </div>
        )}
      </div>
      <p className="mt-3 text-center font-mono text-xs text-muted-foreground sm:text-sm" data-tone="baseline">
        Baseline {baseline == null ? "not set" : formatUsd(baseline)}
      </p>
      <p className={cn("text-center font-mono text-sm", changeClass)}>
        {change == null ? "—" : change === 0 ? "Unchanged" : formatSignedUsd(change)}
      </p>
    </article>
  );
}
