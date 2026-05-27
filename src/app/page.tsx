import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";
import {
  CompanyProofCarouselSection,
  FAQSection,
  FinalCTASection,
  HeroSection,
  ProductShowcaseSection,
  SecondaryClaimSection,
  PricingSection,
  SolutionSection,
  PublicPageShell,
  LandingHeader,
  LandingFooter,
  LandingSmoothScrollProvider,
} from "@/components/landing";

export default async function LandingPage() {
  const isLoggedIn = await getLandingAuthState();

  return (
    <PublicPageShell isLoggedIn={isLoggedIn} isHomePage={true}>
      <LandingHeader isLoggedIn={isLoggedIn} isHomePage={true} />
      <LandingSmoothScrollProvider>
        <main data-landing-page-root="true">
          <HeroSection />
          <SecondaryClaimSection />
          <CompanyProofCarouselSection />
          <ProductShowcaseSection />
          <SolutionSection />
          <PricingSection />
          <FAQSection />
          <FinalCTASection />
        </main>
      </LandingSmoothScrollProvider>
      <LandingFooter />
    </PublicPageShell>
  );
}
