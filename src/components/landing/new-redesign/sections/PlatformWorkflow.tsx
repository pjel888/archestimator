import { capabilities, workflowChapters } from "../content";
import { demoProject } from "../fixtures";
import { WorkflowRail } from "../interactions/WorkflowRail.client";
import tokenStyles from "../tokens.module.css";
import styles from "./PlatformWorkflow.module.css";

const chapterEvidence = [
  [["Structure", "Areas, rows, quantities, units, rates, and totals"], ["Result", demoProject.estimate.total]],
  [["Source", demoProject.reusable.sourceVersion], ["Control", "Previewed and inserted by the estimator"]],
  [["Issued output", `${demoProject.output.proposal} · ${demoProject.output.version}`], ["Editable output", demoProject.output.excel]],
  [["Discussion target", demoProject.review.target], ["Review state", demoProject.review.state]],
  [["Decision receipt", `${demoProject.decision.receipt} · ${demoProject.decision.state}`], ["Next step", "Estimator reviews the context before revising"]],
] as const;

function WorkflowEvidence({ index }: { index: number }) {
  return <dl className={styles.chapterEvidence}>{(chapterEvidence[index] ?? []).map(([term, detail]) => <div key={term}><dt>{term}</dt><dd>{detail}</dd></div>)}</dl>;
}

export function PlatformWorkflow() {
  return (
    <>
      <section className={styles.capabilities} data-band="04" aria-labelledby="capability-title">
        <div className={tokenStyles.frame}><h2 id="capability-title" className={styles.visuallyHidden}>Current product capabilities</h2><div className={styles.capabilityGrid}>{capabilities.map((capability) => <div key={capability}>{capability}</div>)}</div></div>
      </section>
      <section id="workflow" className={styles.thesis} data-band="05" aria-labelledby="platform-title">
        <div className={`${tokenStyles.frame} ${styles.thesisGrid}`}><p>Estimate lifecycle</p><div><h2 id="platform-title">One estimate. Every handoff.</h2><p>Carry the same cost story from working estimate to proposal, review, and the next revision—instead of reconstructing it across files and threads.</p></div></div>
      </section>
      <section className={styles.workflow} data-band="06" aria-label="Connected estimating workflow">
        <div className={tokenStyles.frame}>
          <div className={styles.workflowGrid}>
            <WorkflowRail chapters={workflowChapters} />
            <div className={styles.chapters}>{workflowChapters.map((chapter, index) => <article id={chapter.id} key={chapter.id} className={styles.chapter}><header><p>{chapter.number} / {chapter.label}</p><h3>{chapter.title}</h3><div>{chapter.body}</div></header><WorkflowEvidence index={index} /></article>)}</div>
          </div>
        </div>
      </section>
    </>
  );
}
