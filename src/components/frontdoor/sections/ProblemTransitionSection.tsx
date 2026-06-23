import { RevealOnScroll } from "@/components/frontdoor/utilities/RevealOnScroll";
import { SectionEyebrow } from "@/components/frontdoor/utilities/SectionEyebrow";
import styles from "../FrontdoorPage.module.css";

export function ProblemTransitionSection() {
  return (
    <section className={styles.problem} aria-labelledby="problem-title">
      <div className={styles.problemInner}>
        <div className={styles.problemCopy}>
          <RevealOnScroll>
            <SectionEyebrow label="What spreadsheets forget" />
          </RevealOnScroll>
          <RevealOnScroll as="h2" className={styles.problemH2Part1} delayMs={60} id="problem-title">
            Every spreadsheet forgets what the last project taught you.
          </RevealOnScroll>
          <RevealOnScroll as="h2" className={styles.problemH2Part2} delayMs={140}>
            The next estimate should start with memory.
          </RevealOnScroll>
          <RevealOnScroll as="p" className={styles.bodyText} delayMs={220}>
            Rates, suppliers, assumptions, revisions, and client decisions drift across rows,
            inboxes, and exported files. Archestimator keeps the logic connected.
          </RevealOnScroll>
        </div>
        <RevealOnScroll className={styles.problemVisual} delayMs={260}>
          <div className={styles.problemVisualInner}>
            <div className={styles.driftMap} aria-hidden="true">
              <span className={styles.driftRow} />
              <span className={styles.driftRow} />
              <span className={styles.driftRow} />
              <span className={styles.driftNode} />
              <span className={styles.driftNode} />
              <span className={styles.driftNode} />
              <span className={styles.driftLink} />
              <span className={styles.driftLink} />
              <span className={styles.driftLink} />
            </div>
            <p className={styles.problemVisualCopy}>
              Rows, rates, and decisions resolve into one reusable record.
            </p>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
