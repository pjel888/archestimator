import { createSupabaseServerClient } from "@/lib/supabase/server";
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

async function getLandingAuthState() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

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
