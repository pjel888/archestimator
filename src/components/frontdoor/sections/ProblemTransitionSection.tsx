import { RevealOnScroll } from "@/components/frontdoor/utilities/RevealOnScroll";
import { SectionEyebrow } from "@/components/frontdoor/utilities/SectionEyebrow";
import styles from "../FrontdoorPage.module.css";

export function ProblemTransitionSection() {
  return (
    <section className={styles.problem} aria-labelledby="problem-title">
      <div className={styles.problemInner}>
        <div className={styles.problemCopy}>
          <RevealOnScroll>
            <SectionEyebrow ordinal="03" label="THE PROBLEM" />
          </RevealOnScroll>
          <RevealOnScroll as="h2" className={styles.problemH2Part1} delayMs={60} id="problem-title">
            Cost intelligence is disconnected from your estimates.
          </RevealOnScroll>
          <RevealOnScroll as="h2" className={styles.problemH2Part2} delayMs={140}>
            Time to change that.
          </RevealOnScroll>
          <RevealOnScroll as="p" className={styles.bodyText} delayMs={220}>
            A spreadsheet resets every project. You copy last time&rsquo;s file, delete the rates,
            and rebuild. The logic behind the number is scattered across rows, tabs, emails, and
            memory.
          </RevealOnScroll>
        </div>
        <RevealOnScroll className={styles.problemVisual} delayMs={260}>
          <div className={styles.problemVisualInner}>
            <span>Spreadsheet rebuild loop &mdash; placeholder</span>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
