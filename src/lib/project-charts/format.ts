/** Shared money/percent formatting for the project charts surface. */

export function formatChartMoney(value: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currencyCode || "PHP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatSignedChartMoney(value: number, currencyCode: string): string {
  const safe = Number.isFinite(value) ? value : 0;
  const sign = safe > 0 ? "+" : safe < 0 ? "−" : "";
  return `${sign}${formatChartMoney(Math.abs(safe), currencyCode)}`;
}

export function formatChartShare(share: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(Number.isFinite(share) ? share : 0);
}

/** A short, stable, non-color cue token (A, B, C…) for a 0-based bucket index. */
export function bucketCueToken(index: number): string {
  if (index < 0) return "•";
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index < letters.length) return letters[index];
  // After Z, fall back to AA, AB… (rare; only when >26 visible buckets).
  return `${letters[Math.floor(index / letters.length) - 1] ?? ""}${letters[index % letters.length]}`;
}
