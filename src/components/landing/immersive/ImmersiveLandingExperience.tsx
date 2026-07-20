import Link from "next/link";
import { ImmersiveLandingHeader } from "./ImmersiveLandingHeader";
import { LivingEstimateStory } from "./LivingEstimateStory.client";
import {
  EARLY_ACCESS_HREF,
  benefits,
  close,
  footerLine,
  footerLinks,
} from "./content";
import styles from "./immersive.module.css";

/**
 * The immersive `/new` landing experience — four main narrative sections
 * plus a compact footer:
 *   1. Hero + Living Estimate (100svh, inside the story track)
 *   2. Scroll-controlled product story (inside the story track)
 *   3. Why it matters
 *   4. Early access close + footer
 * All copy is server-rendered semantic DOM; the scene is decorative.
 */
export function ImmersiveLandingExperience() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <ImmersiveLandingHeader />
      <main id="main-content">
        <LivingEstimateStory />

        <section className={styles.benefits} aria-labelledby="immersive-benefits-title">
          <div className={styles.benefitsInner}>
            <h2 id="immersive-benefits-title" className={styles.benefitsHeading}>
              {benefits.heading}
            </h2>
            <p className={styles.benefitsPhrases}>
              {benefits.phrases.map((phrase, index) => (
                <span key={phrase} className={styles.benefitsPhrasePart}>
                  <span className={styles.benefitsPhrase}>{phrase}</span>
                  {index < benefits.phrases.length - 1 ? (
                    <span aria-hidden="true" className={styles.benefitsPhraseSeparator}>
                      ·
                    </span>
                  ) : null}
                </span>
              ))}
            </p>
            <p className={styles.benefitsBody}>{benefits.body}</p>
            <p className={styles.benefitsStatus}>{benefits.status}</p>
          </div>
        </section>

        <section className={styles.close} aria-labelledby="immersive-close-title">
          <div className={styles.closeInner}>
            <h2 id="immersive-close-title" className={styles.closeHeading}>
              {close.heading}
            </h2>
            <p className={styles.closeBody}>{close.body}</p>
            <p className={styles.closeCtaRow}>
              <Link href={EARLY_ACCESS_HREF} className={styles.cta}>
                {close.ctaLabel}
              </Link>
            </p>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <nav className={styles.footerNav} aria-label="Footer">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className={styles.footerLink}>
              {link.label}
            </Link>
          ))}
        </nav>
        <p className={styles.footerLine}>{footerLine}</p>
      </footer>
    </div>
  );
}
