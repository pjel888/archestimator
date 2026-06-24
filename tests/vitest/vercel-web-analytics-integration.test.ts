import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { redactVercelAnalyticsEvent } from "@/lib/analytics/vercel-web-analytics";

const performancePlanDir = existsSync(".ai/03_plans/2026-06-05-performance-and-speed")
  ? ".ai/03_plans/2026-06-05-performance-and-speed"
  : ".ai/09_archive/2026-06-05-performance-and-speed";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  dependencies?: Record<string, string>;
};
const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
const analyticsComponent = readFileSync("src/components/analytics/VercelWebAnalytics.tsx", "utf8");
const telemetryDecision = readFileSync(
  `${performancePlanDir}/20-telemetry-privacy-decision-record.md`,
  "utf8",
);

describe("Vercel Web Analytics integration", () => {
  it("loads the supported Next.js Analytics component with a redaction policy", () => {
    expect(packageJson.dependencies).toHaveProperty("@vercel/analytics");
    expect(rootLayout).toContain('import { VercelWebAnalytics } from "@/components/analytics/VercelWebAnalytics";');
    expect(rootLayout).toContain('const enableVercelMetrics = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS_IN_DEV === "1";');
    expect(rootLayout).toContain("<VercelWebAnalytics />");
    expect(analyticsComponent).toContain('"use client";');
    expect(analyticsComponent).toContain('import { Analytics } from "@vercel/analytics/next";');
    expect(analyticsComponent).toContain('import { redactVercelAnalyticsEvent } from "@/lib/analytics/vercel-web-analytics";');
    expect(analyticsComponent).toContain("<Analytics beforeSend={redactVercelAnalyticsEvent} />");
  });

  it("mounts Speed Insights (Option B, owner-approved 2026-06-20) for real-user field metrics", () => {
    expect(packageJson.dependencies).toHaveProperty("@vercel/speed-insights");
    expect(rootLayout).toContain('import { SpeedInsights } from "@vercel/speed-insights/next";');
    expect(rootLayout).toContain("enableVercelMetrics ? (");
    expect(rootLayout).toContain("<SpeedInsights />");
    // Web Analytics keeps its stricter beforeSend drop-policy regardless of Speed Insights.
    expect(analyticsComponent).toContain("<Analytics beforeSend={redactVercelAnalyticsEvent} />");
  });

  it("records the owner-approved Option B telemetry decision with route-pattern privacy rationale", () => {
    expect(telemetryDecision).toContain("Option B adopted (owner-approved)");
    expect(telemetryDecision).toContain("route patterns");
    expect(telemetryDecision).toContain("Web Analytics keeps its stricter drop-policy unchanged");
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
