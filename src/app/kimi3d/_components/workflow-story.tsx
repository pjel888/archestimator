import { workflowCopy } from "../_content";
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
          <h2 id="workflow-title" className={styles.storyTitle}>
            {workflowCopy.headline}
          </h2>
          <p className={styles.storyIntro}>
            {workflowCopy.intro}
          </p>
        </header>
        <ol className={styles.stageRunway} data-stage-runway>
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
    </section>
  );
}
