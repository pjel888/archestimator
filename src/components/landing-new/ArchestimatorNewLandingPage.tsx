import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  CaretDown,
  DotsNine,
  FileText,
  SealCheck,
  TreeStructure,
} from "@phosphor-icons/react/dist/ssr";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { stringifyJsonLd } from "@/lib/landing/json-ld";
import { EarlyAccessCta, AuthUtilityLink } from "./NewLandingAuthCta";
import { LandingProposalProof } from "./LandingProposalProof";
import { MistralPixelField } from "./MistralPixelField";
import { NewLandingHeroDemo } from "./NewLandingHeroDemo";
import { NewLandingMotionController } from "./NewLandingMotionController";
import styles from "./new-landing.module.css";
import {
  faqCopy,
  finalCtaCopy,
  footerCopy,
  headerCopy,
  heroCopy,
  heroSteps,
  knowledgeCopy,
  workflowCopy,
} from "./new-landing-content";

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqCopy.faqs.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

const workflowStepHrefs = ["#workflow-estimate", "#workflow-proposal", "#workflow-record"] as const;
const workflowStepIcons = {
  scope: TreeStructure,
  decision: FileText,
  history: SealCheck,
} as const;

/**
 * Full-width public landing composition inspired by Mistral's strict grid.
 * Product proof is limited to current Archestimator components using sanitized
 * local data.
 */
export function ArchestimatorNewLandingPage() {
  return (
    <div className={styles.root} data-new-landing-root>
      <NewLandingMotionController />
      <a href="#main-content" className={styles.skipLink}>
        {headerCopy.skipLink}
      </a>
      <NewLandingHeader />
      <main id="main-content">
        <HeroSection />
        <StatementSection />
        <ProductStorySection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <NewLandingFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(faqSchema) }}
      />
    </div>
  );
}

function NewLandingHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brandMark} aria-label="Archestimator home">
          <ArchestimatorLogo markSize={44} showWordmark={false} priority />
        </Link>
        <nav className={styles.desktopNav} aria-label="Primary">
          {headerCopy.nav.map((item) => (
            <a key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className={styles.headerSpacer} aria-hidden="true" />
        <Link href="/contact" className={styles.utilityLink}>
          Contact sales
        </Link>
        <EarlyAccessCta location="header" className={styles.headerCta} />
        <details className={styles.mobileMenu} data-new-landing-menu>
          <summary className={styles.menuSummary} aria-label={headerCopy.menuLabel}>
            <DotsNine size={18} weight="bold" aria-hidden="true" />
          </summary>
          <div className={styles.menuPanel}>
            <nav aria-label="Mobile">
              {headerCopy.nav.map((item) => (
                <a key={item.href} href={item.href} className={styles.menuLink}>
                  {item.label}
                </a>
              ))}
            </nav>
            <div className={styles.menuActions}>
              <AuthUtilityLink className={styles.menuUtility} hideWhenLoggedIn />
              <EarlyAccessCta location="header" />
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className={styles.hero} aria-labelledby="landing-hero-title">
      <div className={styles.heroTop}>
        <div className={styles.heroHeadlineCell}>
          <h1 id="landing-hero-title" className={styles.heroTitle} data-hero-motion="title">
            {heroCopy.titleLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>
        </div>
        <div className={styles.heroStatementCell} data-hero-motion="copy">
          <p className={styles.heroOpening}>{heroCopy.opening}</p>
        </div>
      </div>

      <div className={styles.heroLower}>
        <div className={styles.heroVisualCell} data-hero-motion="scene" aria-hidden="true">
          <MistralPixelField />
        </div>
        <aside className={styles.heroRail} data-hero-motion="rail" aria-label="Pre-release access">
          <div className={styles.heroRailControls} aria-hidden="true">
            <ArrowDown size={12} weight="bold" />
            <ArrowDown size={12} weight="bold" />
            <ArrowDown size={12} weight="bold" />
          </div>
          <p className={styles.heroRailLabel}>Pre-release beta</p>
          <div className={styles.heroRailCard}>
            <strong>Build the estimate. Issue the proposal.</strong>
            <EarlyAccessCta location="hero" className={styles.heroRailCta} />
          </div>
        </aside>
      </div>

      <ol className={styles.heroSteps} data-hero-motion="steps" aria-label="Archestimator workflow">
        {heroSteps.map((step, index) => {
          const StepIcon = workflowStepIcons[step.id];

          return (
            <li key={step.id} className={styles.heroStep}>
              <a href={workflowStepHrefs[index]}>
                <span className={styles.heroStepIndex}>{step.index}</span>
                <StepIcon className={styles.heroStepIcon} size={20} weight="regular" aria-hidden="true" />
                <h2>{step.compactTitle}</h2>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function StatementSection() {
  return (
    <section className={styles.statement} aria-label="Archestimator product promise">
      <p data-new-landing-reveal>
        One connected workflow from working estimate to client-ready proposal, review, and recorded decision.
      </p>
    </section>
  );
}

function ProductStorySection() {
  return (
    <section id="product" className={styles.productStory} aria-labelledby="workflow-title">
      <header className={styles.productStoryIntro} data-new-landing-reveal>
        <p>{workflowCopy.label}</p>
        <h2 id="workflow-title">Do the whole estimating job in one place.</h2>
      </header>

      <div id="workflow" className={styles.productModules}>
        {workflowCopy.chapters.map((chapter, index) => (
          <article
            key={chapter.id}
            id={`workflow-${chapter.id}`}
            className={styles.productModule}
            data-module-tone={chapter.id}
          >
            <header className={styles.moduleHeader} data-new-landing-reveal>
              <div>
                <p className={styles.moduleIndex}>{chapter.index}</p>
                <h3>{chapter.title}</h3>
              </div>
              <a href={index === workflowCopy.chapters.length - 1 ? "#faq" : `#workflow-${workflowCopy.chapters[index + 1].id}`}>
                <span>{chapter.label}</span>
                <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </a>
            </header>
            <p className={styles.moduleBody} data-new-landing-reveal>
              {chapter.body}
            </p>

            <div className={styles.moduleField} data-new-landing-reveal>
              {chapter.id === "estimate" ? <NewLandingHeroDemo /> : null}
              {chapter.id === "proposal" ? <LandingProposalProof /> : null}
              {chapter.id === "record" ? <KnowledgeProof /> : null}
            </div>

            <ul className={styles.moduleTags} aria-label={`${chapter.label} capabilities`}>
              {chapter.features.map((feature) => (
                <li key={feature.title}>{feature.title}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function KnowledgeProof() {
  return (
    <div id="cost-knowledge" className={styles.knowledgeProof}>
      <div>
        <p className={styles.knowledgeLabel}>{knowledgeCopy.label}</p>
        <h4>{knowledgeCopy.title}</h4>
        <p>{knowledgeCopy.body}</p>
      </div>
      <ul>
        {knowledgeCopy.items.map((item, index) => (
          <li key={item}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item}</strong>
          </li>
        ))}
      </ul>
      <p className={styles.knowledgeClosing}>{knowledgeCopy.closing}</p>
    </div>
  );
}

function FaqSection() {
  return (
    <section id="faq" className={styles.faq} aria-labelledby="faq-title">
      <h2 id="faq-title" data-new-landing-reveal>
        {faqCopy.title}
      </h2>
      <div className={styles.faqList} data-new-landing-reveal data-reveal-delay="0.08">
        {faqCopy.faqs.map((faq) => (
          <details key={faq.question} className={styles.faqItem}>
            <summary className={styles.faqSummary}>
              <span>{faq.question}</span>
              <CaretDown size={17} className={styles.faqChevron} aria-hidden="true" />
            </summary>
            <p className={styles.faqAnswer}>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className={styles.finalCta} aria-labelledby="final-cta-title">
      <p className={styles.finalCtaLabel}>{finalCtaCopy.label}</p>
      <h2 id="final-cta-title">{finalCtaCopy.title}</h2>
      <div className={styles.finalCtaFooter}>
        <p>{finalCtaCopy.body}</p>
        <EarlyAccessCta location="final-cta" className={styles.finalPrimaryCta} />
      </div>
    </section>
  );
}

function NewLandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBrand}>
        <Link href="/" className={styles.footerLogo} aria-label="Archestimator home">
          <ArchestimatorLogo markSize={26} />
        </Link>
        <p>{footerCopy.boilerplate}</p>
      </div>
      <nav className={styles.footerNav} aria-label="Footer">
        {footerCopy.links.map((link) => (
          <Link key={link.href} href={link.href} className={styles.footerLink}>
            {link.label}
          </Link>
        ))}
        <AuthUtilityLink className={styles.footerLink} workspaceLabel={footerCopy.workspaceLabel} />
      </nav>
      <p className={styles.footerCopyright}>© {new Date().getFullYear()} Archestimator.</p>
    </footer>
  );
}
