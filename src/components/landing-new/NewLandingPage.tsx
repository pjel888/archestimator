import Link from "next/link";
import {
  ArrowRight,
  ChatsCircle,
  ClockCounterClockwise,
  FileXls,
} from "@phosphor-icons/react/dist/ssr";
import { ArchestimatorLogo, ArchestimatorLogoMark } from "@/components/brand/ArchestimatorLogo";
import { EstimateFixtureSheet } from "./EstimateFixtureSheet";
import { LivingEstimatePoster } from "./LivingEstimatePoster";
import { LivingEstimateSceneLoader } from "./LivingEstimateSceneLoader";
import { NewLandingMotion } from "./NewLandingMotion";
import {
  audienceLine,
  contrast,
  costKnowledge,
  faq,
  finalCta,
  fixture,
  footer,
  hero,
  nav,
  proofChapters,
  trust,
} from "./landing-content";
import styles from "./new-landing.module.css";

function PrimaryCta({ location }: { location: string }) {
  return (
    <Link
      href={nav.cta.href}
      className={styles.ctaPrimary}
      data-new-landing-cta="primary"
      data-new-landing-location={location}
    >
      <span>{nav.cta.label}</span>
      <span className={styles.ctaIconOrb} aria-hidden="true">
        <ArrowRight size={14} weight="bold" />
      </span>
    </Link>
  );
}

function NewLandingNav() {
  return (
    <header className={styles.nav} data-nav>
      <a href="#new-main" className={styles.skipLink}>
        Skip to content
      </a>
      <div className={styles.navInner}>
        <Link href="/" className={styles.navBrand} aria-label="Archestimator home">
          <ArchestimatorLogo
            tone="dark"
            markSize={28}
            markClassName={styles.logoMark}
            separatorClassName={styles.logoSeparator}
            wordmarkClassName={styles.logoWordmark}
            priority
          />
        </Link>
        <nav className={styles.navLinks} aria-label="Primary">
          {nav.links.map((item) => (
            <Link key={item.label} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.navActions}>
          <Link href={nav.signIn.href} className={styles.signInLink}>
            {nav.signIn.label}
          </Link>
          <PrimaryCta location="nav" />
        </div>
        <details className={styles.mobileMenu}>
          <summary aria-label="Open navigation">
            <span>Menu</span>
          </summary>
          <nav aria-label="Mobile primary">
            {nav.links.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href={nav.signIn.href}>{nav.signIn.label}</Link>
            <Link href={nav.cta.href}>{nav.cta.label}</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className={styles.hero} aria-labelledby="new-hero-title" data-hero-root>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow} data-hero="eyebrow">{hero.definition}</p>
          <h1 id="new-hero-title" className={styles.heroTitle} data-hero="title">{hero.title}</h1>
          <p className={styles.heroSub} data-hero="sub">
            {hero.sub}
          </p>
          <div className={styles.heroCtas} data-hero="ctas">
            <PrimaryCta location="hero" />
          </div>
          <ol className={styles.heroTrail} aria-label="Connected product workflow">
            {hero.trail.map((item) => <li key={item}>{item}</li>)}
          </ol>
        </div>
        <div className={styles.heroStage}>
          <div className={styles.sceneSlot} data-hero-scene-slot>
            <LivingEstimatePoster />
            <LivingEstimateSceneLoader />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProposalEvidence() {
  return (
    <div className={styles.evidenceBlock}>
      <FileXls size={22} weight="regular" aria-hidden="true" />
      <div>
        <span className={styles.evidenceLabel}>{proofChapters.proposalPreviewLabel}</span>
        <strong>{fixture.proposal.title}</strong>
        <p>{fixture.proposal.summary.join(" · ")}</p>
      </div>
      <span className={styles.evidenceTag}>{proofChapters.excelChip}</span>
    </div>
  );
}

function ResponseEvidence() {
  const joinery = fixture.groups
    .flatMap((group) => group.items)
    .find((item) => item.source);
  if (!joinery) return null;
  return (
    <div className={styles.evidenceBlock}>
      <ChatsCircle size={22} weight="regular" aria-hidden="true" />
      <div>
        <span className={styles.evidenceLabel}>{fixture.comment.label}</span>
        <strong>{joinery.name}</strong>
        <p>“{fixture.comment.quote}”</p>
        <div className={styles.respondActions}>
          {proofChapters.respondActions.map((action) => (
            <span key={action}>{action}</span>
          ))}
        </div>
      </div>
      <span className={styles.evidenceTag}>{proofChapters.respondDecisionNote}</span>
    </div>
  );
}

function RevisionEvidence() {
  return (
    <div className={styles.evidenceBlock}>
      <ClockCounterClockwise size={22} weight="regular" aria-hidden="true" />
      <div>
        <span className={styles.evidenceLabel}>Activity and revision context</span>
        <strong>{proofChapters.activity[0].label}</strong>
        <p>
          <s>{proofChapters.activity[0].prior}</s>
          <span aria-hidden="true"> → </span>
          {proofChapters.activity[0].current}
        </p>
        <p>{proofChapters.activity.slice(1).map((entry) => entry.label).join(" · ")}</p>
      </div>
      <span className={styles.evidenceTag}>Current activity record</span>
    </div>
  );
}

function ProofSection() {
  return (
    <section
      className={styles.proofSection}
      id="product"
      aria-labelledby="product-title"
      data-proof-root
    >
      <div className={styles.sectionInner} id="how-it-works">
        <header className={styles.proofIntro}>
          <h2 id="product-title">{proofChapters.title}</h2>
          <div>
            <p>{proofChapters.intro}</p>
            <p className={styles.proofContrast}>{contrast}</p>
          </div>
        </header>
        <div className={styles.proofLedger}>
          <div className={styles.estimateStage}>
            <div className={styles.estimateStageHead}>
              <span>Working estimate</span>
              <span>{proofChapters.caption}</span>
            </div>
            <EstimateFixtureSheet />
          </div>
          <div className={styles.evidenceRail}>
            <ProposalEvidence />
            <ResponseEvidence />
            <RevisionEvidence />
          </div>
        </div>
        <ol className={styles.workflowSummary}>
          {proofChapters.chapters.map((chapter) => (
            <li key={chapter.key}>
              <h3>{chapter.title}</h3>
              <p>{chapter.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CostKnowledgeSection() {
  return (
    <section className={styles.costSection} id="cost-knowledge" aria-labelledby="cost-knowledge-title">
      <div className={styles.sectionInner}>
        <div className={styles.costSplit}>
          <div className={styles.costCopy}>
            <h2 id="cost-knowledge-title">{costKnowledge.title}</h2>
            <p>{costKnowledge.body}</p>
            <p className={styles.dataLine}>{costKnowledge.dataLine}</p>
          </div>
          <div className={styles.knowledgeRecord}>
            <span>Reusable cost record</span>
            <strong>{costKnowledge.detail.name}</strong>
            <p>{costKnowledge.detail.meta}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className={styles.trustSection} id="trust" aria-labelledby="trust-title">
      <div className={styles.sectionInner}>
        <div className={styles.trustGrid}>
          <p className={styles.audienceLine}>{audienceLine}</p>
          <div>
            <h2 id="trust-title">{trust.title}</h2>
            <p className={styles.trustFounder}>{trust.founder}</p>
          </div>
          <ul className={styles.trustStrip}>
            {trust.facts.map((fact) => <li key={fact}>{fact}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className={styles.faqSection} id="faq" aria-labelledby="faq-title">
      <div className={styles.sectionInner}>
        <div className={styles.faqGrid}>
          <h2 id="faq-title">{faq.title}</h2>
          <div className={styles.faqList}>
          {faq.items.map((item) => (
            <details key={item.question} className={styles.faqItem}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className={styles.final} id="early-access" aria-labelledby="final-cta-title">
      <div className={styles.sectionInner}>
        <h2 id="final-cta-title">{finalCta.title}</h2>
        <p className={styles.finalLine}>{finalCta.line}</p>
        <div className={styles.finalCtas}>
          <Link
            href={finalCta.cta.href}
            className={styles.ctaPrimary}
            data-new-landing-cta="primary"
            data-new-landing-location="final"
          >
            <span>{finalCta.cta.label}</span>
            <span className={styles.ctaIconOrb} aria-hidden="true">
              <ArrowRight size={14} weight="bold" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.sectionInner}>
        <div className={styles.footerMeta}>
          <Link href="/" className={styles.footerBrand} aria-label="Archestimator home">
            <ArchestimatorLogoMark tone="dark" size={22} />
            <span aria-hidden="true">archestimator</span>
          </Link>
          <nav aria-label="Footer">
            {footer.links.map((link) => (
              <Link key={link.label} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className={styles.footerMetaRight}>
            <span className={styles.footerStatus}>{footer.status}</span>
            <span>{footer.copyright}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function NewLandingPage() {
  return (
    <NewLandingMotion>
      <div className={styles.page}>
        <NewLandingNav />
        <main id="new-main">
          <HeroSection />
          <ProofSection />
          <CostKnowledgeSection />
          <TrustSection />
          <FaqSection />
          <FinalCtaSection />
        </main>
        <LandingFooter />
      </div>
    </NewLandingMotion>
  );
}
