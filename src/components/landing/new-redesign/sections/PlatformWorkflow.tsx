import { capabilities, workflowChapters } from "../content";
import { demoProject } from "../fixtures";
import { WorkflowRail } from "../interactions/WorkflowRail.client";
import tokenStyles from "../tokens.module.css";
import styles from "./PlatformWorkflow.module.css";

function WorkflowProof({ index }: { index: number }) {
  if (index === 0) return <div className={styles.proofGrid} aria-hidden="true"><div className={styles.proofPanel}><span>Area / row</span>{demoProject.estimate.rows.map((row) => <p key={row.id}><strong>{row.label}</strong><em>{row.quantity} {row.unit}</em></p>)}</div><div className={styles.proofPanel}><span>Deterministic total</span><strong className={styles.bigValue}>{demoProject.estimate.total}</strong><small>Quantity × rate, rolled into the estimate hierarchy</small></div></div>;
  if (index === 1) return <div className={styles.proofGrid} aria-hidden="true"><div className={styles.proofPanel}><span>Source search</span><strong>{demoProject.reusable.query}</strong><p>{demoProject.reusable.selection}</p></div><div className={styles.proofPanel}><span>Provenance</span><strong>{demoProject.reusable.source}</strong><p>{demoProject.reusable.sourceVersion}</p><small>Previewed before insertion</small></div></div>;
  if (index === 2) return <div className={styles.proofGrid} aria-hidden="true"><div className={`${styles.proofPanel} ${styles.proposal}`}><span>{demoProject.output.proposal}</span><h4>{demoProject.name}</h4><strong>{demoProject.estimate.total}</strong></div><div className={styles.proofPanel}><span>Editable output</span><strong>{demoProject.output.excel}</strong><p>Proposal preview and .xlsx download</p></div></div>;
  if (index === 3) return <div className={styles.proofGrid} aria-hidden="true"><div className={styles.proofPanel}><span>{demoProject.output.version}</span><strong>{demoProject.review.target}</strong><p>{demoProject.review.comment}</p></div><div className={styles.proofPanel}><span>Discussion</span><strong>{demoProject.review.state}</strong><p>Feedback remains attached to issued context.</p></div></div>;
  return <div className={styles.proofGrid} aria-hidden="true"><div className={styles.proofPanel}><span>Recorded decision</span><strong>{demoProject.decision.state}</strong><p>{demoProject.decision.receipt} · {demoProject.decision.recordedAt}</p></div><div className={styles.proofPanel}><span>User-controlled next step</span><strong>Review before revising</strong><p>Context informs the next edit; it does not make the edit.</p></div></div>;
}

export function PlatformWorkflow() {
  return (
    <>
      <section className={styles.capabilities} data-band="04" aria-labelledby="capability-title">
        <div className={tokenStyles.frame}><h2 id="capability-title" className={styles.visuallyHidden}>Current product capabilities</h2><div className={styles.capabilityGrid}>{capabilities.map((capability) => <div key={capability}>{capability}</div>)}</div></div>
      </section>
      <section id="workflow" className={styles.thesis} data-band="05" aria-labelledby="platform-title">
        <div className={`${tokenStyles.frame} ${styles.thesisGrid}`}><p>Platform</p><div><h2 id="platform-title">The working estimate should stay connected to every decision it creates.</h2><p>Archestimator keeps the estimate, output, review, and decision context from becoming detached records across separate files and threads.</p></div></div>
      </section>
      <section className={styles.workflow} data-band="06" aria-label="Connected estimating workflow">
        <div className={tokenStyles.frame}>
          <div className={styles.workflowGrid}>
            <WorkflowRail chapters={workflowChapters} />
            <div className={styles.chapters}>{workflowChapters.map((chapter, index) => <article id={chapter.id} key={chapter.id} className={styles.chapter}><header><p>{chapter.number} / {chapter.label}</p><h3>{chapter.title}</h3><div>{chapter.body}</div></header><WorkflowProof index={index} /></article>)}</div>
          </div>
        </div>
      </section>
    </>
  );
}
