import Link from "next/link";
import { Fragment } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { ArchestimatorLogo, ArchestimatorLogoMark } from "@/components/brand/ArchestimatorLogo";
import { EstimateFixtureSheet } from "./EstimateFixtureSheet";
import { LivingEstimatePoster } from "./LivingEstimatePoster";
import { LivingEstimateSceneLoader } from "./LivingEstimateSceneLoader";
import { NewLandingMotion } from "./NewLandingMotion";
import {
  audience,
  benefits,
  costKnowledge,
  faq,
  finalCta,
  fixture,
  footer,
  hero,
  nav,
  problem,
  proofChapters,
  trust,
  type BenefitDetail,
  type ProblemFragmentKind,
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

function Eyebrow({ children }: { children: string }) {
  return (
    <p className={styles.eyebrow}>
      <span className={styles.eyebrowMark} aria-hidden="true" />
      {children}
    </p>
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
          <p className={styles.eyebrow} data-hero="eyebrow">
            <span className={styles.eyebrowMark} aria-hidden="true" />
            {hero.eyebrow}
          </p>
          <h1 id="new-hero-title" className={styles.heroTitle}>
            {hero.titleLines.map((line, index) => (
              <span key={line} className={styles.maskLine}>
                <span className={styles.lineInner} data-hero-line>
                  {line}
                </span>
                {index < hero.titleLines.length - 1 ? " " : null}
              </span>
            ))}
          </h1>
          <p className={styles.heroSub} data-hero="sub">
            {hero.sub}
          </p>
          <div className={styles.heroCtas} data-hero="ctas">
            <PrimaryCta location="hero" />
            <Link href={hero.quietLink.href} className={styles.quietLink}>
              {hero.quietLink.label}
            </Link>
          </div>
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

const fragmentVisualClass: Record<ProblemFragmentKind, string> = {
  sheet: styles.visSheet,
  document: styles.visDoc,
  message: styles.visMail,
  file: styles.visFile,
};

function FragmentVisual({ kind }: { kind: ProblemFragmentKind }) {
  return (
    <div className={`${styles.fragmentVisual} ${fragmentVisualClass[kind]}`} aria-hidden="true">
      {kind === "document" || kind === "message" ? (
        <>
          <span />
          <span />
          <span />
        </>
      ) : null}
      {kind === "file" ? <s>v6_final.xlsx</s> : null}
    </div>
  );
}

function ProblemSection() {
  return (
    <section className={`${styles.section} ${styles.sectionAlt}`} id="problem" aria-labelledby="problem-title">
      <div className={styles.sectionInner}>
        <header className={styles.sectionHead} data-reveal>
          <Eyebrow>{problem.eyebrow}</Eyebrow>
          <h2 id="problem-title">{problem.title}</h2>
          <p>{problem.body}</p>
        </header>
        <ul
          className={styles.fragments}
          aria-label="Detached estimate handoff fragments"
          data-fragments
          data-reveal
        >
          {problem.fragments.map((fragment) => (
            <li key={fragment.label} className={styles.fragment}>
              <FragmentVisual kind={fragment.kind} />
              <span className={styles.fragmentLabel}>{fragment.label}</span>
            </li>
          ))}
          <svg
            className={styles.brokenThread}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M0 50 H 34"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5 7"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M66 50 H 100"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5 7"
              strokeLinecap="round"
              strokeOpacity="0.35"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </ul>
        <p className={styles.closingLine} data-reveal>
          {problem.closing}
        </p>
      </div>
    </section>
  );
}

function BenefitDetailView({ detail }: { detail: BenefitDetail }) {
  switch (detail.kind) {
    case "library":
      return (
        <div className={styles.detailRow}>
          <span className={styles.detailName}>{detail.name}</span>
          <span className={styles.detailMeta}>{detail.meta}</span>
        </div>
      );
    case "proposal":
      return (
        <div className={styles.detailRow}>
          <span className={styles.detailMeta}>{detail.label}</span>
          <span className={styles.detailValue}>{detail.value}</span>
        </div>
      );
    case "revision":
      return (
        <div className={styles.detailRow}>
          <span className={styles.detailRevision}>
            <s className={styles.ghost}>{detail.prior}</s>
            <span className={styles.ghostArrow} aria-hidden="true">
              →
            </span>
            <span className={styles.ghostCurrent}>{detail.current}</span>
          </span>
          <span className={styles.detailMeta}>{detail.meta}</span>
        </div>
      );
    default:
      return null;
  }
}

function BenefitsSection() {
  return (
    <section className={styles.section} id="benefits" aria-labelledby="benefits-title">
      <div className={styles.sectionInner}>
        <header className={styles.sectionHead} data-reveal>
          <h2 id="benefits-title">{benefits.title}</h2>
        </header>
        <div className={styles.benefitGrid}>
          {benefits.panels.map((panel) => (
            <article key={panel.title} className={styles.benefitPanel} data-reveal>
              <span className={styles.benefitMark} aria-hidden="true" />
              <h3>{panel.title}</h3>
              <p>{panel.body}</p>
              <div className={styles.benefitDetail}>
                <BenefitDetailView detail={panel.detail} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CarryVisual() {
  const miniRows = fixture.groups.flatMap((group) => group.items).slice(1, 4);
  return (
    <div className={styles.carrySplit}>
      <div className={styles.miniSheet}>
        <span className={styles.miniSheetLabel}>{fixture.project}</span>
        {miniRows.map((item) => (
          <div key={item.name} className={styles.miniSheetRow}>
            <span>
              {item.source ? (
                <span className={styles.srcMark} title={item.source}>
                  <span className={styles.srOnly}>{item.source}</span>
                </span>
              ) : null}
              {item.name}
            </span>
            <span className={styles.miniSheetAmount}>{item.total}</span>
          </div>
        ))}
        <div className={styles.miniSheetTotal}>
          <span>{fixture.totalLabel}</span>
          <span>{fixture.total}</span>
        </div>
      </div>
      <svg
        className={styles.carryThread}
        viewBox="0 0 48 16"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M1 8 H 41 M 35 2 L 42 8 L 35 14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className={styles.proposalPreview}>
        <span className={styles.previewLabel}>{proofChapters.proposalPreviewLabel}</span>
        <span className={styles.previewTitle}>{fixture.proposal.title}</span>
        <div className={styles.previewLines}>
          {fixture.proposal.summary.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
        <span className={styles.excelChip}>{proofChapters.excelChip}</span>
      </div>
    </div>
  );
}

function RespondVisual() {
  const joinery = fixture.groups
    .flatMap((group) => group.items)
    .find((item) => item.source);
  if (!joinery) return null;
  return (
    <div className={styles.respondCard}>
      <div className={styles.respondHead}>
        <span className={styles.respondTitle}>{fixture.proposal.title}</span>
        <span className={styles.chip}>{fixture.proposal.status}</span>
      </div>
      <div className={styles.respondLine}>
        <span>{joinery.name}</span>
        <span className={styles.respondAmount}>{joinery.total}</span>
      </div>
      <div className={styles.respondComment}>
        <span className={styles.commentLabel}>{fixture.comment.label}</span>
        <p className={styles.commentQuote}>“{fixture.comment.quote}”</p>
      </div>
      <div className={styles.respondActions}>
        {proofChapters.respondActions.map((action) => (
          <span key={action} className={styles.actionChip}>
            {action}
          </span>
        ))}
      </div>
    </div>
  );
}

function ReviseVisual() {
  return (
    <div className={styles.activityList}>
      {proofChapters.activity.map((entry) => (
        <div key={entry.label} className={styles.activityRow}>
          <span
            className={entry.prior ? styles.activityDotSignal : styles.activityDot}
            aria-hidden="true"
          />
          <span className={styles.activityLabel}>{entry.label}</span>
          {entry.prior && entry.current ? (
            <span className={styles.activityValue}>
              <s className={styles.ghost}>{entry.prior}</s>
              <span className={styles.ghostArrow} aria-hidden="true">
                →
              </span>
              <span className={styles.ghostCurrent}>{entry.current}</span>
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ChapterVisual({ chapterKey }: { chapterKey: string }) {
  switch (chapterKey) {
    case "build":
      return <EstimateFixtureSheet />;
    case "carry":
      return <CarryVisual />;
    case "respond":
      return <RespondVisual />;
    case "revise":
      return <ReviseVisual />;
    default:
      return null;
  }
}

function ProofSection() {
  return (
    <section
      className={`${styles.section} ${styles.sectionAlt}`}
      id="product"
      aria-labelledby="product-title"
      data-proof-root
    >
      <div className={styles.sectionInner} id="how-it-works">
        <header className={styles.sectionHead} data-reveal>
          <h2 id="product-title">{proofChapters.title}</h2>
          <p>{proofChapters.intro}</p>
        </header>
        <div className={styles.proofChapters}>
          {proofChapters.chapters.map((chapter) => (
            <article
              key={chapter.key}
              className={styles.chapter}
              data-proof-chapter
              data-chapter={chapter.key}
              data-reveal
            >
              <div className={styles.chapterCopy}>
                <span className={styles.chapterIndex} aria-hidden="true">
                  {chapter.index}
                </span>
                <h3>{chapter.title}</h3>
                <p>{chapter.body}</p>
              </div>
              <div>
                <div className={styles.proofFrame} data-proof-frame>
                  <ChapterVisual chapterKey={chapter.key} />
                </div>
                <span className={styles.proofCaption}>{proofChapters.caption}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CostKnowledgeSection() {
  return (
    <section className={styles.section} id="cost-knowledge" aria-labelledby="cost-knowledge-title">
      <div className={styles.sectionInner}>
        <header className={styles.sectionHead} data-reveal>
          <Eyebrow>{costKnowledge.eyebrow}</Eyebrow>
          <h2 id="cost-knowledge-title">{costKnowledge.title}</h2>
          <p>{costKnowledge.body}</p>
        </header>
        <ol className={styles.loop} data-reveal>
          {costKnowledge.loop.map((node, index) => (
            <Fragment key={node}>
              {index > 0 ? <li className={styles.loopConnector} aria-hidden="true" /> : null}
              <li
                className={
                  node === costKnowledge.signalNode ? styles.loopNodeSignal : styles.loopNode
                }
              >
                {node}
              </li>
            </Fragment>
          ))}
        </ol>
        <p className={styles.dataLine} data-reveal>
          {costKnowledge.dataLine}
        </p>
      </div>
    </section>
  );
}

function AudienceSection() {
  return (
    <section
      className={`${styles.section} ${styles.sectionAlt}`}
      id="who-its-for"
      aria-labelledby="audience-title"
    >
      <div className={styles.sectionInner}>
        <header className={styles.sectionHead} data-reveal>
          <h2 id="audience-title">{audience.title}</h2>
        </header>
        <svg
          className={styles.audienceThread}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M0 62 C 24 40, 42 78, 58 52 C 70 34, 86 58, 100 44"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className={styles.audienceGrid}>
          {audience.columns.map((column) => (
            <div key={column.title} className={styles.audienceCol} data-reveal>
              <h3>{column.title}</h3>
              <ul>
                {column.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className={styles.section} id="trust" aria-labelledby="trust-title">
      <div className={styles.sectionInner}>
        <header className={styles.sectionHead} data-reveal>
          <h2 id="trust-title">{trust.title}</h2>
        </header>
        <p className={styles.trustFounder} data-reveal>
          {trust.founder}
        </p>
        <ul className={styles.principles}>
          {trust.principles.map((principle) => (
            <li key={principle.title} className={styles.principle} data-reveal>
              <h3>{principle.title}</h3>
              <p>{principle.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className={`${styles.section} ${styles.sectionAlt}`} id="faq" aria-labelledby="faq-title">
      <div className={styles.sectionInner}>
        <header className={styles.sectionHead} data-reveal>
          <h2 id="faq-title">{faq.title}</h2>
        </header>
        <div className={styles.faqList} data-reveal>
          {faq.items.map((item) => (
            <details key={item.question} className={styles.faqItem}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className={styles.final} id="early-access" aria-labelledby="final-cta-title">
      <div className={styles.sectionInner}>
        <svg
          className={styles.finalThread}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M0 78 C 30 78, 44 30, 74 34 C 88 36, 92 44, 96 50"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <h2 id="final-cta-title" data-reveal>
          {finalCta.title}
        </h2>
        <p className={styles.finalLine} data-reveal>
          {finalCta.line}
        </p>
        <div className={styles.finalCtas} data-reveal>
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
        <Link href="/" className={styles.footerWordmark} aria-label="Archestimator home">
          <ArchestimatorLogoMark tone="dark" size={64} />
          <span aria-hidden="true">archestimator</span>
        </Link>
        <div className={styles.footerMeta}>
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
          <ProblemSection />
          <BenefitsSection />
          <ProofSection />
          <CostKnowledgeSection />
          <AudienceSection />
          <TrustSection />
          <FaqSection />
          <FinalCtaSection />
        </main>
        <LandingFooter />
      </div>
    </NewLandingMotion>
  );
}
