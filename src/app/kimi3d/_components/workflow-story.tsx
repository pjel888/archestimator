import { cn } from "@/lib/ui/cn";

import { workflowCopy } from "../_content";
import { WorkflowMotion } from "./workflow-motion";
import { WorkflowSceneLoader } from "./workflow-scene-loader";
import styles from "../kimi-landing.module.css";

/**
 * Server-rendered workflow runway: heading, semantic four-stage list, the
 * static wave-field fallback. Every stage moves through normal document flow.
 * GSAP and Three.js only enhance progress behind it.
 */

export function WorkflowStory() {
  return (
    <section
      id="workflow"
      className={styles.story}
      aria-labelledby="workflow-title"
    >
      <div className={styles.container}>
        <header className={styles.storyHead} data-section-reveal>
          <h2
            id="workflow-title"
            className={cn(styles.sectionTitle, styles.storyTitle)}
          >
            {workflowCopy.headline}
          </h2>
          <p className={cn(styles.sectionLead, styles.storyIntro)}>
            {workflowCopy.intro}
          </p>
        </header>
        <WorkflowMotion>
          <div className={styles.storyTrack} data-story-track>
            <div className={styles.storyBackdrop} aria-hidden="true">
              <StoryFallbackGrid />
              <WorkflowSceneLoader />
            </div>
            <ol className={styles.stageRunway}>
              {workflowCopy.stages.map((stage, index) => (
                <li
                  key={stage.id}
                  className={styles.stageItem}
                  data-stage-item
                  data-stage-index={index}
                >
                  <div className={styles.stageItemHead}>
                    <span className={styles.stageIndex}>{stage.index}</span>
                    <h3 className={styles.stageName}>{stage.title}</h3>
                  </div>
                  <p className={styles.stageBody}>{stage.body}</p>
                  <span className={styles.stageHandoff}>{stage.handoff}</span>
                </li>
              ))}
            </ol>
          </div>
        </WorkflowMotion>
      </div>
    </section>
  );
}

/**
 * Static SVG fallback for the scroll-responsive wave field. It is decorative
 * and remains available on mobile, reduced-motion, no-WebGL, and failure
 * branches while the semantic stage list carries the full workflow.
 */
function StoryFallbackGrid() {
  return (
    <svg
      className={styles.storySvg}
      viewBox="0 0 1200 620"
      preserveAspectRatio="none"
      data-story-svg
      aria-hidden="true"
    >
      <g className={styles.storyGridLines}>
        <path d="M0 130 C210 76 390 202 600 138 C810 74 990 192 1200 126" />
        <path d="M0 205 C210 151 390 277 600 213 C810 149 990 267 1200 201" />
        <path d="M0 280 C210 226 390 352 600 288 C810 224 990 342 1200 276" />
        <path d="M0 355 C210 301 390 427 600 363 C810 299 990 417 1200 351" />
        <path d="M0 430 C210 376 390 502 600 438 C810 374 990 492 1200 426" />
        <path d="M0 505 C210 451 390 577 600 513 C810 449 990 567 1200 501" />
        <path d="M110 0 C70 175 170 390 115 620" />
        <path d="M300 0 C260 175 360 390 305 620" />
        <path d="M490 0 C450 175 550 390 495 620" />
        <path d="M680 0 C640 175 740 390 685 620" />
        <path d="M870 0 C830 175 930 390 875 620" />
        <path d="M1060 0 C1020 175 1120 390 1065 620" />
      </g>
      <path
        className={styles.storyPathGhost}
        d="M36 450 C260 380 370 202 596 300 C804 390 930 224 1164 170"
      />
      <path
        className={styles.storyPathProgress}
        d="M36 450 C260 380 370 202 596 300 C804 390 930 224 1164 170"
        pathLength={1}
        data-story-progress
      />
    </svg>
  );
}
