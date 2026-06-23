import Link from "next/link";

import { FrontdoorHeroField } from "../FrontdoorHeroField";
import { ArrowRight, ArrowUpRight } from "@/components/frontdoor/icons";
import { RevealOnScroll } from "@/components/frontdoor/utilities/RevealOnScroll";
import { SectionEyebrow } from "@/components/frontdoor/utilities/SectionEyebrow";
import styles from "../FrontdoorPage.module.css";

type HeroSectionProps = {
  isLoggedIn: boolean;
};

const REQUEST_ACCESS_HREF = "/contact?intent=early-access";
const WALKTHROUGH_HREF = "/contact?intent=walkthrough";
const WORKSHOP_HREF = "/workshop";

export function HeroSection({ isLoggedIn }: HeroSectionProps) {
  const primaryHref = isLoggedIn ? WORKSHOP_HREF : REQUEST_ACCESS_HREF;
  const primaryLabel = isLoggedIn ? "Open workspace" : "Request early access";

  return (
    <section className={styles.hero} aria-labelledby="frontdoor-title">
      <FrontdoorHeroField className={styles.heroField} />
      <div className={styles.heroWash} aria-hidden="true" />
      <span className={styles.heroEditorial} aria-hidden="true">
        01<span className={styles.heroEditorialSlash}>/</span>04
      </span>
      <div className={styles.heroInner}>
        <RevealOnScroll className={styles.heroEyebrowRow}>
          <SectionEyebrow ordinal="01" label="COST INTELLIGENCE LAYER" />
          <span className={styles.maturityPill}>Pre-launch MVP preview</span>
        </RevealOnScroll>

        <div className={styles.heroMain}>
          <RevealOnScroll as="h1" className={styles.heroTitle} delayMs={60} id="frontdoor-title">
            Your cost intelligence layer.
          </RevealOnScroll>
          <RevealOnScroll as="p" className={styles.heroSupport} delayMs={120}>
            Build AEC estimates from your own prices and suppliers, keep every revision on the
            record, and send proposals clients can review and approve.
          </RevealOnScroll>
        </div>

        <RevealOnScroll className={styles.ctaRow} delayMs={200}>
          <Link href={primaryHref} className={`${styles.ctaPrimary} ${styles.ctaPrimaryHero}`}>
            <span>{primaryLabel}</span>
            <span className={styles.ctaArrowIsland} aria-hidden="true">
              <ArrowRight />
            </span>
          </Link>
          <Link href={WALKTHROUGH_HREF} className={styles.ctaSecondary}>
            <span>Book a walkthrough</span>
            <span className={styles.ctaArrowIsland} aria-hidden="true">
              <ArrowUpRight />
            </span>
          </Link>
        </RevealOnScroll>
      </div>
    </section>
  );
}
