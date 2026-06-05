"use client";

import { Analytics } from "@vercel/analytics/next";

import { redactVercelAnalyticsEvent } from "@/lib/analytics/vercel-web-analytics";

export function VercelWebAnalytics() {
  return <Analytics beforeSend={redactVercelAnalyticsEvent} />;
}
