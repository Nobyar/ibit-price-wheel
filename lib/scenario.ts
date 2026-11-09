import { MAX_FACTOR, MIN_FACTOR } from "@/lib/price";
import { formatParam, roundUsd } from "@/lib/money";

const PARAM = /^(?:0|[1-9]\d{0,8})(?:\.\d{1,4})?$/;

export type ReadyScenario = {
  kind: "ready";
  btc: number;
  ibit: number;
  sim: number;
};

export type ScenarioResult =
  | { kind: "empty" }
  | { kind: "invalid"; reason: string }
  | ReadyScenario;

type SearchRecord = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function readNumber(raw: string | null, label: string): { ok: true; value: number } | { ok: false; reason: string } {
  if (raw == null || raw.trim() === "") {
    return { ok: false, reason: `The link is missing ${label}.` };
  }
  if (raw.length > 20 || !PARAM.test(raw)) {
    return {
      ok: false,
      reason: `The link's ${label} is not a plain positive number.`,
    };
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, reason: `The link's ${label} is not usable.` };
  }
  return { ok: true, value: roundUsd(value) };
}

export function readScenario(search: SearchRecord | URLSearchParams): ScenarioResult {
  const record: SearchRecord =
    search instanceof URLSearchParams
      ? Object.fromEntries(search.entries())
      : search;
  const btcRaw = first(record.btc);
  const ibitRaw = first(record.ibit);
  const simRaw = first(record.sim);
  if (btcRaw == null && ibitRaw == null && simRaw == null) {
    return { kind: "empty" };
  }
  if (btcRaw == null || ibitRaw == null) {
    return {
      kind: "invalid",
      reason: "A shared scenario needs both btc and ibit prices.",
    };
  }
  const btc = readNumber(btcRaw, "Bitcoin baseline");
  if (!btc.ok) return { kind: "invalid", reason: btc.reason };
  const ibit = readNumber(ibitRaw, "IBIT baseline");
  if (!ibit.ok) return { kind: "invalid", reason: ibit.reason };
  if (btc.value < 1 || btc.value > 100_000_000) {
    return { kind: "invalid", reason: "The link's Bitcoin baseline is outside the supported range." };
  }
  if (ibit.value < 0.01 || ibit.value > 100_000) {
    return { kind: "invalid", reason: "The link's IBIT baseline is outside the supported range." };
  }
  const sim = simRaw == null ? { ok: true as const, value: btc.value } : readNumber(simRaw, "hypothetical Bitcoin price");
  if (!sim.ok) return { kind: "invalid", reason: sim.reason };
  const factor = sim.value / btc.value;
  if (factor < MIN_FACTOR - 1e-9 || factor > MAX_FACTOR + 1e-6) {
    return {
      kind: "invalid",
      reason: "This link asks for a Bitcoin price outside the wheel's range (10% to 10× the baseline).",
    };
  }
  return { kind: "ready", btc: btc.value, ibit: ibit.value, sim: sim.value };
}

export function buildScenarioSearch(input: {
  btc: number;
  ibit: number;
  sim: number;
}): string {
  const params = new URLSearchParams();
  params.set("btc", formatParam(input.btc));
  params.set("ibit", formatParam(input.ibit));
  params.set("sim", formatParam(input.sim));
  return `?${params.toString()}`;
}
