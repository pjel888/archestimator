"use client";

import { useEffect } from "react";

type Metric = {
  name: string;
  value: number;
  rating: string;
};

function getRating(name: string, value: number): string {
  // Standard Core Web Vitals thresholds.
  if (name === "CLS") {
    if (value <= 0.1) return "good";
    if (value <= 0.25) return "needs-improvement";
    return "poor";
  }
  // LCP, INP, FCP, TTFB are in milliseconds.
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    INP: [200, 500],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
  };
  const [good, poor] = thresholds[name] ?? [Infinity, Infinity];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

function postMetric(metric: Metric) {
  const route = window.location.pathname;

  // Use sendBeacon for reliability during page unload; fall back to fetch.
  const payload = JSON.stringify({
    name: metric.name,
    value: Math.round(metric.value * 10000) / 10000,
    rating: metric.rating,
    route,
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/internal/web-vitals", blob);
      return;
    }
  } catch {
    // Fall through to fetch.
  }

  fetch("/api/internal/web-vitals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

/**
 * Collects Core Web Vitals (LCP, CLS, INP, FCP, TTFB) using the native
 * Performance Observer API and posts them to /api/internal/web-vitals for
 * D1 persistence and admin observability. No external dependency required.
 */
export function WebVitalsCollector() {
  useEffect(() => {
    // LCP (Largest Contentful Paint)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        const value = lastEntry.startTime;
        postMetric({ name: "LCP", value, rating: getRating("LCP", value) });
      }
    });
    try {
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      // Type not supported in this browser.
    }

    // CLS (Cumulative Layout Shift)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value ?? 0;
        }
      }
    });
    try {
      clsObserver.observe({ type: "layout-shift", buffered: true });
    } catch {
      // Not supported.
    }
    // Report CLS on page hide.
    const reportCls = () => {
      if (clsValue > 0) {
        postMetric({ name: "CLS", value: clsValue, rating: getRating("CLS", clsValue) });
      }
    };

    // INP (Interaction to Next Paint) — uses event timing.
    let maxInteraction = 0;
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = entry.duration;
        if (duration > maxInteraction) {
          maxInteraction = duration;
        }
      }
    });
    try {
      inpObserver.observe({ type: "event", buffered: true });
    } catch {
      // Not supported.
    }
    const reportInp = () => {
      if (maxInteraction > 0) {
        postMetric({ name: "INP", value: maxInteraction, rating: getRating("INP", maxInteraction) });
      }
    };

    // FCP (First Contentful Paint)
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcp = entries[0];
      if (fcp) {
        postMetric({ name: "FCP", value: fcp.startTime, rating: getRating("FCP", fcp.startTime) });
      }
    });
    try {
      fcpObserver.observe({ type: "paint", buffered: true });
    } catch {
      // Not supported.
    }

    // TTFB (Time to First Byte) — from navigation timing.
    const navEntries = performance.getEntriesByType("navigation");
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      const ttfb = nav.responseStart - nav.requestStart;
      if (ttfb > 0) {
        postMetric({ name: "TTFB", value: ttfb, rating: getRating("TTFB", ttfb) });
      }
    }

    // Report CLS and INP on page hide (best final values).
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        reportCls();
        reportInp();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", () => {
      reportCls();
      reportInp();
    });

    return () => {
      lcpObserver.disconnect();
      clsObserver.disconnect();
      inpObserver.disconnect();
      fcpObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
