import Image from "next/image";
import Link from "next/link";
import { Jersey_25 } from "next/font/google";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { cn } from "@/lib/ui/cn";

import LandingPageHero from "../../../../public/Landing-Page-Hero-v2.png";
import {
  SUPPORT_EMAIL,
  audienceCopy,
  clientProofCopy,
  closingCopy,
  faqCopy,
  footerCopy,
  headerCopy,
  heroCopy,
} from "../_content";
import { PrimaryCtaLink } from "./cta-link";
import { KimiSiteHeader } from "./kimi-site-header";
import { LandingMotion } from "./landing-motion";
import { ProposalOutputProof } from "./proposal-output-proof";
import { WorkflowStory } from "./workflow-story";
import styles from "../kimi-landing.module.css";

const jersey25 = Jersey_25({
  display: "swap",
  subsets: ["latin"],
  weight: "400",
});

/**
 * /kimi3d landing composition. A server-rendered workbench narrative: exact
 * workspace proof, an aligned four-step handoff, the current client financial
 * view, and the audience/FAQ/CTA close. Client islands hydrate on top; the full
 * narrative remains available without JavaScript, WebGL, or motion.
 */
export function KimiLandingPage() {
  return (
    <div className={styles.root} data-kimi-landing>
      <a href="#main" className={styles.skipLink}>
        {headerCopy.skipLink}
      </a>
      <KimiSiteHeader />
      <span
        className={styles.headerSentinel}
        data-header-sentinel
        aria-hidden="true"
      />

      <main id="main">
        {/* 1. Hero: a single architectural image, then product and action. */}
        <section
          id="product"
          className={styles.hero}
          aria-labelledby="hero-title"
        >
          <div className={styles.container}>
            <p className={styles.heroEyebrow} data-hero-reveal>
              {heroCopy.context}
            </p>
            <div className={styles.heroImage} data-hero-reveal>
              <Image
                src={LandingPageHero}
                alt="The ancient Parthenon seen from across the Acropolis at an orange sunset"
                fill
                priority
                sizes="(max-width: 1664px) calc(100vw - 40px), 1600px"
              />
            </div>
            <div className={styles.heroCopy}>
              <div className={styles.heroStatement}>
                <h1
                  id="hero-title"
                  className={cn(styles.heroTitle, jersey25.className)}
                  data-hero-reveal
                >
                  {heroCopy.title}
                  <span className={styles.heroTitlePeriod}>.</span>
                </h1>
                <p className={styles.heroSubtitle} data-hero-reveal>
                  {heroCopy.subtitle}
                </p>
              </div>
              <div className={styles.heroDetails}>
                <p className={styles.heroLead} data-hero-reveal>
                  {heroCopy.lead}
                </p>
                <div className={styles.heroCtas} data-hero-reveal>
                  <PrimaryCtaLink />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Four-step workflow runway. Nothing pins or arrests native scroll. */}
        <WorkflowStory />

        {/* 3. Client-facing financial proof. */}
        <section
          id="proof"
          className={styles.proofModules}
          aria-labelledby="client-proof-title"
        >
          <article className={styles.proofChapter}>
            <div className={styles.container}>
              <div className={styles.proofModule} data-section-reveal>
                <div className={styles.proofModuleCopy}>
                  <h2
                    id="client-proof-title"
                    className={styles.proofModuleTitle}
                  >
                    {clientProofCopy.title}
                  </h2>
                  <p className={styles.proofModuleBody}>
                    {clientProofCopy.body}
                  </p>
                </div>
                <div className={styles.proofModuleSlot}>
                  <ProposalOutputProof />
                </div>
              </div>
            </div>
          </article>
        </section>

        {/* 4. Audience and concise FAQ. */}
        <section className={styles.company} aria-labelledby="audience-title">
          <div className={styles.container}>
            <div className={styles.companyGrid}>
              <div className={styles.audience} data-section-reveal>
                <h2 id="audience-title" className={styles.sectionTitle}>
                  {audienceCopy.headline}
                </h2>
                <p className={cn(styles.sectionLead, styles.audienceLead)}>
                  {audienceCopy.lead}
                </p>
                <ul className={styles.roleList}>
                  {audienceCopy.roles.map((role) => (
                    <li key={role} className={styles.roleItem}>
                      {role}
                    </li>
                  ))}
                </ul>
              </div>
              <div id="faq" className={styles.faq} data-section-reveal>
                <h2 className={styles.faqTitle}>{faqCopy.headline}</h2>
                <div className={styles.faqList}>
                  {faqCopy.faqs.map((faq) => (
                    <details key={faq.question} className={styles.faqItem}>
                      <summary>
                        {faq.question}
                        <span className={styles.faqMark} aria-hidden="true" />
                      </summary>
                      <p className={styles.faqAnswer}>{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Closing CTA. */}
        <section className={styles.closing} aria-labelledby="closing-title">
          <div className={styles.container}>
            <div className={styles.closingGrid} data-section-reveal>
              <div className={styles.closingCopy}>
                <h2 id="closing-title" className={styles.sectionTitle}>
                  {closingCopy.headline}
                </h2>
                <p className={styles.closingBody}>{closingCopy.body}</p>
              </div>
              <div className={styles.closingCta}>
                <PrimaryCtaLink />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <ArchestimatorLogo
                tone="dark"
                markSize={28}
                className={styles.footerLogo}
                wordmarkClassName={styles.footerLogoWordmark}
                separatorClassName={styles.footerLogoSeparator}
              />
              <p className={styles.footerBoiler}>{footerCopy.boilerplate}</p>
            </div>
            <nav className={styles.footerNav} aria-label="Footer">
              {footerCopy.links.map((link) => (
                <Link key={link.label} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className={styles.footerMeta}>
              <span className={styles.monoLabel}>
                {footerCopy.contactLabel}
              </span>
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </div>
          </div>
        </div>
      </footer>
      <LandingMotion />
    </div>
  );
}
