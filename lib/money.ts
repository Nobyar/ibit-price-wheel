export type ParseResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

const GROUPED = /^\d{1,3}(,\d{3})+(\.\d{1,4})?$/;
const PLAIN = /^\d{1,12}(\.\d{1,4})?$/;

export function roundUsd(value: number): number {
  if (!Number.isFinite(value)) return Number.NaN;
  return Number(value.toFixed(2));
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatUsdDigits(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(roundUsd(value));
}

/** Segment display without a thousands mark, so a separator is not mistaken for a decimal. */
export function formatLedDigits(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return roundUsd(value).toFixed(2);
}

export function formatEditable(value: number): string {
  if (!Number.isFinite(value)) return "";
  return roundUsd(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatSignedUsd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = roundUsd(value);
  const body = formatUsd(Math.abs(rounded));
  if (rounded > 0) return `+${body}`;
  if (rounded < 0) return `−${body}`;
  return body;
}

export function formatSignedPercent(percent: number): string {
  if (!Number.isFinite(percent)) return "—";
  const rounded = Math.round(percent * 100) / 100;
  if (rounded === 0) return "0.00%";
  const abs = Math.abs(rounded).toFixed(2);
  return rounded > 0 ? `+${abs}%` : `−${abs}%`;
}

export function formatParam(value: number): string {
  const rounded = roundUsd(value);
  if (!Number.isFinite(rounded)) return "";
  return rounded.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function pricesMatch(a: number, b: number): boolean {
  return Math.abs(roundUsd(a) - roundUsd(b)) < 0.001;
}

export function parseUsd(input: string): ParseResult {
  const trimmed = input.trim().replace(/\u00a0/g, " ");
  if (!trimmed) return { ok: false, error: "Enter a price." };
  if (trimmed.length > 24) {
    return { ok: false, error: "That price is too long." };
  }
  if (/[eE]/.test(trimmed) || /[()]/.test(trimmed)) {
    return {
      ok: false,
      error: "Use a plain dollar amount, such as 75,357.07.",
    };
  }
  let cleaned = trimmed.replace(/[$\s]/g, "");
  if (cleaned.startsWith(".")) cleaned = `0${cleaned}`;
  if (!(GROUPED.test(cleaned) || PLAIN.test(cleaned))) {
    return {
      ok: false,
      error: "Use digits, an optional dollar sign, and an optional decimal.",
    };
  }
  const numeric = Number(cleaned.replace(/,/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return { ok: false, error: "Price must be greater than zero." };
  }
  return { ok: true, value: numeric };
}

const LIMITS = {
  btc: { min: 1, max: 100_000_000, label: "Bitcoin" },
  ibit: { min: 0.01, max: 100_000, label: "IBIT" },
} as const;

export function validateBaseline(
  kind: keyof typeof LIMITS,
  value: number,
): ParseResult {
  const limits = LIMITS[kind];
  if (!Number.isFinite(value) || value < limits.min || value > limits.max) {
    return {
      ok: false,
      error: `${limits.label} baseline must be between ${formatUsd(limits.min)} and ${formatUsd(limits.max)}.`,
    };
  }
  return { ok: true, value: roundUsd(value) };
}

export function parseVendorPrice(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}
