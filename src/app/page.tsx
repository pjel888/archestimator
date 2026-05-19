import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CustomerLogosSection,
  EstimatorEngineSection,
  FeaturesSection,
  FinalCTASection,
  HeroSection,
  LandingHeader,
  ProductShowcaseSection,
  PartnerSection,
  PricingSection,
  SolutionSection,
  TestimonialSection,
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
        <CustomerLogosSection />
        <SolutionSection />
        <EstimatorEngineSection />

        <TestimonialSection
          quote="If you're trying to replace spreadsheet chaos with a single estimating system, my advice would be to start where revisions and proposal risk actually happen."
          name="Mara Santos"
          role="Principal Estimator at Northpoint Build"
          imageLabel="headshot placeholder"
        />

        <FeaturesSection />

        <TestimonialSection
          quote="Our estimating team is dramatically faster when quantities, pricing assumptions, and proposal language stay connected in one workspace."
          name="Luis Mercado"
          role="Operations Lead at MasonWorks"
          imageLabel="customer image placeholder"
          reverse
        />

        <PartnerSection />

        <TestimonialSection
          quote="The best part is not just producing a total faster. It is knowing what changed, why it changed, and what the client is actually agreeing to."
          name="George Dilthey"
          role="Head of Support at FieldOps Builders"
          imageLabel="partner headshot"
        />

        <PricingSection />
        <FinalCTASection />
      </main>
    </div>
  );
}
