import Link from "next/link";
import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { FrontdoorHeroField } from "./FrontdoorHeroField";
import styles from "./FrontdoorPage.module.css";

const REQUEST_ACCESS_HREF = "/contact?intent=early-access";
const WALKTHROUGH_HREF = "/contact?intent=walkthrough";
const WORKSHOP_HREF = "/workshop";
const LOGIN_HREF = "/login?next=/workshop/projects";

type FrontdoorPageProps = {
  isLoggedIn: boolean;
};

const workflowItems = [
  {
    title: "Prices remain reusable.",
    body: "Materials, labor, assemblies, suppliers, and source notes stay available when the next estimate starts.",
  },
  {
    title: "Estimate lines keep their evidence.",
    body: "Scope, quantities, assumptions, adjustments, versions, and attachments travel with the line they support.",
  },
  {
    title: "Proposal packages stay connected.",
    body: "Client-safe summaries, alternates, exclusions, and review links come from the estimate instead of a rewrite.",
  },
];

const audienceItems = [
  "Estimators building and revising project cost sheets.",
  "Project managers and builders coordinating estimate readiness.",
  "Business owners reviewing risk, margin, approvals, and handoff.",
  "Cost-library managers keeping sources, supplier notes, and accepted costs current.",
  "Clients and stakeholders receiving proposal packages for review.",
];

export function FrontdoorPage({ isLoggedIn }: FrontdoorPageProps) {
  const primaryHref = isLoggedIn ? WORKSHOP_HREF : REQUEST_ACCESS_HREF;
  const primaryLabel = isLoggedIn ? "Open workspace" : "Request access";

  return (
    <main
      id="main-content"
      className={styles.page}
      data-landing-page-root="true"
      data-frontdoor-root="bid-desk"
    >
      <header className={styles.header}>
        <Link href="/" aria-label="Archestimator home" className={styles.brand}>
          <ArchestimatorLogo tone="dark" markSize={34} separatorClassName={styles.logoSeparator} />
        </Link>
        <nav aria-label="Homepage" className={styles.nav}>
          <Link href="#workflow">Workflow</Link>
          <Link href="#users">Users</Link>
          <Link href="#contact">Contact</Link>
        </nav>
        <div className={styles.actions}>
          {!isLoggedIn ? <Link href={LOGIN_HREF}>Sign in</Link> : null}
          <Link href={primaryHref}>{primaryLabel}</Link>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="frontdoor-title">
        <FrontdoorHeroField className={styles.heroField} />
        <div className={styles.heroWash} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Technical estimating workspace for teams that price, review, and send work.</p>
          <h1 id="frontdoor-title">Connected estimating workspace.</h1>
          <p className={styles.lede}>
            Archestimator keeps prices, scope, source evidence, revisions, and proposal packages connected from
            the first estimate to the client review.
          </p>
          <div className={styles.heroLedger} aria-label="Connected estimating records">
            <span>Cost library</span>
            <span>Estimate evidence</span>
            <span>Proposal package</span>
          </div>
          <div className={styles.ctaRow} aria-label="Primary actions">
            <Link className={styles.primaryCta} href={primaryHref}>
              {primaryLabel}
            </Link>
            <Link className={styles.secondaryCta} href={WALKTHROUGH_HREF}>
              Walk through an estimate
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.workflow} id="workflow" aria-labelledby="workflow-title">
        <div className={styles.sectionIntro}>
          <h2 id="workflow-title">One workflow instead of three handoffs.</h2>
          <p>
            The product is organized around the actual estimating loop: cost knowledge, project estimate, and
            proposal review.
          </p>
        </div>
        <div className={styles.workflowList}>
          {workflowItems.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.users} id="users" aria-labelledby="users-title">
        <div className={styles.sectionIntro}>
          <h2 id="users-title">Built for the people around the estimate.</h2>
          <p>
            Archestimator has to support primary app users, collaborators, shared-link recipients, and the people
            maintaining cost-source truth.
          </p>
        </div>
        <ul className={styles.userList}>
          {audienceItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className={styles.statement} aria-labelledby="statement-title">
        <h2 id="statement-title">No fake proof. No borrowed maturity.</h2>
        <p>
          The page should earn trust by describing the estimating work clearly: reusable prices, sourced lines,
          recoverable revisions, and proposal packages that clients can understand.
        </p>
      </section>

      <footer className={styles.footer} id="contact">
        <p>Bring one estimate. We will map the workflow around it.</p>
        <div>
          <Link href={primaryHref}>{primaryLabel}</Link>
          <Link href={WALKTHROUGH_HREF}>Book walkthrough</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </footer>
    </main>
  );
}
