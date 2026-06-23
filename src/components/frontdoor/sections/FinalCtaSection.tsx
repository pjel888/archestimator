import Link from "next/link";

import { ArrowRight, ArrowUpRight } from "@/components/frontdoor/icons";
import { RevealOnScroll } from "@/components/frontdoor/utilities/RevealOnScroll";
import { SectionEyebrow } from "@/components/frontdoor/utilities/SectionEyebrow";
import styles from "../FrontdoorPage.module.css";

type FinalCtaSectionProps = {
  isLoggedIn: boolean;
};

const START_HREF = "/contact?intent=walkthrough";
const WALKTHROUGH_HREF = "/contact?intent=walkthrough";
const WORKSHOP_HREF = "/workshop";

export function FinalCtaSection({ isLoggedIn }: FinalCtaSectionProps) {
  const primaryHref = isLoggedIn ? WORKSHOP_HREF : START_HREF;
  const primaryLabel = isLoggedIn ? "Open workspace" : "Start with an estimate";

  return (
    <section className={styles.finalCta} aria-labelledby="final-title">
      <div className={styles.finalInner}>
        <RevealOnScroll>
          <SectionEyebrow label="Bring one real estimate" />
        </RevealOnScroll>
        <RevealOnScroll as="h2" className={styles.finalHeading} delayMs={60} id="final-title">
          Bring one real estimate. We will show you what it looks like when the next one starts ahead.
        </RevealOnScroll>
        <RevealOnScroll as="p" className={styles.finalSupport} delayMs={120}>
          We will map the workflow around your prices, suppliers, revisions, and proposal handoff.
        </RevealOnScroll>
        <RevealOnScroll className={styles.ctaRow} delayMs={180} style={{ marginTop: "0.5rem" } as React.CSSProperties}>
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
