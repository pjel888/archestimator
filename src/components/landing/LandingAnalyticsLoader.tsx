"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { isBetaTelemetryProductionEnabled } from "@/lib/landing/beta-telemetry-registry";
import { useLandingCookieConsent } from "@/lib/landing/useLandingCookieConsent";
import { CloudflareWebAnalytics } from "./CloudflareWebAnalytics";
import { ClarityScript } from "./ClarityScript";

export function LandingAnalyticsLoader() {
  const { consent } = useLandingCookieConsent();
  const telemetryEnabled = isBetaTelemetryProductionEnabled({
    nodeEnv: process.env.NODE_ENV,
    enabled: process.env.NEXT_PUBLIC_BETA_TELEMETRY_ENABLED,
  });

  if (!consent.analytics || !telemetryEnabled) {
    return null;
  }

  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  const cloudflareWebAnalyticsToken = process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;

  return (
    <>
      {cloudflareWebAnalyticsToken && <CloudflareWebAnalytics token={cloudflareWebAnalyticsToken} />}
      {gaId && <GoogleAnalytics gaId={gaId} />}
      {clarityId && <ClarityScript projectId={clarityId} />}
    </>
  );
}
