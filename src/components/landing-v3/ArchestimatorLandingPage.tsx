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
  previewMeta: string;
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
                    <FeatureIcon size={13} weight="light" aria-hidden="true" className={styles.heroMetricFeatureIcon} />
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
                      <em>{feature.previewMeta}</em>
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
    <section className={styles.hero} aria-labelledby="landing-hero-title">
      <HeroMountMotion className={styles.heroGrid}>
        <div className={styles.heroCopy} data-landing-v3-reveal>
          <p className={styles.heroEyebrow} data-hero-motion="eyebrow">Construction estimating, proposals, and approvals, connected.</p>
          <h1 id="landing-hero-title" data-hero-motion="title">The estimate that keeps working after you send it.</h1>
          <p data-hero-motion="intro">
            Scope, rates, revisions, feedback, and approvals stay in one connected commercial record.
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
          <HeroImageZoom className={styles.heroIllustration} dataMotion="illustration">
            <Image
              src="/landing/archestimator-mountain-hero-photo.png"
              alt=""
              fill
              priority
              sizes="(max-width: 768px) 100vw, 94vw"
              className={styles.heroIllustrationImage}
            />
            <div className={styles.heroImageGrid} aria-label="Archestimator feature previews">
              <HeroMetricCard
                className={styles.heroImageGridBlockSmallA}
                index="01"
                title="Estimate Smarter"
                metricLabel="Areas Priced"
                metricValue={248}
                metricIntervalMs={2400}
                ledgerTitle="Build estimates around real scope"
                body="Estimate Smarter is the workspace for shaping, reusing, and assembling project costs before they become a proposal."
                features={[
                  {
                    label: "Domain-shaped estimate tree",
                    icon: TreeStructureIcon,
                    previewTitle: "Project tree preview",
                    previewBody: "Floors, rooms, and areas hold their own quantities and costs.",
                    previewMeta: "Screenshot slot",
                  },
                  {
                    label: "Reusable smart components",
                    icon: StackSimpleIcon,
                    previewTitle: "Component memory",
                    previewBody: "Saved assemblies carry pricing history and change context.",
                    previewMeta: "GIF/video slot",
                  },
                  {
                    label: "Drag and drop into the selected area",
                    icon: CursorClickIcon,
                    previewTitle: "Drop-to-estimate flow",
                    previewBody: "Choose an area, drop the component, and totals roll up.",
                    previewMeta: "Motion demo slot",
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
                body="Propose Better is how the estimate becomes a clear, trackable package your client can review without losing the pricing context."
                features={[
                  {
                    label: "Branded proposal links",
                    icon: LinkSimpleIcon,
                    previewTitle: "Share-link proposal",
                    previewBody: "Client-facing links can carry branding, access, and open tracking.",
                    previewMeta: "Screenshot slot",
                  },
                  {
                    label: "Charts and cost visualizations",
                    icon: ChartLineUpIcon,
                    previewTitle: "Cost story view",
                    previewBody: "Charts help clients understand where the project cost lives.",
                    previewMeta: "Chart preview slot",
                  },
                  {
                    label: "Industry-standard BOM and BOQ exports",
                    icon: FileArrowDownIcon,
                    previewTitle: "Export package",
                    previewBody: "Formal BOM and BOQ outputs stay connected to the estimate.",
                    previewMeta: "Document preview slot",
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
                body="Win Faster is not only about winning the first bid. It keeps comments, approvals, declined proposals, and later change orders attached to the same record."
                features={[
                  {
                    label: "Client comments, accept, and decline",
                    icon: ChatCircleTextIcon,
                    previewTitle: "Client response panel",
                    previewBody: "Proposal decisions happen inside the shared link.",
                    previewMeta: "Interaction preview slot",
                  },
                  {
                    label: "Activity history for every response",
                    icon: ClockCounterClockwise,
                    previewTitle: "Decision timeline",
                    previewBody: "Comments, opens, responses, and next steps stay attached.",
                    previewMeta: "Timeline preview slot",
                  },
                  {
                    label: "Change approvals recorded in the same workflow",
                    icon: SealCheckIcon,
                    previewTitle: "Change order approval",
                    previewBody: "Approved revisions become part of the same recorded trail.",
                    previewMeta: "Approval preview slot",
                  },
                ]}
              />
            </div>
          </HeroImageZoom>
        </div>
      </HeroMountMotion>
    </section>
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
