import Link from "next/link";

import { FrontdoorHeroField } from "../FrontdoorHeroField";
import { ArrowRight, ArrowUpRight } from "@/components/frontdoor/icons";
import { RevealOnScroll } from "@/components/frontdoor/utilities/RevealOnScroll";
import styles from "../FrontdoorPage.module.css";

type HeroSectionProps = {
  isLoggedIn: boolean;
};

const START_HREF = "/contact?intent=walkthrough";
const WALKTHROUGH_HREF = "/contact?intent=walkthrough";
const WORKSHOP_HREF = "/workshop";

export function HeroSection({ isLoggedIn }: HeroSectionProps) {
  const primaryHref = isLoggedIn ? WORKSHOP_HREF : START_HREF;
  const primaryLabel = isLoggedIn ? "Open workspace" : "Start with an estimate";

  return (
    <section className={styles.hero} aria-labelledby="frontdoor-title">
      <FrontdoorHeroField className={styles.heroField} />
      <div className={styles.heroWash} aria-hidden="true" />
      <div className={styles.heroInner}>
        <div className={styles.heroMain}>
          <RevealOnScroll as="h1" className={styles.heroTitle} delayMs={60} id="frontdoor-title">
            Your cost intelligence workspace.
          </RevealOnScroll>
          <RevealOnScroll as="p" className={styles.heroSupport} delayMs={120}>
            Build from your own prices and suppliers, keep every revision traceable, and send
            proposal links clients can review without losing the logic behind the number.
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
