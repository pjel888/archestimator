import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { ArchestimatorLogo, ArchestimatorLogoMark } from "@/components/brand/ArchestimatorLogo";
import { CostThreadJourney } from "./CostThreadJourney";
import { finalCta, footer, handoff, hero, journey, knowledge, nav, trust } from "./landing-content";
import styles from "./new-landing.module.css";

function PrimaryCta({ location }: { location: string }) {
  return (
    <Link
      href={nav.cta.href}
      className={styles.primaryCta}
      data-new-landing-cta="primary"
      data-new-landing-location={location}
    >
      <span>{nav.cta.label}</span>
      <ArrowUpRight size={17} weight="bold" aria-hidden="true" />
    </Link>
  );
}

function LandingNav() {
  return (
    <header className={styles.nav}>
      <a href="#new-main" className={styles.skipLink}>
        Skip to content
      </a>
      <div className={styles.navInner}>
        <Link href="/" className={styles.brand} aria-label="Archestimator home">
          <ArchestimatorLogo tone="dark" markSize={27} priority />
        </Link>
        <nav className={styles.desktopLinks} aria-label="Primary">
          {nav.links.map((item) => (
            <Link key={item.label} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.navActions}>
          <Link href={nav.signIn.href} className={styles.signIn}>
            {nav.signIn.label}
          </Link>
          <PrimaryCta location="nav" />
        </div>
        <details className={styles.mobileMenu}>
          <summary>Menu</summary>
          <nav aria-label="Mobile primary">
            {nav.links.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href={nav.signIn.href}>{nav.signIn.label}</Link>
            <Link href={nav.cta.href} className={styles.mobileCta}>
              {nav.cta.label}
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="new-hero-title">
      <div className={styles.heroInner}>
        <p className={styles.kicker}>{hero.kicker}</p>
        <h1 id="new-hero-title">{hero.title}</h1>
        <p className={styles.heroBody}>{hero.body}</p>
        <div className={styles.heroAction}>
          <PrimaryCta location="hero" />
          <span>{hero.note}</span>
        </div>
      </div>
      <div className={styles.heroEdge} aria-hidden="true">
        <span>Build</span>
        <span>Present</span>
        <span>Respond</span>
        <span>Remember</span>
      </div>
    </section>
  );
}

function HandoffSection() {
  return (
    <section className={styles.handoff} aria-labelledby="handoff-title">
      <div className={styles.sectionInner}>
        <p className={styles.inverseKicker}>{handoff.kicker}</p>
        <div className={styles.handoffGrid}>
          <h2 id="handoff-title">{handoff.title}</h2>
          <p>{handoff.body}</p>
        </div>
        <ol className={styles.handoffWords}>
          {handoff.words.map((word, index) => (
            <li key={word}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{word}</strong>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function KnowledgeSection() {
  return (
    <section className={styles.knowledge} id="cost-knowledge" aria-labelledby="knowledge-title">
      <div className={styles.sectionInner}>
        <p className={styles.kicker}>{knowledge.kicker}</p>
        <h2 id="knowledge-title">{knowledge.title}</h2>
        <div className={styles.knowledgeLower}>
          <p>{knowledge.body}</p>
          <ul aria-label="Reusable cost knowledge">
            {knowledge.parts.map((part) => (
              <li key={part}>{part}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className={styles.trust} aria-labelledby="trust-title">
      <div className={styles.sectionInner}>
        <h2 id="trust-title">{trust.title}</h2>
        <ul>
          {trust.facts.map((fact, index) => (
            <li key={fact}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{fact}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FinalSection() {
  return (
    <section className={styles.final} id="early-access" aria-labelledby="final-title">
      <div className={styles.finalInner}>
        <p className={styles.kicker}>{finalCta.kicker}</p>
        <h2 id="final-title">{finalCta.title}</h2>
        <p>{finalCta.body}</p>
        <PrimaryCta location="final" />
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <Link href="/" className={styles.footerBrand} aria-label="Archestimator home">
          <ArchestimatorLogoMark tone="dark" size={21} />
          <span>archestimator</span>
        </Link>
        <nav aria-label="Footer">
          {footer.links.map((item) => (
            <Link key={item.label} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.footerMeta}>
          <span>{footer.status}</span>
          <span>{footer.copyright}</span>
        </div>
      </div>
    </footer>
  );
}

export function NewLandingPage() {
  return (
    <div className={styles.page}>
      <LandingNav />
      <main id="new-main">
        <Hero />
        <CostThreadJourney content={journey} />
        <HandoffSection />
        <KnowledgeSection />
        <TrustSection />
        <FinalSection />
      </main>
      <LandingFooter />
    </div>
  );
}
