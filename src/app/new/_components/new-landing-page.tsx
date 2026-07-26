import Link from "next/link";
import { Jersey_25 } from "next/font/google";
import { preload } from "react-dom";

import { ArchestimatorLogo } from "@/components/brand/ArchestimatorLogo";
import { cn } from "@/lib/ui/cn";

import LandingPageHeroMobileAvif from "../../../../public/landing-hero-day-1280.avif";
import LandingPageHeroAvif from "../../../../public/landing-hero-day-2400.avif";
import { headerCopy } from "../../kimi3d/_content";
import { PrimaryCtaLink } from "../../kimi3d/_components/cta-link";
import { HeroVoxelRippleImage } from "../../kimi3d/_components/hero-voxel-ripple-image";
import { KimiSiteHeader } from "../../kimi3d/_components/kimi-site-header";
import { LandingMotionLoader } from "../../kimi3d/_components/landing-motion-loader";
import lockedStyles from "../../kimi3d/kimi-landing.module.css";
import { newLandingCopy } from "../_content";
import experimentStyles from "../new-landing.module.css";
import { NewExperimentCta } from "./new-experiment-cta";

const jersey25 = Jersey_25({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-jersey-25",
  weight: "400",
});

const heroPreloads = [
  { media: "(max-width: 640px)", src: LandingPageHeroMobileAvif.src },
  { media: "(min-width: 641px)", src: LandingPageHeroAvif.src },
] as const;

function preloadHeroImages() {
  for (const image of heroPreloads) {
    preload(image.src, {
      as: "image",
      fetchPriority: "high",
      media: image.media,
      type: "image/avif",
    });
  }
}

function ExperimentSectionIntro({
  eyebrow,
  headline,
  intro,
  titleId,
}: {
  eyebrow: string;
  headline: string;
  intro: string;
  titleId: string;
}) {
  return (
    <div className={experimentStyles.sectionIntroGrid}>
      <p className={experimentStyles.eyebrow}>{eyebrow}</p>
      <div>
        <h2 id={titleId} className={experimentStyles.sectionHeadline}>
          {headline}
        </h2>
        <p className={experimentStyles.sectionIntro} data-new-section-intro>
          {intro}
        </p>
      </div>
    </div>
  );
}

export function NewLandingPage() {
  preloadHeroImages();

  return (
    <div
      className={cn(
        lockedStyles.root,
        experimentStyles.experimentRoot,
        jersey25.variable,
      )}
      data-kimi-landing
    >
      <a href="#main" className={lockedStyles.skipLink}>
        {headerCopy.skipLink}
      </a>
      <KimiSiteHeader />
      <span
        className={lockedStyles.headerSentinel}
        data-header-sentinel
        aria-hidden="true"
      />

      <main id="main">
        <section
          id="product"
          className={experimentStyles.hero}
          aria-labelledby="hero-title"
          data-new-experiment-hero
        >
          <div className={cn(lockedStyles.container, experimentStyles.heroGrid)}>
            <div className={experimentStyles.heroMessage}>
              <p className={experimentStyles.heroEyebrow}>
                {newLandingCopy.hero.eyebrow}
              </p>
              <h1
                id="hero-title"
                className={cn(experimentStyles.heroHeadline, jersey25.className)}
                aria-label={newLandingCopy.hero.headline.join(" ")}
              >
                {newLandingCopy.hero.headline.map((line) => (
                  <span key={line} aria-hidden="true">
                    {line}{" "}
                  </span>
                ))}
              </h1>
              <p className={experimentStyles.heroOneLiner}>
                {newLandingCopy.hero.oneLiner}
              </p>
              <div className={experimentStyles.heroActions}>
                <PrimaryCtaLink className={experimentStyles.heroPrimaryCta} />
                <a href="#workflow" className={experimentStyles.heroSecondaryCta}>
                  {newLandingCopy.hero.secondaryCtaLabel}
                </a>
              </div>
            </div>
            <div
              className={experimentStyles.heroVisual}
              data-new-hero-image
              data-hero-reveal="visual"
            >
              <HeroVoxelRippleImage />
            </div>
            <p className={experimentStyles.heroAudience}>
              {newLandingCopy.hero.audience}
            </p>
          </div>
        </section>

        <div className={experimentStyles.body} data-new-experiment-body>
          <section
            className={cn(experimentStyles.chapter, experimentStyles.circumstance)}
            aria-labelledby="new-circumstance-title"
            data-new-major-chapter
            data-core-copy
          >
            <div className={cn(experimentStyles.shell, experimentStyles.circumstanceGrid)}>
              <div>
                <p className={experimentStyles.eyebrowOnDark}>
                  {newLandingCopy.circumstance.eyebrow}
                </p>
                <h2 id="new-circumstance-title" className={experimentStyles.sectionHeadlineOnDark}>
                  {newLandingCopy.circumstance.headline}
                </h2>
              </div>
              <div className={experimentStyles.circumstanceCopy}>
                <p className={experimentStyles.largeBodyOnDark}>
                  <span data-new-section-intro>
                  {newLandingCopy.circumstance.intro}
                  </span>
                </p>
                <p>{newLandingCopy.circumstance.connection}</p>
                <p>{newLandingCopy.circumstance.audience}</p>
                <p className={experimentStyles.circumstanceSummary}>
                  {newLandingCopy.circumstance.summary}
                </p>
              </div>
            </div>
          </section>

          <section
            id="workflow"
            className={cn(experimentStyles.chapter, experimentStyles.workflow)}
            aria-labelledby="new-workflow-title"
            data-new-major-chapter
            data-core-copy
          >
            <div className={experimentStyles.shell}>
              <ExperimentSectionIntro
                eyebrow={newLandingCopy.workflow.eyebrow}
                headline={newLandingCopy.workflow.headline}
                intro={newLandingCopy.workflow.intro}
                titleId="new-workflow-title"
              />
              <ol className={experimentStyles.stageList}>
                {newLandingCopy.workflow.stages.map((stage) => (
                  <li key={stage.label} className={experimentStyles.stage}>
                    <span className={experimentStyles.stageNumber}>{stage.number}</span>
                    <div className={experimentStyles.stageTitle}>
                      <span>{stage.label}</span>
                      <h3>{stage.heading}</h3>
                    </div>
                    <div className={experimentStyles.stageCopy}>
                      <p>{stage.copy}</p>
                      <ul aria-label={`${stage.label} product proof`}>
                        {stage.terms.map((term) => (
                          <li key={term}>{term}</li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section
            id="proof"
            className={cn(experimentStyles.chapter, experimentStyles.proof)}
            aria-labelledby="new-proof-title"
            data-new-major-chapter
            data-core-copy
          >
            <div className={experimentStyles.shell}>
              <ExperimentSectionIntro
                eyebrow={newLandingCopy.proof.eyebrow}
                headline={newLandingCopy.proof.headline}
                intro={newLandingCopy.proof.intro}
                titleId="new-proof-title"
              />
              <div className={experimentStyles.proofGrid}>
                {newLandingCopy.proof.modules.map((module, index) => (
                  <article key={module.label} className={experimentStyles.proofModule}>
                    <div className={experimentStyles.proofModuleHeader}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <p>{module.label}</p>
                    </div>
                    <h3>{module.heading}</h3>
                    <p className={experimentStyles.proofCopy}>{module.copy}</p>
                    <ul aria-label={`${module.label} capabilities`}>
                      {module.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
              <p className={experimentStyles.proofBoundary}>
                {newLandingCopy.proof.boundary}
              </p>
            </div>
          </section>

          <section
            className={cn(experimentStyles.chapter, experimentStyles.questions)}
            aria-labelledby="new-questions-title"
            data-new-major-chapter
            data-core-copy
          >
            <div className={experimentStyles.shell}>
              <ExperimentSectionIntro
                eyebrow={newLandingCopy.objections.eyebrow}
                headline={newLandingCopy.objections.headline}
                intro={newLandingCopy.objections.intro}
                titleId="new-questions-title"
              />
              <div className={experimentStyles.objectionList}>
                {newLandingCopy.objections.items.map((item, index) => (
                  <details key={item.heading} className={experimentStyles.objection} data-new-objection>
                    <summary>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{item.heading}</strong>
                      <i aria-hidden="true" />
                    </summary>
                    <p>{item.copy}</p>
                  </details>
                ))}
              </div>
              <div className={experimentStyles.closing}>
                <div>
                  <p className={experimentStyles.closingEyebrow}>
                    {newLandingCopy.closing.eyebrow}
                  </p>
                  <h2>{newLandingCopy.closing.headline}</h2>
                </div>
                <div className={experimentStyles.closingAction}>
                  <p>{newLandingCopy.closing.copy}</p>
                  <NewExperimentCta />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className={experimentStyles.footer}>
        <div className={cn(experimentStyles.shell, experimentStyles.footerGrid)}>
          <div>
            <ArchestimatorLogo
              markSize={28}
              className={experimentStyles.footerLogo}
              wordmarkClassName={experimentStyles.footerWordmark}
              separatorClassName={experimentStyles.footerSeparator}
            />
            <p>{newLandingCopy.footer.statement}</p>
          </div>
          <nav aria-label="Experiment footer">
            <Link href="/">Control page</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
          <div className={experimentStyles.footerContact}>
            <span>{newLandingCopy.footer.contactLabel}</span>
            <a href={`mailto:${newLandingCopy.footer.contact}`}>
              {newLandingCopy.footer.contact}
            </a>
          </div>
        </div>
      </footer>
      <LandingMotionLoader />
    </div>
  );
}
