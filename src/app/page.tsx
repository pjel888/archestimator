import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CompanyProofCarouselSection,
  FinalCTASection,
  HeroSection,
  LandingFooter,
  LandingHeader,
  LandingSmoothScrollProvider,
  ProductShowcaseSection,
  SecondaryClaimSection,
  PricingSection,
  SolutionSection,
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
    <div className="min-h-screen bg-[#eeeeec] text-[#111111]">
      <style>{`@keyframes workspace-arrow-bounce { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(4px); } }`}</style>

      <LandingHeader isLoggedIn={isLoggedIn} />

      <LandingSmoothScrollProvider>
        <main data-landing-page-root="true">
          <HeroSection />
          <SecondaryClaimSection />
          <CompanyProofCarouselSection />
          <ProductShowcaseSection />
          <SolutionSection />
          <PricingSection />
          <FinalCTASection />
          <LandingFooter />
        </main>
      </LandingSmoothScrollProvider>
    </div>
  );
}
