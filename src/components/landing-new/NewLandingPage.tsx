import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { NewHeroWorkbench } from "./NewHeroWorkbench";
import styles from "./new-landing.module.css";

const navItems = [
  { label: "Product", href: "#product" },
  { label: "Workflow", href: "#workflow" },
  { label: "Specialties", href: "#specialties" },
  { label: "Pricing", href: "/pricing" },
] as const;

const behaviorCards = [
  {
    number: "01",
    title: "Estimate smarter",
    body: "Structure scope, rates, assumptions, and source notes around the way the project will actually be built.",
  },
  {
    number: "02",
    title: "Propose better",
    body: "Carry the estimate into a client-ready proposal without rebuilding the same number in another document.",
  },
  {
    number: "03",
    title: "Win faster",
    body: "Keep comments, revisions, and approvals attached so the next decision starts from the record.",
  },
] as const;

const problemFragments = [
  "Copied rate",
  "Unnamed attachment",
  "Email revision",
  "Overwritten version",
] as const;

const workflowSteps = [
  {
    number: "1.0",
    title: "Structure",
    body:
      "Organize the estimate by phase, location, scope, package, or trade. Quantities, rates, assumptions, and source notes stay attached to the work they describe.",
    state: "Estimate tree, scoped rows, assumptions",
  },
  {
    number: "2.0",
    title: "Reuse",
    body:
      "Reuse materials, labor, services, assemblies, variants, suppliers, and known costs without losing the context behind them.",
    state: "Library dock, component variants, source notes",
  },
  {
    number: "3.0",
    title: "Propose",
    body:
      "Carry line items, totals, exclusions, and assumptions into a clean client-facing proposal without reformatting or copy-paste.",
    state: "Proposal output, exclusions, review link",
  },
  {
    number: "4.0",
    title: "Decide",
    body:
      "Capture comments, questions, revision requests, approvals, and version history in the same commercial record.",
    state: "Comments, versions, decisions",
  },
] as const;

const featureRows = [
  {
    feature: "Reusable cost intelligence",
    value:
      "Save materials, labor, services, assemblies, variants, suppliers, and source notes as reusable commercial knowledge.",
    proof: "The value is not simply saving a rate. It is remembering why the rate was trusted.",
  },
  {
    feature: "Proposal handoff",
    value:
      "Line items, totals, exclusions, and assumptions move into a client-ready proposal while staying connected to the estimate.",
    proof: "Client-facing clarity without internal context loss.",
  },
  {
    feature: "Revision and activity history",
    value:
      "Comments, changes, versions, and decisions stay attached to the proposal and the work behind it.",
    proof: "A change should never erase the reason behind it.",
  },
  {
    feature: "Private by design",
    value:
      "Your data is never pooled or anonymized across customers. Built on Cloudflare Workers, D1, R2, and Better Auth.",
    proof: "Privacy is a positioning choice, not a feature.",
  },
] as const;

const specialties = [
  {
    id: "architects",
    label: "Architects",
    copy:
      "Build estimate trees that mirror your design intent. Keep finish options, exclusions, and client decisions attached from first concept to final approval.",
    visual: "Area-based estimate tree with finish options and exclusions.",
  },
  {
    id: "engineers",
    label: "Engineers",
    copy:
      "Build reusable assemblies per discipline. Variant costing, supplier context, and labor logic move with the assembly.",
    visual: "Discipline assemblies with supplier variants and labor logic.",
  },
  {
    id: "general-contractors",
    label: "General contractors",
    copy:
      "Organize costs across phases, locations, trades, bid packages, and allowances. Preserve the assumptions behind the total.",
    visual: "Phase and package tree with allowances held beside the estimate total.",
  },
  {
    id: "specialty-contractors",
    label: "Specialty / fit-out contractors",
    copy:
      "Build reusable assemblies, variants, supplier references, labor logic, and scope packages that move into future estimates.",
    visual: "Assembly variants with supplier context and reusable labor logic.",
  },
  {
    id: "cost-estimators-qs",
    label: "Cost estimators / QS",
    copy:
      "Structure BOQ-grade estimates with unit-rate discipline. Every rate keeps its source note, every quantity keeps its assumption.",
    visual: "BOQ-structured estimate with source notes and assumptions attached.",
  },
  {
    id: "interior-designers",
    label: "Interior designers",
    copy:
      "Keep rooms, finishes, options, exclusions, and client decisions connected from the first estimate through final approval.",
    visual: "Room-based estimate with finish options and client decisions attached.",
  },
  {
    id: "project-managers",
    label: "Project managers",
    copy:
      "Walk into every pricing conversation with the full record: what was proposed, what changed, what was approved, when, and by whom.",
    visual: "Activity timeline with proposal, change order, and recorded decision.",
  },
] as const;

const recordNodes = [
  ["Project structure", "Phases, locations, trades"],
  ["Reusable cost library", "Assemblies, suppliers, variants"],
  ["Historical rates", "Source notes, assumptions"],
  ["Estimate", "Scope, quantities, rates"],
  ["Proposal", "Client-ready output"],
  ["Review", "Comments and approvals"],
  ["Decision", "Final response and next action"],
] as const;

const comparisonRows = [
  ["Rates are copied.", "Costs keep their source."],
  ["Proposal data is reformatted.", "Proposal data stays connected."],
  ["Feedback moves to email.", "Review remains attached."],
  ["Revisions overwrite earlier versions.", "Versions stay recoverable."],
  ["The next estimate starts from a blank or duplicated sheet.", "Commercial knowledge compounds."],
] as const;

const proofFrames = [
  {
    label: "Estimate tree",
    route: "/workshop/projects",
    caption: "Hierarchical estimate tree. Drag-and-drop. Inline editing. Live totals.",
    proves: "Structured estimate surface",
  },
  {
    label: "Library dock",
    route: "/workshop/library",
    caption: "Reusable cost component library. Brands, suppliers, variants, pricing, images, attachments.",
    proves: "Cost knowledge reuse",
  },
  {
    label: "Activity panel",
    route: "/workshop/projects",
    caption: "Activity, node activity, row version history, comments, changes, and recorded decisions.",
    proves: "Revision memory",
  },
  {
    label: "Publication viewer",
    route: "/share/demo",
    caption: "Client-ready proposal link with comments, decisions, password protection, and change-order flow.",
    proves: "Proposal handoff",
  },
] as const;

const faqs = [
  {
    question: "How is this different from Excel?",
    answer:
      "Excel calculates. It does not remember. Archestimator keeps rates, suppliers, assumptions, revisions, and approvals attached to the work across projects and time.",
  },
  {
    question: "How is this different from Procore, DESTINI, or what I already use?",
    answer:
      "Enterprise estimating tools already do parts of this. They are built for US enterprise GCs, priced for enterprise, take weeks to set up, and stop at estimating. Archestimator is built for spreadsheet-bound SEA teams and extends past estimating into proposal-to-approval.",
  },
  {
    question: "Can I bring my existing cost library?",
    answer:
      "Yes. Import via Excel template, or build it natively in the Library dock. Each component carries its supplier, brand, variant, price history, and source note.",
  },
  {
    question: "Who owns my data?",
    answer:
      "You do. Your data is never pooled or anonymized across customers. Export your library and estimates anytime.",
  },
  {
    question: "What happens when I cancel?",
    answer:
      "Your library and estimates remain exportable. Cancel anytime; your data stays yours throughout and after.",
  },
] as const;

function PrimaryCta({ location }: { location: string }) {
  return (
    <Link
      href="/contact?intent=access"
      className={styles.primaryCta}
      data-new-landing-cta="primary"
      data-new-landing-location={location}
    >
      <span>Request access</span>
      <ArrowRight size={15} weight="bold" aria-hidden="true" />
    </Link>
  );
}

function SecondaryCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.secondaryCta}>
      <span>{children}</span>
      <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
    </Link>
  );
}

function SectionHead({
  title,
  body,
  id,
}: {
  title: string;
  body?: string;
  id?: string;
}) {
  return (
    <header className={styles.sectionHead}>
      <h2 id={id}>{title}</h2>
      {body ? <p>{body}</p> : null}
    </header>
  );
}

function NewLandingNav() {
  return (
    <header className={styles.navShell}>
      <a href="#new-main" className={styles.skipLink}>
        Skip to content
      </a>
      <div className={styles.navPill}>
        <Link href="/" className={styles.navBrand} aria-label="Archestimator home">
          <ArchestimatorLogo
            tone="dark"
            markSize={30}
            markClassName={styles.logoMark}
            separatorClassName={styles.logoSeparator}
            wordmarkClassName={styles.logoWordmark}
            priority
          />
        </Link>
        <nav className={styles.navLinks} aria-label="Primary">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.navActions}>
          <Link href="/login?next=/workshop/projects" className={styles.signInLink}>
            Sign in
          </Link>
          <PrimaryCta location="nav" />
        </div>
        <details className={styles.mobileMenu}>
          <summary aria-label="Open navigation">
            <span>Menu</span>
          </summary>
          <nav aria-label="Mobile primary">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href="/login?next=/workshop/projects">Sign in</Link>
            <Link href="/contact?intent=access">Request access</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className={styles.hero} aria-labelledby="new-hero-title">
      <div className={styles.heroCopy}>
        <p className={styles.heroEyebrow}>AEC construction cost estimating and proposal platform</p>
        <h1 id="new-hero-title">Where estimates become client-approved proposals.</h1>
        <p className={styles.heroIntro}>
          Build estimates from reusable costs, send client-ready proposals, and keep revisions,
          comments, and approvals attached.
        </p>
        <div className={styles.ctaRow}>
          <PrimaryCta location="hero" />
          <SecondaryCta href="#workflow">See how it works</SecondaryCta>
        </div>
        <p className={styles.promiseLine}>From cost proposal to client approval.</p>
      </div>
      <div className={styles.heroProof} aria-label="Archestimator product proof">
        <div className={styles.heroImageBand}>
          <Image
            src="/landing/archestimator-mountain-hero-photo.png"
            alt="Architectural mountain project context behind the Archestimator workbench."
            width={1896}
            height={830}
            priority
            sizes="(min-width: 960px) 46vw, 94vw"
          />
        </div>
        <div className={styles.mockupShell}>
          <NewHeroWorkbench />
        </div>
      </div>
      <div className={styles.behaviorRail} aria-label="Archestimator behavior summary">
        {behaviorCards.map((card) => (
          <article key={card.number} className={styles.behaviorCard}>
            <span>{card.number}</span>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className={styles.problemSection} aria-labelledby="problem-title">
      <div className={styles.problemCopy}>
        <h2 id="problem-title">
          Spreadsheets calculate.
          <span>They do not remember.</span>
        </h2>
        <div className={styles.problemBody}>
          <p>
            Most estimates stop being useful the moment they become a PDF. Rates lose their
            source. Assumptions disappear. Feedback moves to email. Revisions overwrite why the
            number changed.
          </p>
          <p>The rate you proved on the last project should not disappear into another copied sheet.</p>
          <p>Archestimator keeps the commercial record attached to every line.</p>
        </div>
        <p className={styles.problemCloser}>Your cost intelligence layer.</p>
      </div>
      <div className={styles.fragmentList} aria-label="Spreadsheet failure points">
        {problemFragments.map((fragment) => (
          <span key={fragment}>{fragment}</span>
        ))}
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section className={styles.workflowSection} id="workflow" aria-labelledby="workflow-title">
      <SectionHead
        id="workflow-title"
        title="From first cost to final decision, nothing loses context."
        body="The workflow is a sequence, not a pile of detached files."
      />
      <ol className={styles.workflowList}>
        {workflowSteps.map((step) => (
          <li key={step.number} className={styles.workflowStep}>
            <div className={styles.stepNumber}>{step.number}</div>
            <div className={styles.stepCopy}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
            <div className={styles.stepState}>
              <span>{step.state}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ProductSection() {
  return (
    <section className={styles.productSection} id="product" aria-labelledby="product-title">
      <SectionHead
        id="product-title"
        title="The workbench is the product."
        body="Each surface exists to keep the estimate, the proposal, and the decision trail connected."
      />
      <div className={styles.featureSheet} role="list">
        {featureRows.map((row) => (
          <article key={row.feature} className={styles.featureRow} role="listitem">
            <h3>{row.feature}</h3>
            <p>{row.value}</p>
            <strong>{row.proof}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function SpecialtiesSection() {
  return (
    <section className={styles.specialtiesSection} id="specialties" aria-labelledby="specialties-title">
      <SectionHead
        id="specialties-title"
        title="Built for the people who own the number on a cost estimate."
        body="Different roles carry different risk. The record has to travel with each of them."
      />
      <div className={styles.specialtyGrid}>
        {specialties.map((specialty) => (
          <article key={specialty.id} className={styles.specialtyCard}>
            <h3>{specialty.label}</h3>
            <p>{specialty.copy}</p>
            <span>{specialty.visual}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function AudienceMapSection() {
  return (
    <section className={styles.audienceMap} aria-labelledby="audience-map-title">
      <SectionHead
        id="audience-map-title"
        title="From the first line item to the final approval."
        body="Archestimator is the path from project structure and reusable cost knowledge to proposal review, revision, decision, and recorded history."
      />
      <div className={styles.recordMap}>
        {recordNodes.map(([label, body]) => (
          <div key={label} className={styles.recordNode}>
            <span>{label}</span>
            <p>{body}</p>
          </div>
        ))}
      </div>
      <p className={styles.historyRail}>
        Every comment, change, version, and decision remains attached, searchable, attributable,
        and recoverable.
      </p>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className={styles.comparisonSection} aria-labelledby="comparison-title">
      <SectionHead
        id="comparison-title"
        title="The difference is memory."
        body="The estimate should not lose the reason behind the number when it becomes a proposal."
      />
      <div className={styles.comparisonTable} role="table" aria-label="Spreadsheet workflow compared with Archestimator">
        <div className={styles.comparisonHeader} role="row">
          <span role="columnheader">Copied workflow</span>
          <span role="columnheader">Archestimator</span>
        </div>
        {comparisonRows.map(([copied, archestimator]) => (
          <div key={copied} className={styles.comparisonRow} role="row">
            <span role="cell">{copied}</span>
            <Link role="cell" href="/features">
              {archestimator}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProofSection() {
  return (
    <section className={styles.proofSection} id="proof" aria-labelledby="proof-title">
      <SectionHead
        id="proof-title"
        title="Built for the work you actually do."
        body="Archestimator ships today. These are product surfaces you can inspect."
      />
      <div className={styles.proofGrid}>
        {proofFrames.map((frame) => (
          <article key={frame.label} className={styles.proofFrame}>
            <div className={styles.proofFrameHeader}>
              <span>{frame.label}</span>
              <Link href={frame.route} aria-label={`Open ${frame.label}`}>
                <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
              </Link>
            </div>
            <p>{frame.caption}</p>
            <strong>{frame.proves}</strong>
          </article>
        ))}
      </div>
      <div className={styles.complianceLine}>
        <ShieldCheck size={19} weight="regular" aria-hidden="true" />
        <p>
          Private by design. Built on Cloudflare Workers, D1, R2, and Better Auth.
          Your data is yours, never pooled or anonymized across customers.
        </p>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className={styles.faqSection} id="faq" aria-labelledby="faq-title">
      <SectionHead
        id="faq-title"
        title="Questions worth answering before the walkthrough."
        body="Short answers for the commercial and data questions that usually decide whether a team can try a new estimating workflow."
      />
      <div className={styles.faqList}>
        {faqs.map((faq) => (
          <details key={faq.question} className={styles.faqItem}>
            <summary>{faq.question}</summary>
            <p>{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className={styles.finalCta} id="final-cta" aria-labelledby="final-cta-title">
      <div>
        <h2 id="final-cta-title">Start your next estimate from the ones you have already done.</h2>
        <p>From cost proposal to client approval.</p>
      </div>
      <div className={styles.finalCtaActions}>
        <PrimaryCta location="final" />
        <SecondaryCta href="/contact?intent=walkthrough">Book a walkthrough</SecondaryCta>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <p>Client-approved proposals should start with a cost record you trust.</p>
      <div className={styles.footerMeta}>
        <Link href="/" aria-label="Archestimator home">
          <ArchestimatorLogo
            tone="dark"
            markSize={28}
            markClassName={styles.logoMark}
            separatorClassName={styles.logoSeparator}
            wordmarkClassName={styles.logoWordmark}
          />
        </Link>
        <nav aria-label="Footer">
          <Link href="/features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/trust">Trust</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
        <span>Copyright 2026 Archestimator.</span>
      </div>
    </footer>
  );
}

export function NewLandingPage() {
  return (
    <div className={styles.page}>
      <NewLandingNav />
      <main id="new-main" className={styles.main}>
        <HeroSection />
        <ProblemSection />
        <WorkflowSection />
        <ProductSection />
        <SpecialtiesSection />
        <AudienceMapSection />
        <ComparisonSection />
        <ProofSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <LandingFooter />
      <Link href="/contact?intent=access" className={styles.stickyCta}>
        <CheckCircle size={16} weight="regular" aria-hidden="true" />
        <span>Request access</span>
      </Link>
    </div>
  );
}
