import { describe, expect, it } from "vitest";

import {
  evaluateSpeedInsightsReadiness,
  extractJsonObject,
  getMetricValueFromSummary,
  parseMetricPayload,
  summarizeMetric,
} from "@/../scripts/check-vercel-speed-insights-readiness";

describe("Vercel Speed Insights readiness checker", () => {
  it("extracts JSON from Vercel CLI output with banner text", () => {
    expect(extractJsonObject('Vercel CLI 54.6.1\n{"summary":[]}')).toBe('{"summary":[]}');
  });

  it("parses metric payloads and derives metric values", () => {
    const payload = parseMetricPayload(JSON.stringify({
      query: { metric: "vercel.speed_insights_metric.lcp", groupBy: [] },
      summary: [{ vercel_speed_insights_metric_lcp_p75: 1234 }],
      data: [{ timestamp: "2026-06-06T00:00:00.000Z" }],
      statistics: { rowsRead: 1 },
    }));

    expect(getMetricValueFromSummary(payload.summary, "lcp", "p75")).toBe(1234);
    expect(summarizeMetric("lcp", payload, payload)).toMatchObject({
      metric: "lcp",
      threshold: 2500,
      hasCurrentDeploymentData: true,
      valueForThreshold: 1234,
      goodThresholdMet: true,
      dataPointCount: 1,
    });
  });

  it("fails closed when current deployment has no Speed Insights rows", () => {
    const emptyPayload = parseMetricPayload(JSON.stringify({
      query: { metric: "vercel.speed_insights_metric.lcp", groupBy: [] },
      summary: [],
      data: [],
      statistics: { rowsRead: 0 },
    }));

    const result = evaluateSpeedInsightsReadiness({
      currentDeploymentId: "dpl_current",
      metricSummaries: {
        fcp: summarizeMetric("fcp", emptyPayload, emptyPayload),
        lcp: summarizeMetric("lcp", emptyPayload, emptyPayload),
        inp: summarizeMetric("inp", emptyPayload, emptyPayload),
        cls: summarizeMetric("cls", emptyPayload, emptyPayload),
        ttfb_ms: summarizeMetric("ttfb_ms", emptyPayload, emptyPayload),
      },
      targetResScore: 95,
    });

    expect(result.currentDeploymentDataReady).toBe(false);
    expect(result.coreVitalsGood).toBe(false);
    expect(result.resCompletionReady).toBe(false);
    expect(result.missing).toContain("current-deployment Speed Insights rows for FCP/LCP/INP/CLS");
  });

  it("requires a dashboard RES value for exact 95+ completion", () => {
    const metricSummaries = {
      fcp: { metric: "fcp", threshold: 1800, hasCurrentDeploymentData: true, valueForThreshold: 1200, goodThresholdMet: true, dataPointCount: 4 },
      lcp: { metric: "lcp", threshold: 2500, hasCurrentDeploymentData: true, valueForThreshold: 1800, goodThresholdMet: true, dataPointCount: 4 },
      inp: { metric: "inp", threshold: 200, hasCurrentDeploymentData: true, valueForThreshold: 70, goodThresholdMet: true, dataPointCount: 4 },
      cls: { metric: "cls", threshold: 0.1, hasCurrentDeploymentData: true, valueForThreshold: 0, goodThresholdMet: true, dataPointCount: 4 },
      ttfb_ms: { metric: "ttfb_ms", threshold: 800, hasCurrentDeploymentData: true, valueForThreshold: 150, goodThresholdMet: true, dataPointCount: 4 },
    } as const;

    expect(evaluateSpeedInsightsReadiness({
      currentDeploymentId: "dpl_current",
      metricSummaries,
      targetResScore: 95,
    }).resCompletionReady).toBe(false);

    expect(evaluateSpeedInsightsReadiness({
      currentDeploymentId: "dpl_current",
      metricSummaries,
      targetResScore: 95,
      dashboardResScore: 96,
    }).resCompletionReady).toBe(true);
  });
});
