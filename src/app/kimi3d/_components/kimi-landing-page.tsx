import Image from "next/image";
import Link from "next/link";
import { Jersey_25 } from "next/font/google";
import { preload } from "react-dom";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { cn } from "@/lib/ui/cn";

import AfterHeroSection from "../../../../public/after-hero-1920.webp";
import LandingPageHeroMobileAvif from "../../../../public/landing-hero-day-1280.avif";
import LandingPageHeroMobile from "../../../../public/landing-hero-day-1280.webp";
import LandingPageHeroAvif from "../../../../public/landing-hero-day-2400.avif";
import LandingPageHero from "../../../../public/landing-hero-day-2400.webp";
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
import { HeroAmbitionText } from "./hero-ambition-text";
import { HeroAudienceRoles } from "./hero-audience-roles";
import { HeroVoxelRippleImage } from "./hero-voxel-ripple-image";
import { HeroWorkspaceProof } from "./hero-workspace-proof";
import { KimiSiteHeader } from "./kimi-site-header";
import { LandingMotionLoader } from "./landing-motion-loader";
import { ProposalOutputProof } from "./proposal-output-proof";
import { WorkflowStory } from "./workflow-story";
import styles from "../kimi-landing.module.css";

const jersey25 = Jersey_25({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-jersey-25",
  weight: "400",
});

/**
 * /kimi3d landing composition. A server-rendered workbench narrative: exact
 * workspace proof, an aligned four-step handoff, the current client financial
 * view, and the audience/FAQ/CTA close. Client islands hydrate on top; the full
 * narrative remains available without JavaScript, WebGL, or motion.
 */
export function KimiLandingPage() {
  preload(LandingPageHeroMobileAvif.src, {
    as: "image",
    fetchPriority: "high",
    media: "(max-width: 640px)",
    type: "image/avif",
  });
  preload(LandingPageHeroAvif.src, {
    as: "image",
    fetchPriority: "high",
    media: "(min-width: 641px)",
    type: "image/avif",
  });

  return (
    <div className={cn(styles.root, jersey25.variable)} data-kimi-landing>
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
            <p
              className={styles.heroEyebrow}
              data-hero-reveal="eyebrow"
            >
              {heroCopy.context}
            </p>
            <div className={styles.heroImage} data-hero-reveal="visual">
              <HeroVoxelRippleImage />
              <div className={styles.heroAudienceOverlay}>
                <HeroAudienceRoles roles={heroCopy.audiences} />
              </div>
            </div>
            <div className={styles.heroCopy}>
              <div className={styles.heroStatement}>
                <h1
                  id="hero-title"
                  className={cn(styles.heroTitle, jersey25.className)}
                  data-hero-reveal="title"
                >
                  BUILD WITH{" "}
                  <HeroAmbitionText className={styles.heroTitleAmbition} />
                </h1>
                <p
                  className={styles.heroSubtitle}
                  data-hero-reveal="subtitle"
                >
                  {heroCopy.subtitle}
                </p>
              </div>
              <div className={styles.heroDetails}>
                <p
                  className={styles.heroLeadTitle}
                  data-hero-reveal="lead-title"
                >
                  {heroCopy.leadTitleStart}
                  <span className={styles.heroLeadTitleHighlight}>
                    {heroCopy.leadTitleHighlight}
                  </span>
                </p>
                <p
                  className={styles.heroLead}
                  data-hero-reveal="lead-body"
                >
                  {heroCopy.lead}
                </p>
                <div
                  className={styles.heroCtas}
                  data-hero-reveal="cta"
                >
                  <PrimaryCtaLink />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.pyramidBanner} aria-hidden="true" />

        <section
          className={styles.afterHero}
          aria-label="Intuitive estimating workflow"
        >
          <Image
            src={AfterHeroSection}
            alt=""
            fill
            sizes="100vw"
            loading="lazy"
          />
          <div
            className={styles.afterHeroTabs}
            role="tablist"
            aria-label="Estimating workflow views"
          >
            <div className={cn(styles.container, styles.afterHeroTabsInner)}>
              <button
                id="intuitive-estimating-tab"
                className={styles.afterHeroTab}
                type="button"
                role="tab"
                aria-selected="true"
                aria-controls="intuitive-estimating-panel"
              >
                Intuitive Estimating Workflow
              </button>
            </div>
          </div>
          <div
            id="intuitive-estimating-panel"
            className={cn(styles.container, styles.afterHeroContent)}
            role="tabpanel"
            aria-labelledby="intuitive-estimating-tab"
          >
            <HeroWorkspaceProof className={styles.afterHeroProof} />
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
      <LandingMotionLoader />
    </div>
  );
}
