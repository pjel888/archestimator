import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Books,
  ChartLineUpIcon,
  ChatCircleTextIcon,
  CheckCircle,
  ClockCounterClockwise,
  CursorClickIcon,
  FileArrowDownIcon,
  FileText,
  LinkSimpleIcon,
  SealCheckIcon,
  StackSimpleIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react/dist/ssr";
import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { stringifyJsonLd } from "@/lib/landing/json-ld";
import { cn } from "@/lib/ui/cn";
import { AnimatedMetricValue } from "./AnimatedMetricValue";
import { HeroEstimateWorkspaceMockup } from "./HeroEstimateWorkspaceMockup";
import { HeroImageZoom } from "./HeroImageZoom";
import { HeroMountMotion } from "./HeroMountMotion";
import { ProductStage } from "./ProductStage";
import {
  LOGIN_HREF,
  WALKTHROUGH_HREF,
  WORKSPACE_HREF,
  comparisonRows,
  faqs,
  featureChapters,
  navItems,
  productProof,
  proofAudiences,
  specialties,
  workflowSteps,
} from "./landing-content";
import styles from "./landing-v3.module.css";

type LandingPageProps = {
  isLoggedIn: boolean;
};

type HeroMetricCardProps = {
  className: string;
  index: string;
  title: string;
  metricLabel: string;
  metricValue: number;
  metricIntervalMs?: number;
  ledgerTitle: string;
  body: string;
  features: readonly HeroMetricFeature[];
};

type HeroMetricFeature = {
  label: string;
  icon: typeof Books;
  previewTitle: string;
  previewBody: string;
};

const AUDIENCE_INPUT_NODES = [
  ["Project workflow", "Scope by area, phase, package, or trade."],
  ["Component library", "Reuse saved costs, assemblies, variants, and suppliers."],
  ["Estimating experience", "Build and revise without spreadsheet friction."],
] as const;

const AUDIENCE_RECORD_NODES = [
  ["Estimate", "Scope, quantities, rates, assumptions, and source notes."],
  ["Proposal", "Client-ready proposal output that keeps estimate context."],
  ["Review", "Comments, questions, revision requests, and approvals."],
  ["Decision", "Final response and next action attached to the record."],
] as const;

const PROBLEM_FRAGMENTS = ["Copied rate", "Unnamed attachment", "Email revision", "Overwritten version"] as const;

const FEATURE_CHAPTER_ICONS = [Books, FileText, ClockCounterClockwise] as const;
const FEATURE_CHAPTER_MODES = ["library", "proposal", "revision"] as const;

function PrimaryCta({ isLoggedIn, location }: { isLoggedIn: boolean; location: string }) {
  return (
    <Link
      href={isLoggedIn ? WORKSPACE_HREF : WALKTHROUGH_HREF}
      data-landing-v3-cta="primary"
      data-landing-v3-location={location}
      className={styles.primaryCta}
    >
      <span>{isLoggedIn ? "Open workspace" : "Book a walkthrough"}</span>
      <span aria-hidden="true">
        <ArrowRight weight="bold" />
      </span>
    </Link>
  );
}

function SecondaryCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.secondaryCta}>
      {children}
    </Link>
  );
}

function LandingNav({ isLoggedIn }: LandingPageProps) {
  return (
    <header className={styles.navWrap}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>
      <div className={styles.navInner}>
        <Link href="/" className={styles.navBrand} aria-label="Archestimator home">
          <ArchestimatorLogo tone="dark" markSize={34} markClassName={styles.logoMark} separatorClassName={styles.logoSeparator} wordmarkClassName={styles.logoWordmark} priority />
        </Link>
        <nav aria-label="Primary" className={styles.desktopNav}>
          {navItems.map((item) => (
            <Link key={item.label} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.navActions}>
          {isLoggedIn ? null : (
            <Link href={LOGIN_HREF} className={styles.signInLink}>
              Sign in
            </Link>
          )}
          <PrimaryCta isLoggedIn={isLoggedIn} location="nav" />
        </div>
        <details className={styles.mobileMenu}>
          <summary>Menu</summary>
          <nav aria-label="Mobile primary">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
            {isLoggedIn ? null : <Link href={LOGIN_HREF}>Sign in</Link>}
            <Link href={isLoggedIn ? WORKSPACE_HREF : WALKTHROUGH_HREF}>{isLoggedIn ? "Open workspace" : "Book a walkthrough"}</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

function AudienceBanner() {
  return (
    <div className={styles.audienceBanner} aria-label="Archestimator audience">
      <span>Cost Estimators &middot; Architects &middot; Engineers &middot; Project Managers &middot; Construction Managers &middot; Construction Professionals</span>
    </div>
  );
}

function SectionHeader({
  id,
  kicker,
  title,
  body,
  light = false,
}: {
  id?: string;
  kicker?: string;
  title: string;
  body?: string;
  light?: boolean;
}) {
  return (
    <div className={cn(styles.sectionHeader, light && styles.lightText)} data-landing-v3-reveal>
      {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
      <h2 id={id}>{title}</h2>
      {body ? <p>{body}</p> : null}
    </div>
  );
}

function HeroMetricCard({
  className,
  index,
  title,
  metricLabel,
  metricValue,
  metricIntervalMs,
  ledgerTitle,
  body,
  features,
}: HeroMetricCardProps) {
  return (
    <div className={cn(styles.heroImageGridBlock, className)} data-hero-motion="metric-card">
      <div className={styles.heroMetricTopbar}>
        <span className={styles.heroMetricIndex}>{index}</span>
        <ArrowUpRight size={24} weight="regular" aria-hidden="true" className={styles.heroMetricIcon} />
      </div>
      <div className={styles.heroMetricPanel}>
        <div className={styles.heroMetricCountPanel}>
          <span className={styles.heroMetricLabel}>{metricLabel}</span>
          <AnimatedMetricValue start={metricValue} intervalMs={metricIntervalMs} className={styles.heroMetricValue} />
        </div>
        <div className={styles.heroMetricLedger}>
          <div className={styles.heroMetricLedgerHeader}>
            <span>{ledgerTitle}</span>
          </div>
          <p className={styles.heroMetricBody}>{body}</p>
          <ul className={styles.heroMetricFeatureList}>
            {features.map((feature, featureIndex) => {
              const FeatureIcon = feature.icon;

              return (
                <li key={feature.label}>
                  <button
                    type="button"
                    className={styles.heroMetricFeatureButton}
                    aria-describedby={`hero-feature-preview-${index}-${featureIndex + 1}`}
                  >
                    <FeatureIcon size={15} weight="regular" aria-hidden="true" className={styles.heroMetricFeatureIcon} />
                    <span className={styles.heroMetricFeatureLabel}>{feature.label}</span>
                  </button>
                  <span id={`hero-feature-preview-${index}-${featureIndex + 1}`} role="tooltip" className={styles.heroMetricPreview}>
                    <span className={styles.heroMetricPreviewFrame} aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                    <span className={styles.heroMetricPreviewCopy}>
                      <strong>{feature.previewTitle}</strong>
                      <span>{feature.previewBody}</span>
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div className={styles.heroMetricTitle}>{title}</div>
    </div>
  );
}

function Hero({ isLoggedIn }: LandingPageProps) {
  return (
    <>
      <section className={styles.hero} aria-labelledby="landing-hero-title">
        <HeroMountMotion className={styles.heroGrid}>
          <div className={styles.heroCopy} data-landing-v3-reveal>
            <p className={styles.heroEyebrow} data-hero-motion="eyebrow">AEC construction cost estimating &amp; proposal platform</p>
            <h1 id="landing-hero-title" data-hero-motion="title">Where estimates become client‑approved proposals.</h1>
            <p className={styles.heroIntro} data-hero-motion="intro">
              <span>Stop losing time to spreadsheets and revisions.</span>
              <span>archestimator turns estimating and proposals into one workflow so you spend less time working and more time winning.</span>
            </p>
            <div className={styles.ctaRow}>
              <span data-hero-motion="cta">
                <PrimaryCta isLoggedIn={isLoggedIn} location="hero" />
              </span>
              <span data-hero-motion="cta">
                <SecondaryCta href="#workflow">Explore the workflow</SecondaryCta>
              </span>
            </div>
          </div>
          <div className={styles.heroStage} data-landing-v3-reveal>
            <div className={styles.heroSoftwareMockupPlaceholder} data-hero-motion="mockup" aria-hidden="true">
              <div className={styles.heroSoftwareMockupChrome}>
                <span />
                <span />
                <span />
              </div>
              <div className={styles.heroSoftwareMockupBody}>
                <HeroEstimateWorkspaceMockup />
              </div>
            </div>
            <HeroImageZoom className={styles.heroIllustration} dataMotion="illustration">
              <span className={styles.heroIllustrationImageClip}>
                <Image
                  src="/landing/archestimator-mountain-hero-photo.png"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 94vw"
                  className={styles.heroIllustrationImage}
                />
              </span>
              <div className={styles.heroImageGrid} aria-label="Archestimator feature previews">
                <HeroMetricCard
                  className={styles.heroImageGridBlockSmallA}
                  index="01"
                  title="Estimate Smarter"
                  metricLabel="Areas Priced"
                  metricValue={248}
                  metricIntervalMs={2400}
                  ledgerTitle="Build estimates around real scope"
                  body="Estimates that mirror the way you actually build."
                  features={[
                    {
                      label: "Structure that fits the job",
                      icon: TreeStructureIcon,
                      previewTitle: "Structure that fits the job.",
                      previewBody:
                        "Organize by floor, room, trade, or phase. Your sheet tree becomes a living map of the project, not a flat spreadsheet.",
                    },
                    {
                      label: "Components with memory",
                      icon: StackSimpleIcon,
                      previewTitle: "Components with memory.",
                      previewBody:
                        "Build a component once, drop it anywhere. Each one carries its own price history, so change orders price themselves later.",
                    },
                    {
                      label: "Drag, drop, done",
                      icon: CursorClickIcon,
                      previewTitle: "Drag, drop, done.",
                      previewBody:
                        "Pull components into areas, watch totals roll up live, and the proposal builds itself as you go.",
                    },
                  ]}
                />
                <HeroMetricCard
                  className={styles.heroImageGridBlockSmallB}
                  index="02"
                  title="Propose Better"
                  metricLabel="Proposals Submitted"
                  metricValue={67}
                  metricIntervalMs={3200}
                  ledgerTitle="Turn the estimate into a client decision"
                  body="Proposals clients actually read."
                  features={[
                    {
                      label: "Branded client links",
                      icon: LinkSimpleIcon,
                      previewTitle: "Branded client links.",
                      previewBody: "Your logo, your colors, optional password lock. See the moment your client opens it.",
                    },
                    {
                      label: "Numbers that speak clearly",
                      icon: ChartLineUpIcon,
                      previewTitle: "Numbers that speak clearly.",
                      previewBody: "Auto-generated charts turn line items into a story the client can follow at a glance.",
                    },
                    {
                      label: "Exports your trades already use",
                      icon: FileArrowDownIcon,
                      previewTitle: "Exports your trades already use.",
                      previewBody: "One click to BOM / BOQ - no reformatting, no hand-typed spreadsheets.",
                    },
                  ]}
                />
                <HeroMetricCard
                  className={styles.heroImageGridBlockWide}
                  index="03"
                  title="Win Faster"
                  metricLabel="Bids Won"
                  metricValue={19}
                  metricIntervalMs={4200}
                  ledgerTitle="Record the decision and every change after"
                  body="Close the bid. Close the change. Keep the record."
                  features={[
                    {
                      label: "Comment, accept, decline in one place",
                      icon: ChatCircleTextIcon,
                      previewTitle: "Comment, accept, decline in one place.",
                      previewBody: "Clients respond inside the proposal; every action is timestamped and attributed.",
                    },
                    {
                      label: "Change orders without the paper trail",
                      icon: ClockCounterClockwise,
                      previewTitle: "Change orders without the paper trail.",
                      previewBody: "Edit, re-send, re-approve in same workflow, no email chains, no PDFs.",
                    },
                    {
                      label: "Sign-off that holds up",
                      icon: SealCheckIcon,
                      previewTitle: "Sign-off that holds up.",
                      previewBody:
                        'Every approval is recorded against the exact version the client saw. No "I thought you meant..." on site.',
                    },
                  ]}
                />
              </div>
            </HeroImageZoom>
          </div>
        </HeroMountMotion>
      </section>
      <div className={styles.heroVideoPlaceholder} aria-label="Archestimator walkthrough video preview">
        <span className={styles.heroVideoPlayMark} aria-hidden="true" />
        <span className={styles.heroVideoLabel}>Video walkthrough</span>
      </div>
    </>
  );
}

function AudienceBand() {
  return (
    <section className={styles.operatingMap} id="product" aria-labelledby="audience-title">
      <div className={styles.operatingMapIntro} data-landing-v3-reveal>
        <p className={styles.kicker}>Built for teams pricing real work</p>
        <h2 id="audience-title">A commercial workspace for the people who own the number.</h2>
        <p>
          The old workflow diagram said the right thing: Archestimator is not just an estimating screen. It is the path from project structure and reusable knowledge to proposal review, revision, decision, and history.
        </p>
      </div>
      <div className={styles.operatingMapBoard} data-landing-v3-reveal>
        <div className={styles.inputCluster} aria-label="Inputs feeding the estimate workspace">
          {AUDIENCE_INPUT_NODES.map(([title, body]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <div className={styles.recordFlow} aria-label="Estimate to decision workflow">
          {AUDIENCE_RECORD_NODES.map(([title, body]) => (
            <article key={title}>
              <span aria-hidden="true" />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <div className={styles.historyRail}>
          <strong>Activity history</strong>
          <span>Every comment, change, version, and decision remains attached.</span>
        </div>
      </div>
      <ul className={styles.audienceList}>
        {proofAudiences.map((audience) => (
          <li key={audience}>{audience}</li>
        ))}
      </ul>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className={styles.problemSection} aria-labelledby="problem-title">
      <div className={styles.problemStatement} data-landing-v3-reveal>
        <h2 id="problem-title">
          Spreadsheets calculate.
          <br />
          They do not remember.
        </h2>
        <p>
          Most estimates stop being useful the moment they become a PDF. Rates lose their source. Assumptions disappear. Feedback moves to email. Revisions overwrite the reason the number changed. The next project starts from another copied sheet.
        </p>
        <strong>Archestimator keeps the commercial story connected.</strong>
      </div>
      <div className={styles.fragmentBoard} data-landing-v3-reveal>
        {PROBLEM_FRAGMENTS.map((fragment) => (
          <div key={fragment}>{fragment}</div>
        ))}
      </div>
    </section>
  );
}

function WorkflowStory() {
  return (
    <section className={styles.workflowSection} id="workflow" aria-labelledby="workflow-title">
      <div className={styles.workflowIntro}>
        <SectionHeader
          id="workflow-title"
          kicker="One connected workflow"
          title="From first cost to final decision, nothing loses context."
          body="A persistent product frame follows the estimate as it becomes reusable cost knowledge, proposal paper, revision trail, and recorded client decision."
        />
      </div>
      <div className={styles.workflowGrid}>
        <div className={styles.workflowStage} data-landing-v3-reveal>
          <ProductStage mode="workflow" activeStep={1} />
        </div>
        <div className={styles.workflowSteps}>
          {workflowSteps.map((step, index) => (
            <article key={step.id} className={styles.workflowStep} data-landing-v3-reveal>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              <em>{step.state}</em>
              <div className={styles.stepProgress} aria-hidden="true">
                <span style={{ inlineSize: `${25 * (index + 1)}%` }} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureChapters() {
  return (
    <section className={styles.featureChapters} aria-label="Product chapters">
      {featureChapters.map((chapter, index) => {
        const Icon = FEATURE_CHAPTER_ICONS[index];
        return (
          <article key={chapter.title} className={styles.featureChapter}>
            <div className={styles.chapterCopy} data-landing-v3-reveal>
              <p className={styles.kicker}>{chapter.kicker}</p>
              <h2>{chapter.title}</h2>
              <p>{chapter.body}</p>
              <blockquote>{chapter.callout}</blockquote>
            </div>
            <div className={styles.chapterVisual} data-landing-v3-reveal>
              <div className={styles.chapterIcon} aria-hidden="true">
                <Icon />
              </div>
              <ProductStage mode={FEATURE_CHAPTER_MODES[index]} activeStep={index + 1} />
            </div>
          </article>
        );
      })}
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className={styles.comparisonSection} aria-labelledby="comparison-title">
      <SectionHeader id="comparison-title" title="A commercial record, not another file." />
      <div className={styles.comparisonGrid} data-landing-v3-reveal>
        <div className={styles.comparisonColumn}>
          <h3>Traditional fragmented process</h3>
          {comparisonRows.map(([traditional]) => (
            <p key={traditional}>{traditional}</p>
          ))}
        </div>
        <div className={styles.comparisonSignal} aria-hidden="true">
          <span />
        </div>
        <div className={styles.comparisonColumn}>
          <h3>Archestimator</h3>
          {comparisonRows.map(([, archestimator]) => (
            <p key={archestimator}>{archestimator}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

function SpecialtiesSection() {
  return (
    <section className={styles.specialtiesSection} id="specialties" aria-labelledby="specialties-title">
      <SectionHeader id="specialties-title" title="Flexible enough for the way your team scopes work." />
      <div className={styles.specialtyTabs} aria-label="Specialty shortcuts" data-landing-v3-reveal>
        {specialties.map((specialty) => (
          <a key={specialty.id} href={`#${specialty.id}`}>
            {specialty.label}
          </a>
        ))}
      </div>
      <div className={styles.specialtyPanels}>
        {specialties.map((specialty, index) => (
          <article key={specialty.id} id={specialty.id} className={styles.specialtyPanel} data-landing-v3-reveal>
            <div>
              <h3>{specialty.label}</h3>
              <p>{specialty.copy}</p>
              <em>{specialty.visual}</em>
            </div>
            <ProductStage mode="specialty" activeStep={index} />
          </article>
        ))}
      </div>
    </section>
  );
}

function ProofSection() {
  return (
    <section className={styles.proofSection} aria-labelledby="proof-title">
      <SectionHeader
        id="proof-title"
        kicker="Product proof"
        title="Proof lives in the record itself."
        body="No fabricated customer logos, no invented metrics. The visible proof is what the product keeps attached to the estimate."
      />
      <ul data-landing-v3-reveal>
        {productProof.map((item) => (
          <li key={item}>
            <CheckCircle weight="fill" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function FaqSection() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <section className={styles.faqSection} aria-labelledby="faq-title">
      <SectionHeader id="faq-title" title="Questions teams ask before changing the estimating workflow." />
      <div className={styles.faqList} data-landing-v3-reveal>
        {faqs.map((faq, index) => (
          <details key={faq.question} open={index === 0}>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: stringifyJsonLd(schema) }} />
    </section>
  );
}

function FinalCta({ isLoggedIn }: LandingPageProps) {
  return (
    <section className={styles.finalCta} aria-labelledby="final-cta-title">
      <div data-landing-v3-reveal>
        <ArchestimatorLogo tone="light" markSize={44} separatorClassName={styles.logoSeparator} wordmarkClassName={styles.finalWordmark} />
        <h2 id="final-cta-title">Your next estimate should make the one after it easier.</h2>
        <p>See how Archestimator connects cost knowledge, proposal review, revisions, and decisions in one commercial workflow.</p>
        <div className={styles.ctaRow}>
          <PrimaryCta isLoggedIn={isLoggedIn} location="final" />
          <SecondaryCta href={isLoggedIn ? WORKSPACE_HREF : LOGIN_HREF}>{isLoggedIn ? "Open workspace" : "Sign in"}</SecondaryCta>
        </div>
      </div>
    </section>
  );
}

function LandingFooter({ isLoggedIn }: LandingPageProps) {
  const year = new Date().getFullYear();
  const links = [
    ["Product", "#product"],
    ["Workflow", "#workflow"],
    ["Specialties", "#specialties"],
    ["Pricing", "/pricing"],
    ["About", "/about"],
    ["Contact", WALKTHROUGH_HREF],
    [isLoggedIn ? "Workspace" : "Sign in", isLoggedIn ? WORKSPACE_HREF : LOGIN_HREF],
    ["Privacy", "/privacy"],
    ["Terms", "/terms"],
  ] as const;

  return (
    <footer className={styles.footer}>
      <ArchestimatorLogo tone="dark" markSize={38} separatorClassName={styles.footerSeparator} wordmarkClassName={styles.footerWordmark} />
      <nav aria-label="Footer">
        {links.map(([label, href]) => (
          <Link key={label} href={href}>
            {label}
          </Link>
        ))}
      </nav>
      <p>© {year} Archestimator. Estimates, proposals, revisions, and approvals connected.</p>
    </footer>
  );
}

export function ArchestimatorLandingPage({ isLoggedIn }: LandingPageProps) {
  return (
    <div className={styles.root} data-landing-v3-root>
      <LandingNav isLoggedIn={isLoggedIn} />
      <AudienceBanner />
      <main id="main-content" data-landing-page-root="true">
        <Hero isLoggedIn={isLoggedIn} />
        <AudienceBand />
        <ProblemSection />
        <WorkflowStory />
        <FeatureChapters />
        <ComparisonSection />
        <SpecialtiesSection />
        <ProofSection />
        <FaqSection />
        <FinalCta isLoggedIn={isLoggedIn} />
      </main>
      <LandingFooter isLoggedIn={isLoggedIn} />
    </div>
  );
}
