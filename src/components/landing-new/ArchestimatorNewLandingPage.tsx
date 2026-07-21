import Link from "next/link";
import { ArrowRight, CaretDown, CheckCircle, List } from "@phosphor-icons/react/dist/ssr";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { stringifyJsonLd } from "@/lib/landing/json-ld";
import { cn } from "@/lib/ui/cn";
import { EarlyAccessCta, AuthUtilityLink } from "./NewLandingAuthCta";
import { NewLandingHeroDemo } from "./NewLandingHeroDemo";
import { NewLandingMotionController } from "./NewLandingMotionController";
import { BentoMiniVisual, LandingContainer, SectionHeading } from "./NewLandingPrimitives";
import styles from "./new-landing.module.css";
import {
  activityCopy,
  audienceCopy,
  bentoCopy,
  connectionCopy,
  earlyAccessCopy,
  faqCopy,
  finalCtaCopy,
  footerCopy,
  headerCopy,
  heroCopy,
  principlesCopy,
  recordFlowCopy,
  workflowOutcomes,
} from "./new-landing-content";

const bentoToneClass: Record<(typeof bentoCopy.cards)[number]["id"], string> = {
  structure: styles.bentoStructure,
  reuse: styles.bentoReuse,
  present: styles.bentoPresent,
  revise: styles.bentoRevise,
};

const flowToneClass: Record<string, string> = {
  cool: styles.flowNodeCool,
  signal: styles.flowNodeSignal,
  slate: styles.flowNodeSlate,
  olive: styles.flowNodeOlive,
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqCopy.faqs.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

/**
 * Server-first composition for the `/new` preview landing. Client islands are
 * limited to the motion controller, the hero product demo, and the small
 * auth-aware CTA/link components.
 */
export function ArchestimatorNewLandingPage() {
  return (
    <div className={styles.root} data-new-landing-root>
      <NewLandingMotionController />
      <a href="#main-content" className={styles.skipLink}>
        {headerCopy.skipLink}
      </a>
      <NewLandingHeader />
      <BetaAnnouncement />
      <main id="main-content">
        <HeroSection />
        <OutcomeSection />
        <AudienceMarquee />
        <ProductBentoSection />
        <ConnectedRecordSection />
        <ActivitySection />
        <PrinciplesSection />
        <ConnectionMatrixSection />
        <EarlyAccessSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <NewLandingFooter />
      <script
        type="application/ld+json"
        // Static trusted schema generated from the visible FAQ array above.
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(faqSchema) }}
      />
    </div>
  );
}

/* ---------------------------------- header ---------------------------------- */

function NewLandingHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brandLink} aria-label="Archestimator home">
          <ArchestimatorLogo markSize={26} priority />
        </Link>
        <nav className={styles.desktopNav} aria-label="Primary">
          {headerCopy.nav.map((item) => (
            <a key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <AuthUtilityLink className={styles.utilityLink} hideWhenLoggedIn />
          <EarlyAccessCta location="header" className={styles.headerCta} />
          <details className={styles.mobileMenu} data-new-landing-menu>
            <summary className={styles.menuSummary}>
              <List size={18} weight="bold" aria-hidden="true" />
              <span>{headerCopy.menuLabel}</span>
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
      </div>
    </header>
  );
}

function BetaAnnouncement() {
  return (
    <aside className={styles.betaBanner} aria-label="Pre-release beta announcement">
      <LandingContainer className={styles.betaBannerInner}>
        <p className={styles.betaBannerMessage}>
          <span className={styles.betaBannerEyebrow}>Now on pre-release beta</span>
          <span>Built with hands-on AEC teams shaping the estimating workflow.</span>
        </p>
        <a href="#early-access" className={styles.betaBannerLink}>
          See how access works
          <ArrowRight size={15} weight="bold" aria-hidden="true" />
        </a>
      </LandingContainer>
    </aside>
  );
}

/* ---------------------------------- hero ---------------------------------- */

function HeroSection() {
  return (
    <section className={styles.hero} aria-labelledby="new-hero-title" data-new-landing-section="hero">
      <div className={styles.heroAurora} aria-hidden="true">
        <span className={styles.auroraField} data-field="one" />
        <span className={styles.auroraField} data-field="two" />
        <span className={styles.auroraField} data-field="three" />
      </div>
      <LandingContainer className={styles.heroInner}>
        <p className={styles.heroBadge} data-hero-motion="badge">
          {heroCopy.badge}
        </p>
        <h1 id="new-hero-title" className={styles.heroTitle} data-hero-motion="title">
          {heroCopy.title}
        </h1>
        <p className={styles.heroLead} data-hero-motion="lead">
          {heroCopy.lead}
        </p>
        <div className={styles.heroCtaRow} data-hero-motion="cta">
          <EarlyAccessCta location="hero" />
        </div>
        <p className={styles.heroStageNote} data-hero-motion="cta">
          {heroCopy.stageNote}
        </p>
        <div className={styles.heroFrameSlot} data-hero-motion="frame">
          <NewLandingHeroDemo />
        </div>
      </LandingContainer>
    </section>
  );
}

/* ---------------------------------- outcomes ---------------------------------- */

function OutcomeSection() {
  return (
    <section className={styles.outcomes} aria-label="Workflow outcomes">
      <LandingContainer>
        <ol className={styles.outcomeGrid}>
          {workflowOutcomes.map((outcome, index) => (
            <li
              key={outcome.id}
              className={styles.outcomeCell}
              data-new-landing-reveal
              data-reveal-direction="up"
              data-reveal-delay={(index * 0.06).toFixed(2)}
            >
              <div className={styles.outcomeTop}>
                <span className={styles.outcomeIndex}>{outcome.index}</span>
                <outcome.icon size={18} className={styles.outcomeIcon} aria-hidden="true" />
              </div>
              <p className={styles.outcomeTitle}>{outcome.title}</p>
              <p className={styles.outcomeBody}>{outcome.body}</p>
            </li>
          ))}
        </ol>
      </LandingContainer>
    </section>
  );
}

/* ---------------------------------- audience marquee ---------------------------------- */

function AudienceMarquee() {
  return (
    <section className={styles.audience} aria-label={audienceCopy.listLabel}>
      <p className={styles.audienceLabel}>{audienceCopy.label}</p>
      <div className={styles.marquee}>
        <div className={styles.marqueeTrack}>
          <ul className={styles.marqueeList}>
            {audienceCopy.items.map((item) => (
              <li key={item} className={styles.marqueeItem}>
                <span>{item}</span>
                <span className={styles.marqueeMark} aria-hidden="true" />
              </li>
            ))}
          </ul>
          <ul className={styles.marqueeList} aria-hidden="true">
            {audienceCopy.items.map((item) => (
              <li key={item} className={styles.marqueeItem}>
                <span>{item}</span>
                <span className={styles.marqueeMark} aria-hidden="true" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- product bento ---------------------------------- */

function ProductBentoSection() {
  return (
    <section
      id="product"
      className={styles.section}
      aria-labelledby="new-product-title"
      data-new-landing-section="product"
    >
      <LandingContainer>
        <SectionHeading
          id="new-product-title"
          kicker={bentoCopy.kicker}
          title={bentoCopy.title}
          lead={bentoCopy.lead}
        />
        <div className={styles.bentoGrid}>
          {bentoCopy.cards.map((card, index) => (
            <article
              key={card.id}
              className={cn(styles.bentoCard, bentoToneClass[card.id])}
              data-new-landing-reveal
              data-reveal-direction="up"
              data-reveal-delay={(index * 0.06).toFixed(2)}
            >
              <div className={styles.bentoCardTop}>
                <p className={styles.bentoKicker}>{card.kicker}</p>
                <card.icon size={20} className={styles.bentoIcon} aria-hidden="true" />
              </div>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p className={styles.cardBody}>{card.body}</p>
              <BentoMiniVisual visual={card.visual} />
            </article>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

/* ---------------------------------- connected record flow ---------------------------------- */

function ConnectedRecordSection() {
  const [scopeNode, costsNode, ...spineNodes] = recordFlowCopy.nodes;

  return (
    <section
      id="workflow"
      className={styles.section}
      aria-labelledby="new-workflow-title"
      data-new-landing-section="workflow"
    >
      <LandingContainer className={styles.splitGrid}>
        <div className={styles.splitCopy} data-new-landing-reveal data-reveal-direction="up">
          <p className={styles.kicker}>{recordFlowCopy.kicker}</p>
          <h2 id="new-workflow-title" className={styles.sectionTitle}>
            {recordFlowCopy.title}
          </h2>
          <p className={styles.sectionLead}>{recordFlowCopy.lead}</p>
          <ul className={styles.flowBullets}>
            {recordFlowCopy.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
        <div
          className={styles.flowDiagram}
          data-new-landing-flow
          data-new-landing-reveal
          data-reveal-direction="up"
          data-reveal-delay="0.08"
        >
          <p className={styles.srOnly}>{recordFlowCopy.description}</p>
          <div className={styles.flowTrack} role="list">
            <div className={styles.flowInputs}>
              {[scopeNode, costsNode].map((node) => (
                <div
                  key={node.id}
                  role="listitem"
                  className={cn(styles.flowNode, flowToneClass[node.tone])}
                  data-flow-node
                >
                  {node.label}
                </div>
              ))}
            </div>
            <span className={styles.flowLink} aria-hidden="true" />
            {spineNodes.map((node, index) => (
              <div key={node.id} className={styles.flowSpineSegment}>
                <div
                  role="listitem"
                  className={cn(styles.flowNode, flowToneClass[node.tone])}
                  data-flow-node
                >
                  {node.label}
                </div>
                {index < spineNodes.length - 1 ? <span className={styles.flowLink} aria-hidden="true" /> : null}
              </div>
            ))}
          </div>
        </div>
      </LandingContainer>
    </section>
  );
}

/* ---------------------------------- activity story ---------------------------------- */

function ActivitySection() {
  return (
    <section className={styles.section} aria-labelledby="new-activity-title">
      <LandingContainer className={cn(styles.splitGrid, styles.splitGridActivity)}>
        <div className={styles.splitCopy} data-new-landing-reveal data-reveal-direction="up">
          <p className={styles.kicker}>{activityCopy.kicker}</p>
          <h2 id="new-activity-title" className={styles.sectionTitle}>
            {activityCopy.title}
          </h2>
          <p className={styles.sectionLead}>{activityCopy.lead}</p>
        </div>
        <div
          className={styles.activityPanel}
          data-new-landing-reveal
          data-reveal-direction="up"
          data-reveal-delay="0.08"
        >
          <p className={styles.activityLabel}>{activityCopy.panelLabel}</p>
          <ol className={styles.activityList}>
            {activityCopy.entries.map((entry, index) => (
              <li key={entry.id} className={styles.activityEntry} data-activity-entry data-activity-index={index}>
                <span className={styles.activityIcon}>
                  <entry.icon size={15} aria-hidden="true" />
                </span>
                <span className={styles.activityText}>
                  <span className={styles.activityTitle}>{entry.title}</span>
                  <span className={styles.activityMeta}>{entry.meta}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </LandingContainer>
    </section>
  );
}

/* ---------------------------------- principles ---------------------------------- */

function PrinciplesSection() {
  return (
    <section className={styles.section} aria-labelledby="new-principles-title">
      <LandingContainer>
        <SectionHeading id="new-principles-title" title={principlesCopy.title} align="center" />
        <div className={styles.principleGrid}>
          {principlesCopy.cards.map((card, index) => (
            <article
              key={card.id}
              className={styles.principleCard}
              data-new-landing-reveal
              data-reveal-direction="up"
              data-reveal-delay={(index * 0.06).toFixed(2)}
              data-new-landing-spotlight
            >
              <span className={styles.principleIcon}>
                <card.icon size={20} aria-hidden="true" />
              </span>
              <h3 className={styles.cardTitle}>{card.title}</h3>
              <p className={styles.cardBody}>{card.body}</p>
            </article>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

/* ---------------------------------- connection matrix ---------------------------------- */

function ConnectionMatrixSection() {
  return (
    <section
      id="connected-record"
      className={styles.section}
      aria-labelledby="new-connected-title"
      data-new-landing-section="connected-record"
    >
      <LandingContainer>
        <SectionHeading
          id="new-connected-title"
          kicker={connectionCopy.kicker}
          title={connectionCopy.title}
          lead={connectionCopy.lead}
        />
        <div className={styles.connectionGrid}>
          {connectionCopy.pairs.map((pair, index) => (
            <article
              key={pair.id}
              className={styles.connectionCard}
              data-new-landing-reveal
              data-reveal-direction="up"
              data-reveal-delay={(index * 0.05).toFixed(2)}
            >
              <p className={styles.connectionPair}>{pair.pair}</p>
              <span className={styles.connectionLine} aria-hidden="true" />
              <p className={styles.cardBody}>{pair.body}</p>
            </article>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

/* ---------------------------------- early access ---------------------------------- */

function EarlyAccessSection() {
  return (
    <section
      id="early-access"
      className={styles.section}
      aria-labelledby="new-early-access-title"
      data-new-landing-section="early-access"
    >
      <LandingContainer>
        <SectionHeading
          id="new-early-access-title"
          kicker={earlyAccessCopy.kicker}
          title={earlyAccessCopy.title}
          lead={earlyAccessCopy.lead}
        />
        <div className={styles.earlyAccessGrid}>
          <article
            className={cn(styles.earlyAccessCard, styles.earlyAccessAction)}
            data-new-landing-reveal
            data-reveal-direction="up"
          >
            <h3 className={styles.cardTitle}>{earlyAccessCopy.requestCard.title}</h3>
            <p className={styles.cardBody}>{earlyAccessCopy.requestCard.body}</p>
            <div className={styles.earlyAccessCtaRow}>
              <EarlyAccessCta location="early-access" />
            </div>
            <p className={styles.earlyAccessNote}>{earlyAccessCopy.requestCard.note}</p>
          </article>
          <article
            className={styles.earlyAccessCard}
            data-new-landing-reveal
            data-reveal-direction="up"
            data-reveal-delay="0.07"
          >
            <h3 className={styles.cardTitle}>{earlyAccessCopy.expectCard.title}</h3>
            <ul className={styles.expectList}>
              {earlyAccessCopy.expectCard.points.map((point) => (
                <li key={point}>
                  <CheckCircle size={17} weight="fill" className={styles.expectIcon} aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <p className={styles.earlyAccessNote}>{earlyAccessCopy.expectCard.note}</p>
          </article>
        </div>
      </LandingContainer>
    </section>
  );
}

/* ---------------------------------- FAQ ---------------------------------- */

function FaqSection() {
  return (
    <section
      id="faq"
      className={styles.section}
      aria-labelledby="new-faq-title"
      data-new-landing-section="faq"
    >
      <LandingContainer className={styles.faqContainer}>
        <SectionHeading id="new-faq-title" title={faqCopy.title} align="center" />
        <div className={styles.faqList} data-new-landing-reveal data-reveal-direction="up">
          {faqCopy.faqs.map((faq) => (
            <details key={faq.question} className={styles.faqItem}>
              <summary className={styles.faqSummary}>
                <span>{faq.question}</span>
                <CaretDown size={16} className={styles.faqChevron} aria-hidden="true" />
              </summary>
              <p className={styles.faqAnswer}>{faq.answer}</p>
            </details>
          ))}
        </div>
      </LandingContainer>
    </section>
  );
}

/* ---------------------------------- final CTA + dock ---------------------------------- */

function FinalCtaSection() {
  return (
    <section className={styles.finalCta} aria-labelledby="new-final-cta-title">
      <div className={styles.heroAurora} aria-hidden="true">
        <span className={styles.auroraField} data-field="one" />
        <span className={styles.auroraField} data-field="two" />
      </div>
      <LandingContainer className={styles.finalCtaInner}>
        <h2 id="new-final-cta-title" className={styles.finalCtaTitle} data-new-landing-reveal data-reveal-direction="up">
          {finalCtaCopy.title}
        </h2>
        <p
          className={styles.finalCtaBody}
          data-new-landing-reveal
          data-reveal-direction="up"
          data-reveal-delay="0.06"
        >
          {finalCtaCopy.body}
        </p>
        <div
          className={styles.finalCtaRow}
          data-new-landing-reveal
          data-reveal-direction="up"
          data-reveal-delay="0.12"
        >
          <EarlyAccessCta location="final-cta" />
        </div>
        <ul
          className={styles.dock}
          aria-label={finalCtaCopy.dockLabel}
          data-new-landing-reveal
          data-reveal-direction="up"
          data-reveal-delay="0.18"
        >
          {finalCtaCopy.dock.map((item) => (
            <li key={item.id} className={styles.dockItem}>
              <span className={styles.dockIcon}>
                <item.icon size={19} aria-hidden="true" />
              </span>
              <span className={styles.dockLabel}>{item.label}</span>
            </li>
          ))}
        </ul>
      </LandingContainer>
    </section>
  );
}

/* ---------------------------------- footer ---------------------------------- */

function NewLandingFooter() {
  return (
    <footer className={styles.footer}>
      <LandingContainer className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Link href="/" className={styles.brandLink} aria-label="Archestimator home">
            <ArchestimatorLogo markSize={24} />
          </Link>
          <p className={styles.footerBoilerplate}>{footerCopy.boilerplate}</p>
        </div>
        <nav className={styles.footerNav} aria-label="Footer">
          {footerCopy.links.map((link) => (
            <a key={link.href} href={link.href} className={styles.footerLink}>
              {link.label}
            </a>
          ))}
          <AuthUtilityLink className={styles.footerLink} workspaceLabel={footerCopy.workspaceLabel} />
        </nav>
        <p className={styles.footerCopyright}>© {new Date().getFullYear()} Archestimator.</p>
      </LandingContainer>
    </footer>
  );
}
