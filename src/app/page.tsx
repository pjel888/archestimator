import type { Metadata } from "next";
import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";
import { cookies } from "next/headers";
import { parseLandingConsentValue } from "@/lib/landing/consent";
import { getVariant } from "@/lib/ab-testing/variant-assigner";
import { ArchestimatorLandingPage } from "@/components/landing-v3/ArchestimatorLandingPage";
import { buildLandingMetadata } from "@/lib/landing/seo-metadata";
import {
  PublicPageShell,
  ABExperimentProvider,
} from "@/components/landing";

export const metadata: Metadata = buildLandingMetadata({
  title: "Archestimator — Construction estimating, proposals and approvals",
  description:
    "Build structured estimates from reusable cost knowledge, send client-ready proposals, capture revisions, and keep approvals on record in one connected workspace.",
  path: "/",
});

export default async function LandingPage() {
  // Read consent server-side to gate A/B cookie creation
  const [isLoggedIn, cookieStore] = await Promise.all([getLandingAuthState(), cookies()]);
  const consentCookie = cookieStore.get("archestimator_cookie_consent");
  const consent = consentCookie ? parseLandingConsentValue(consentCookie.value) : null;
  const analyticsConsent = consent?.analytics === true;

  // Retrieve the assigned A/B copy variant
  const heroVariant = await getVariant("hero-cta-copy", { analyticsConsent });

  return (
    <PublicPageShell isLoggedIn={isLoggedIn} isHomePage={true}>
      <ABExperimentProvider experimentId="hero-cta-copy" variant={heroVariant}>
        <ArchestimatorLandingPage isLoggedIn={isLoggedIn} />
      </ABExperimentProvider>
    </PublicPageShell>
  );
}
