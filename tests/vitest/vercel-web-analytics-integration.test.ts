import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { redactVercelAnalyticsEvent } from "@/lib/analytics/vercel-web-analytics";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  dependencies?: Record<string, string>;
};
const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const analyticsComponent = readFileSync("src/components/analytics/VercelWebAnalytics.tsx", "utf8");
const telemetryDecision = readFileSync(
  ".ai/03_plans/2026-06-05-performance-and-speed/20-telemetry-privacy-decision-record.md",
  "utf8",
);

describe("Vercel Web Analytics integration", () => {
  it("loads the supported Next.js Analytics component with a redaction policy", () => {
    expect(packageJson.dependencies).toHaveProperty("@vercel/analytics");
    expect(rootLayout).toContain('import { VercelWebAnalytics } from "@/components/analytics/VercelWebAnalytics";');
    expect(rootLayout).toContain("<VercelWebAnalytics />");
    expect(analyticsComponent).toContain('"use client";');
    expect(analyticsComponent).toContain('import { Analytics } from "@vercel/analytics/next";');
    expect(analyticsComponent).toContain('import { redactVercelAnalyticsEvent } from "@/lib/analytics/vercel-web-analytics";');
    expect(analyticsComponent).toContain("<Analytics beforeSend={redactVercelAnalyticsEvent} />");
  });

  it("keeps Speed Insights removed while enabling Web Analytics", () => {
    expect(packageJson.dependencies).not.toHaveProperty("@vercel/speed-insights");
    expect(rootLayout).not.toContain("SpeedInsights");
    expect(rootLayout).not.toContain("@vercel/speed-insights");
    expect(analyticsComponent).not.toContain("SpeedInsights");
    expect(analyticsComponent).not.toContain("@vercel/speed-insights");
  });

  it("locks the PR-1A dashboard-only telemetry decision until owner-approved provider proof exists", () => {
    expect(telemetryDecision).toContain("Status:** closed for PR-1A");
    expect(telemetryDecision).toContain("Option A — dashboard/provider-only Speed Insights, no package change");
    expect(telemetryDecision).toContain("must not add `@vercel/speed-insights`");
    expect(telemetryDecision).toContain("TELEMETRY DECISION IMPLEMENTED / PROVIDER PROOF OPEN");
    expect(telemetryDecision).toContain("Vercel Speed Insights dashboard/export p75 route/device metrics remain required");
  });

  it("drops tokenized share and invite page views before Vercel receives them", () => {
    expect(
      redactVercelAnalyticsEvent({
        type: "pageview",
        url: "https://www.archestimator.com/share/raw-share-token?recipient=raw-recipient-token",
      }),
    ).toBeNull();
    expect(
      redactVercelAnalyticsEvent({
        type: "pageview",
        url: "https://www.archestimator.com/invite/raw-invite-token/continue?next=/workshop",
      }),
    ).toBeNull();
  });

  it("drops authenticated workspace page views before Vercel receives them", () => {
    expect(
      redactVercelAnalyticsEvent({
        type: "pageview",
        url: "https://www.archestimator.com/workshop/projects/project-id/estimates/estimate-id",
      }),
    ).toBeNull();
    expect(redactVercelAnalyticsEvent({ type: "pageview", url: "/workshop/settings?tab=account" })).toBeNull();
  });

  it("strips query strings and hash fragments from allowed public page views", () => {
    expect(
      redactVercelAnalyticsEvent({
        type: "pageview",
        url: "https://www.archestimator.com/pricing?utm_source=newsletter&next=/share/raw-share-token#plans",
      }),
    ).toEqual({
      type: "pageview",
      url: "https://www.archestimator.com/pricing",
    });

    expect(redactVercelAnalyticsEvent({ type: "pageview", url: "/features?recipient=raw-recipient-token#compare" })).toEqual({
      type: "pageview",
      url: "/features",
    });
  });

  it("fails closed when the analytics event URL is malformed", () => {
    expect(redactVercelAnalyticsEvent({ type: "pageview", url: "https://[not-a-host]/share/raw-token" })).toBeNull();
  });
});
