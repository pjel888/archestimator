/**
 * Landing component barrel.
 *
 * Exports the Glass-Brand landing system. The OLD flat section files
 * (HeroSection.tsx with banned "Win More Bids" copy, CompanyProofCarouselSection
 * with fabricated testimonials, FinalCTASection, SecondaryClaimSection, etc.)
 * are intentionally NOT re-exported — they are on the removal rail (L-REM-1..4)
 * and replaced by the `sections/` directory. They remain on disk for the
 * Phase 8 deletion rail; new code imports from `./sections/*` directly.
 */
export { AnnouncementBanner } from "./AnnouncementBanner";
export { AnimatedProposalRecordSection } from "./AnimatedProposalRecordSection";
export { CookieConsentBanner } from "./CookieConsentBanner";
export { CtaLink } from "./CtaLink";
export { LandingFooter } from "./LandingFooter";
export { LandingHeader } from "./LandingHeader";
export { LandingSmoothScrollProvider } from "./LandingSmoothScrollProvider";
export { PublicPageShell } from "./PublicPageShell";
export { ContactForm } from "./ContactForm";
export { ClarityScript } from "./ClarityScript";
export { LandingAnalyticsLoader } from "./LandingAnalyticsLoader";
export { ABExperimentProvider } from "./ABExperimentProvider";

// Shell client + maturity tag (Glass Brand foundation).
export { LandingShellClient } from "./shell/LandingShellClient";
export { MaturityTag } from "./shell/MaturityTag";
