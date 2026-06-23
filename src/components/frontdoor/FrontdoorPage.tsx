import {
  FaqSection,
  FeatureTriplet,
  FinalCtaSection,
  HeroSection,
  LandingFooter,
  LandingNav,
  LongFormFeatureSection,
  ProblemTransitionSection,
  ProductProofBento,
  WordWallSection,
} from "./sections";
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
      <ProductProofBento />
      <FeatureTriplet />

      <LongFormFeatureSection
        ordinal="06"
        eyebrow="WORKFLOW LOOP"
        heading="Build the estimate once. Reuse the logic. Keep the proposal aligned."
        paragraphs={[
          "Estimate, library, revision, and proposal live in one workspace. No more file drift between tabs and inboxes.",
          "Start the next estimate with what the last one taught you. The work compounds.",
        ]}
        ctaLabel="See the feature tour"
        ctaHref="/features"
        screenshotTag="WORKFLOW"
        aspect="16:10"
      />

      <LongFormFeatureSection
        ordinal="07"
        eyebrow="COST INTELLIGENCE DIRECTION"
        heading="The more you estimate, the more it works for you."
        paragraphs={[
          "Every estimate teaches Archestimator your prices, your suppliers, and your project patterns.",
          "Cross-project client and typology recall is roadmap. The compounding foundation is live today.",
        ]}
        ctaLabel="Read trust notes"
        ctaHref="/trust"
        screenshotTag="LIBRARY"
        aspect="4:5"
        reverse
      />

      <LongFormFeatureSection
        ordinal="08"
        eyebrow="TRUST AND RECORDS"
        heading="Fast is useful only if the number is still explainable."
        paragraphs={[
          "Activity and row version history keep every revision traceable. The estimate stops being detective work.",
          "Shared proposal links carry comments, decisions, and a recoverable record. Clients see what they are approving.",
        ]}
        ctaLabel="Book a walkthrough"
        ctaHref="/contact?intent=walkthrough"
        screenshotTag="ACTIVITY"
        aspect="16:10"
      />

      <FaqSection />
      <FinalCtaSection isLoggedIn={isLoggedIn} />
      <AsciiDivider />
      <LandingFooter />
    </main>
  );
}
