import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  EstimatorEngineSection,
  FeaturesSection,
  FinalCTASection,
  HeroSection,
  LandingHeader,
  ProductShowcaseSection,
  SecondaryClaimSection,
  PartnerSection,
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

      <main>
        <HeroSection />
        <ProductShowcaseSection />
        <SecondaryClaimSection />
        <SolutionSection />
        <EstimatorEngineSection />

        <FeaturesSection />

        <PartnerSection />

        <PricingSection />
        <FinalCTASection />
      </main>
    </div>
  );
}
