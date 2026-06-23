import { FaqSection } from "./sections/FaqSection";
import { FeatureTriplet } from "./sections/FeatureTriplet";
import { FinalCtaSection } from "./sections/FinalCtaSection";
import { HeroSection } from "./sections/HeroSection";
import { LandingFooter } from "./sections/LandingFooter";
import { LandingNav } from "./sections/LandingNav";
import { LongFormFeatureSection } from "./sections/LongFormFeatureSection";
import { ProblemTransitionSection } from "./sections/ProblemTransitionSection";
import { ProductLoopBento } from "./sections/ProductLoopBento";
import { WordWallSection } from "./sections/WordWallSection";
import { AsciiDivider } from "./utilities/AsciiDivider";
import styles from "./FrontdoorPage.module.css";

type FrontdoorPageProps = {
  isLoggedIn: boolean;
};

export function FrontdoorPage({ isLoggedIn }: FrontdoorPageProps) {
  return (
    <main
      id="main-content"
      className={styles.page}
      data-landing-page-root="true"
      data-frontdoor-root="cost-intelligence"
    >
      <LandingNav isLoggedIn={isLoggedIn} />
      <HeroSection isLoggedIn={isLoggedIn} />
      <WordWallSection />
      <ProblemTransitionSection />
      <ProductLoopBento />
      <FeatureTriplet />

      <LongFormFeatureSection
        idSlug="structure"
        eyebrow="Estimate structure"
        heading="Estimate once, then reuse the structure."
        paragraphs={[
          "Project tree, scope rows, quantities, source notes, and proposal state live in one workspace. The next estimate starts from a cleaner record.",
          "Reusable structure means the team can move faster without losing why the total changed.",
        ]}
        ctaLabel="See the feature tour"
        ctaHref="/features"
        screenshotTag="Estimate structure"
        surface="estimate"
        aspect="16:10"
      />

      <LongFormFeatureSection
        idSlug="library"
        eyebrow="Cost history"
        heading="Keep cost history attached to the work."
        paragraphs={[
          "Your prices, suppliers, variants, and source notes stay connected to the estimates that used them.",
          "When scope repeats, your team starts from known commercial logic instead of a copied sheet.",
        ]}
        ctaLabel="Read trust notes"
        ctaHref="/trust"
        screenshotTag="Cost library"
        surface="library"
        aspect="4:5"
        reverse
      />

      <LongFormFeatureSection
        idSlug="record"
        eyebrow="Proposal record"
        heading="Turn proposal review into a record."
        paragraphs={[
          "Shared proposal links carry comments, decisions, and exports back to the estimate instead of leaving them in email.",
          "Clients see what they are approving, and the team keeps a recoverable trail when the work changes.",
        ]}
        ctaLabel="Book a walkthrough"
        ctaHref="/contact?intent=walkthrough"
        screenshotTag="Proposal handoff"
        surface="proposal"
        aspect="16:10"
      />

      <FaqSection />
      <FinalCtaSection isLoggedIn={isLoggedIn} />
      <AsciiDivider />
      <LandingFooter />
    </main>
  );
}
