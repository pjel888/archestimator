/**
 * format-currency.ts — peso formatter with 2 fraction digits
 * (MASTER-IMPLEMENTATION-PLAN §C-9).
 *
 * SEPARATE from `formatChartMoney` (which uses 0 fraction digits for the
 * `.xlsx` proposal export that omits cents). This one is for landing-page
 * display where cents matter. Leave `formatChartMoney` untouched.
 *
 * Never throws — a landing page must not 500 on a malformed number.
 */

function safeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
}

/**
 * Format a number as Philippine pesos with 2 fraction digits.
 *
 * @example formatPHP(1234.5) → "₱1,234.50"
 * @example formatPHP(0) → "₱0.00"
 * @example formatPHP(NaN) → "₱0.00"  (never throws)
 */
export function formatPHP(amount: number, options?: { withSymbol?: boolean }): string {
  const withSymbol = options?.withSymbol ?? true;
  const value = safeNumber(amount);
  // Intl with en-PH + currency PHP yields "₱1,234.50". Guard against environments
  // where the locale data is sparse by falling back to manual grouping.
  try {
    const formatter = new Intl.NumberFormat("en-PH", {
      style: withSymbol ? "currency" : "decimal",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const formatted = formatter.format(value);
    // Some Node runtimes render PHP as "PHP 1,234.50" or "P1,234.50" — normalize
    // to the peso sign U+20B1. Only the symbol variants need fixing; decimal
    // mode is unaffected.
    if (!withSymbol) return formatted;
    return formatted.replace(/^(PHP|P)\s?/i, "\u20B1");
  } catch {
    // Manual fallback: thousands separators + 2 fraction digits + peso sign.
    const fixed = value.toFixed(2);
    const [intPart, fracPart] = fixed.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return withSymbol ? `\u20B1${withCommas}.${fracPart}` : `${withCommas}.${fracPart}`;
  }
}
