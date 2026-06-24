// P2-T2/T3: clamp a typed rate to 0-100. A cleared field emits "" and Number("") === 0
// (which IS finite), so without the empty/whitespace guard clearing the input would silently
// commit 0% instead of keeping the prior rate - making the fallback unreachable for the only
// non-numeric value a number input actually emits. Treat empty/in-progress input as "keep
// current" so clearing the field never zeroes the rate behind the user's back.
export function clampRate(raw: string, fallback: number) {
  if (raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, value));
}
