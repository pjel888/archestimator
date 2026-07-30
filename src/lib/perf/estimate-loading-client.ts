import type { EstimateLoadingStageName } from "./estimate-loading-stages";

type EstimateClientChunkStage = Extract<
  EstimateLoadingStageName,
  "estimate.client.tree-chunk" | "estimate.client.content-chunk"
>;

const ESTIMATE_INTERACTIVE_SELECTOR =
  "[data-estimate-center-column='sheet'] input:enabled, [data-estimate-center-column='sheet'] button:enabled, [data-estimate-center-column='sheet'] [contenteditable='true']";
const INTERACTIVE_OBSERVER_TIMEOUT_MS = 30_000;

function isEstimateLoadingTraceEnabled() {
  return process.env.NEXT_PUBLIC_PERF_TRACE === "1" && typeof window !== "undefined";
}

function measureOnce(stage: EstimateLoadingStageName, start: number, end = performance.now()) {
  if (performance.getEntriesByName(stage).length > 0) return;
  performance.measure(stage, { start: Math.min(start, end), end });
}

export function traceEstimateClientRsc() {
  if (!isEstimateLoadingTraceEnabled()) return;

  const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const rsc = [...resources]
    .reverse()
    .find((entry) => entry.name.includes("_rsc=") || entry.name.includes(".rsc"));
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const start = rsc?.startTime ?? navigation?.requestStart ?? 0;
  const end = rsc?.responseEnd || performance.now();
  measureOnce("estimate.client.rsc", start, end);
}

export function traceEstimateClientChunk<T>(stage: EstimateClientChunkStage, load: () => Promise<T>) {
  if (!isEstimateLoadingTraceEnabled()) return load();

  const start = performance.now();
  return load().finally(() => measureOnce(stage, start));
}

export function traceEstimateClientHydration() {
  if (!isEstimateLoadingTraceEnabled()) return;

  const rsc = performance.getEntriesByName("estimate.client.rsc").at(-1);
  const start = rsc ? rsc.startTime + rsc.duration : performance.now();
  measureOnce("estimate.client.hydration", start);
}

export function observeEstimateClientInteractive() {
  if (!isEstimateLoadingTraceEnabled()) return undefined;

  const stop = () => {
    observer.disconnect();
    window.clearTimeout(timeoutId);
    window.cancelAnimationFrame(frameId);
  };
  const markWhenReady = () => {
    const candidate = document.querySelector<HTMLElement>(ESTIMATE_INTERACTIVE_SELECTOR);
    if (!candidate || candidate.getClientRects().length === 0) return;
    const rsc = performance.getEntriesByName("estimate.client.rsc").at(-1);
    measureOnce("estimate.client.interactive", rsc?.startTime ?? 0);
    stop();
  };

  const observer = new MutationObserver(markWhenReady);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  const frameId = window.requestAnimationFrame(markWhenReady);
  const timeoutId = window.setTimeout(stop, INTERACTIVE_OBSERVER_TIMEOUT_MS);
  return stop;
}
