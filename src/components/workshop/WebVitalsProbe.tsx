"use client";

import { useReportWebVitals } from "next/web-vitals";

// Dev-gated Web Vitals logger (FCP, LCP, INP, CLS, TTFB). Dormant unless
// NEXT_PUBLIC_PERF_TRACE=1 so it ships nothing in production. INP is the metric
// that captures the CRUD-interaction latency the estimates-list work targets.
export function WebVitalsProbe() {
  useReportWebVitals((metric) => {
    if (process.env.NEXT_PUBLIC_PERF_TRACE !== "1") return;
    console.log(`[vitals] ${metric.name} ${Math.round(metric.value)} (${metric.id})`);
  });
  return null;
}
