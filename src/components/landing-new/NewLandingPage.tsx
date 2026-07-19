import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { ArchestimatorLogoMark } from "@/components/brand/ArchestimatorLogo";
import { NewHeroSceneLoader } from "./NewHeroSceneLoader";
import { NewEstimateSheet } from "./NewEstimateSheet";
import { NewLandingMotion } from "./NewLandingMotion";
import styles from "./new-landing.module.css";

const navItems = [
  { label: "Product", href: "#product" },
  { label: "Workflow", href: "#workflow" },
  { label: "Specialties", href: "#specialties" },
  { label: "Pricing", href: "/pricing" },
] as const;

const problemFragments = [
  "Copied rate",
  "Unnamed attachment",
  "Email revision",
  "Overwritten version",
] as const;

const workflowSteps = [
  {
    number: "01",
    title: "Structure",
    body:
      "Organize the estimate by phase, location, scope, package, or trade. Quantities, rates, assumptions, and source notes stay attached to the work they describe.",
    state: "Estimate tree · scoped rows · assumptions",
  },
  {
    number: "02",
    title: "Reuse",
    body:
      "Reuse materials, labor, services, assemblies, variants, suppliers, and known costs without losing the context behind them.",
    state: "Library dock · component variants · source notes",
  },
  {
    number: "03",
    title: "Propose",
    body:
      "Carry line items, totals, exclusions, and assumptions into a clean client-facing proposal without reformatting or copy-paste.",
    state: "Proposal output · exclusions · review link",
  },
  {
    number: "04",
    title: "Decide",
    body:
      "Capture comments, questions, revision requests, approvals, and version history in the same commercial record.",
    state: "Comments · versions · decisions",
  },
] as const;

const comparisonRows = [
  ["Rates are copied.", "Costs keep their source."],
  ["Proposal data is reformatted.", "Proposal data stays connected."],
  ["Feedback moves to email.", "Review remains attached."],
  ["Revisions overwrite earlier versions.", "Versions stay recoverable."],
  ["The next estimate starts from a blank or duplicated sheet.", "Commercial knowledge compounds."],
] as const;

const specialties = [
  {
    label: "Architects",
    copy:
      "Estimate trees that mirror design intent, with finish options, exclusions, and client decisions attached from first concept to final approval.",
  },
  {
    label: "Engineers",
    copy:
      "Reusable assemblies per discipline. Variant costing, supplier context, and labor logic move with the assembly.",
  },
  {
    label: "General contractors",
    copy:
      "Costs organized across phases, locations, trades, bid packages, and allowances — with the assumptions behind the total preserved.",
  },
  {
    label: "Specialty / fit-out contractors",
    copy:
      "Reusable assemblies, variants, supplier references, and scope packages that move into future estimates.",
  },
  {
    label: "Cost estimators / QS",
    copy:
      "BOQ-grade estimates with unit-rate discipline. Every rate keeps its source note; every quantity keeps its assumption.",
  },
  {
    label: "Interior designers",
    copy:
      "Rooms, finishes, options, exclusions, and client decisions connected from the first estimate through final approval.",
  },
  {
    label: "Project managers",
    copy:
      "Walk into every pricing conversation with the full record: what was proposed, what changed, what was approved, when, and by whom.",
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
      className={styles.ctaPrimary}
      data-new-landing-cta="primary"
      data-new-landing-location={location}
    >
      <span>Request access</span>
      <span className={styles.ctaIconOrb} aria-hidden="true">
        <ArrowRight size={14} weight="bold" />
      </span>
    </Link>
  );
}

function GhostCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.ctaGhost}>
      <span>{children}</span>
      <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
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
    <section className={styles.hero} aria-labelledby="new-hero-title" data-hero-root>
      <div className={styles.heroStage} data-hero="scene">
        <NewHeroSceneLoader />
      </div>
      <div className={styles.heroShade} aria-hidden="true" />

      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
        <p className={styles.heroKicker} data-hero="kicker">
          <span className={styles.kickerMark} aria-hidden="true" />
          Estimating · proposals · approvals
        </p>
        <h1 id="new-hero-title" className={styles.heroTitle}>
          <span className={styles.maskLine}>
            <span className={styles.lineInner} data-hero-line>
              every number
            </span>
          </span>
          <span className={styles.maskLine}>
            <span className={styles.lineInner} data-hero-line>
              keeps its{" "}
              <span className={styles.accentWord}>
                source
                <svg
                  className={styles.accentUnderline}
                  viewBox="0 0 400 14"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    data-hero="underline"
                    d="M4 10 C 90 3, 300 3, 396 8"
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              .
            </span>
          </span>
        </h1>
        <p className={styles.heroIntro} data-hero="intro">
          Archestimator is the estimating workspace with a memory. Every rate, supplier, and
          assumption stays attached — from first line item, to client-ready proposal, to recorded
          approval.
        </p>
        <div className={styles.heroCtas} data-hero="ctas">
          <PrimaryCta location="hero" />
          <GhostCta href="#workflow">
            See the workflow
          </GhostCta>
        </div>
        </div>
      </div>
    </section>
  );
}

function SheetSection() {
  return (
    <section className={styles.sheetSection} aria-labelledby="sheet-title">
      <div className={styles.sectionInner}>
        <header className={styles.sectionHead} data-reveal>
          <h2 id="sheet-title">The estimate sheet is the product.</h2>
          <p>
            Materials, quantities, unit costs, and per-row contingency — with every supplier,
            source note, and revision still attached.
          </p>
        </header>
        <NewEstimateSheet />
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className={styles.problem} aria-labelledby="problem-title">
      <div className={styles.sectionInner}>
        <h2 id="problem-title" className={styles.problemTitle} data-scrub-words>
          Spreadsheets calculate. They don&#39;t remember.
        </h2>
        <div className={styles.problemBody} data-reveal>
          <p>
            Most estimates stop being useful the moment they become a PDF. Rates lose their
            source. Assumptions disappear. Feedback moves to email. Revisions overwrite why the
            number changed.
          </p>
          <p>
            Archestimator keeps the commercial record attached to every line — so the rate you
            proved on the last project is still working on the next one.
          </p>
        </div>
        <ul className={styles.fragments} aria-label="Spreadsheet failure points" data-reveal>
          {problemFragments.map((fragment) => (
            <li key={fragment} className={styles.fragment}>
              {fragment}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section className={styles.workflow} id="workflow" aria-labelledby="workflow-title">
      <div className={styles.sectionInner}>
        <div className={styles.workflowGrid}>
          <div className={styles.workflowSticky}>
            <h2 id="workflow-title">From first cost to final decision, nothing loses context.</h2>
            <p>
              The workflow is a sequence, not a pile of detached files. Each step hands its
              context to the next.
            </p>
            <ol className={styles.progressRail} aria-hidden="true">
              {workflowSteps.map((step) => (
                <li key={step.number} className={styles.railItem} data-rail-item={step.number}>
                  <span className={styles.railIndex}>{step.number}</span>
                  <span>{step.title}</span>
                </li>
              ))}
            </ol>
          </div>
          <ol className={styles.steps}>
            {workflowSteps.map((step) => (
              <li key={step.number} className={styles.step} data-step={step.number}>
                <span className={styles.stepIndex} aria-hidden="true">
                  {step.number}
                </span>
                <div className={styles.stepCopy}>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  <span className={styles.stepState}>{step.state}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function ProductSection() {
  return (
    <section className={styles.product} id="product" aria-labelledby="product-title">
      <div className={styles.sectionInner}>
        <header className={styles.sectionHead} data-reveal>
          <h2 id="product-title">The workbench is the product.</h2>
          <p>
            Each surface exists to keep the estimate, the proposal, and the decision trail
            connected.
          </p>
        </header>

        <div className={styles.bento}>
          <article className={`${styles.cell} ${styles.cellEstimate}`} data-reveal>
            <span className={styles.cellLabel}>Estimate tree</span>
            <h3>Structure the work.</h3>
            <p>Hierarchical estimate tree with drag-and-drop, inline editing, and live totals.</p>
            <ul className={styles.miniRows} aria-hidden="true">
              <li>Phases</li>
              <li>Locations</li>
              <li>Trades</li>
            </ul>
            <Link href="/workshop/projects" className={styles.cellLink}>
              Open surface
              <ArrowUpRight size={13} weight="bold" aria-hidden="true" />
            </Link>
          </article>

          <article className={`${styles.cell} ${styles.cellLibrary}`} data-reveal>
            <span className={styles.cellLabel}>Cost library</span>
            <h3>Reuse what you proved.</h3>
            <p>Brands, suppliers, variants, pricing, images, and attachments as components.</p>
            <ul className={styles.miniRows} aria-hidden="true">
              <li>Assemblies</li>
              <li>Suppliers</li>
              <li>Variants</li>
            </ul>
            <Link href="/workshop/library" className={styles.cellLink}>
              Open surface
              <ArrowUpRight size={13} weight="bold" aria-hidden="true" />
            </Link>
          </article>

          <article className={`${styles.cell} ${styles.cellActivity}`} data-reveal>
            <span className={styles.cellLabel}>Revision memory</span>
            <h3>Nothing overwrites why.</h3>
            <p>Comments, row version history, changes, and recorded decisions stay attached.</p>
            <ul className={styles.miniRows} aria-hidden="true">
              <li>Comments</li>
              <li>Versions</li>
              <li>Decisions</li>
            </ul>
            <Link href="/workshop/projects" className={styles.cellLink}>
              Open surface
              <ArrowUpRight size={13} weight="bold" aria-hidden="true" />
            </Link>
          </article>

          <article className={styles.cellWide} data-reveal>
            <div>
              <span className={styles.cellLabel}>Client-ready proposal</span>
              <h3>Send the number as a proposal. Keep the approval on record.</h3>
              <p>
                A client link with comments, decisions, password protection, and change-order
                flow.
              </p>
            </div>
            <Link href="/share/demo" className={styles.cellLink}>
              Open the publication viewer
              <ArrowUpRight size={13} weight="bold" aria-hidden="true" />
            </Link>
          </article>
        </div>

        <div className={styles.complianceLine} data-reveal>
          <ShieldCheck size={19} weight="regular" aria-hidden="true" />
          <p>
            Private by design. Built on Cloudflare Workers, D1, R2, and Better Auth — your data is
            never pooled or anonymized across customers.
          </p>
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className={styles.compare} aria-labelledby="compare-title">
      <div className={styles.sectionInner}>
        <header className={styles.sectionHead} data-reveal>
          <h2 id="compare-title">The difference is memory.</h2>
          <p>
            The estimate should not lose the reason behind the number when it becomes a proposal.
          </p>
        </header>
        <div className={styles.compareTable} role="table" aria-label="Spreadsheet workflow compared with Archestimator">
          <div className={styles.compareHeader} role="row">
            <span role="columnheader">Copied workflow</span>
            <span role="columnheader">Archestimator</span>
          </div>
          {comparisonRows.map(([copied, kept]) => (
            <div key={copied} className={styles.compareRow} role="row" data-reveal>
              <span role="cell" className={styles.copied}>
                {copied}
              </span>
              <span role="cell" className={styles.kept}>
                <span className={styles.keptMark} aria-hidden="true" />
                {kept}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SpecialtiesSection() {
  return (
    <section className={styles.specialties} id="specialties" aria-labelledby="specialties-title">
      <div className={styles.sectionInner}>
        <header className={styles.sectionHead} data-reveal>
          <h2 id="specialties-title">Built for the people who own the number.</h2>
          <p>Different roles carry different risk. The record has to travel with each of them.</p>
        </header>
        <ul className={styles.specList}>
          {specialties.map((specialty, index) => (
            <li key={specialty.label} className={styles.specRow} data-reveal>
              <span className={styles.specIndex} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{specialty.label}</h3>
              <p>{specialty.copy}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function StatementSection() {
  return (
    <section className={styles.statement} aria-labelledby="statement-title">
      <div className={styles.statementGlow} aria-hidden="true" />
      <div className={styles.sectionInner}>
        <h2 id="statement-title" className={styles.statementTitle} data-scrub-words>
          From cost proposal to client approval.
        </h2>
        <p className={styles.statementCaption} data-reveal>
          Revisions · comments · approvals — attached to the commercial record
        </p>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className={styles.faq} id="faq" aria-labelledby="faq-title">
      <div className={styles.sectionInner}>
        <header className={styles.sectionHead} data-reveal>
          <h2 id="faq-title">Questions worth answering first.</h2>
          <p>
            Short answers for the commercial and data questions that usually decide whether a
            team can try a new estimating workflow.
          </p>
        </header>
        <div className={styles.faqList} data-reveal>
          {faqs.map((faq) => (
            <details key={faq.question} className={styles.faqItem}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className={styles.final} aria-labelledby="final-cta-title" data-final-cta>
      <div className={styles.finalGridEcho} aria-hidden="true" />
      <div className={styles.sectionInner}>
        <h2 id="final-cta-title" data-reveal>
          Start your next estimate from the ones you&#39;ve already done.
        </h2>
        <p data-reveal>From cost proposal to client approval.</p>
        <div className={styles.finalCtas} data-reveal>
          <PrimaryCta location="final" />
          <GhostCta href="/contact?intent=walkthrough">
            Book a walkthrough
          </GhostCta>
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
            <Link href="/features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/trust">Trust</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <span>© 2026 Archestimator</span>
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
          <SheetSection />
          <ProblemSection />
          <WorkflowSection />
          <ProductSection />
          <ComparisonSection />
          <SpecialtiesSection />
          <StatementSection />
          <FaqSection />
          <FinalCtaSection />
        </main>
        <LandingFooter />
        <Link href="/contact?intent=access" className={styles.stickyCta} data-sticky-cta>
          <span>Request access</span>
          <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
        </Link>
      </div>
    </NewLandingMotion>
  );
}
