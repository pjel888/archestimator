// Dev-only round-trip instrumentation for the estimates-list performance work.
// Dormant unless PERF_TRACE=1, so it is safe to leave in place: each `[perf]`
// line is one server hop, so `grep -c '^\[perf\]'` counts round-trips and the
// durations sum to server think time. See
// .ai/03_plans/2026-06-14-Estimates-List-Page-Performance-Optimization/05_MEASUREMENT_METHODOLOGY.md.
const ENABLED = process.env.PERF_TRACE === "1";

export async function traced<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!ENABLED) return fn();
  const start = performance.now();
  try {
    return await fn();
  } finally {
    console.log(`[perf] ${label} ${(performance.now() - start).toFixed(1)}ms`);
  }
}
