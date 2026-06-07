import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";
import { cookies } from "next/headers";
import { parseLandingConsentValue } from "@/lib/landing/consent";
import { getVariant } from "@/lib/ab-testing/variant-assigner";
import {
  FinalCTASection,
  HeroSection,
  SecondaryClaimSection,
  PricingSection,
  PublicPageShell,
  LandingHeader,
  LandingFooter,
  LandingSmoothScrollProvider,
  ABExperimentProvider,
} from "@/components/landing";

export default async function LandingPage() {
  const isLoggedIn = await getLandingAuthState();

  // Read consent server-side to gate A/B cookie creation
  const cookieStore = await cookies();
  const consentCookie = cookieStore.get("archestimator_cookie_consent");
  const consent = consentCookie ? parseLandingConsentValue(consentCookie.value) : null;
  const analyticsConsent = consent?.analytics === true;

  // Retrieve the assigned A/B copy variant
  const heroVariant = await getVariant("hero-cta-copy", { analyticsConsent });

  return (
    <PublicPageShell isLoggedIn={isLoggedIn} isHomePage={true}>
      <ABExperimentProvider experimentId="hero-cta-copy" variant={heroVariant}>
        <LandingHeader isLoggedIn={isLoggedIn} isHomePage={true} />
        <LandingSmoothScrollProvider>
          <main data-landing-page-root="true">
            <HeroSection variant={heroVariant} />
            <SecondaryClaimSection />
            <PricingSection isLoggedIn={isLoggedIn} />
            <FinalCTASection isLoggedIn={isLoggedIn} />
          </main>
        </LandingSmoothScrollProvider>
        <LandingFooter isLoggedIn={isLoggedIn} />
      </ABExperimentProvider>
    </PublicPageShell>
  );
}
