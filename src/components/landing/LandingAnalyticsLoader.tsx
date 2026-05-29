"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useLandingCookieConsent } from "@/lib/landing/useLandingCookieConsent";
import { ClarityScript } from "./ClarityScript";

export function LandingAnalyticsLoader() {
  const { consent } = useLandingCookieConsent();

  if (!consent.analytics) {
    return null;
  }

  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

  return (
    <>
      {gaId && <GoogleAnalytics gaId={gaId} />}
      {clarityId && <ClarityScript projectId={clarityId} />}
    </>
  );
}
