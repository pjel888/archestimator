import { demoProject } from "../fixtures";
import { ProductPlayback } from "../interactions/ProductPlayback.client";
import tokenStyles from "../tokens.module.css";
import styles from "./ConnectedContext.module.css";

function MiniPanel({ label, title, body }: { label: string; title: string; body: string }) {
  return <div className={styles.miniPanel} aria-hidden="true"><span>{label}</span><strong>{title}</strong><p>{body}</p></div>;
}

const intelligenceItems = [
  { id: "intelligence-search", label: "Search", summary: "Search remains explicit and limited to user-owned reusable sources.", content: <MiniPanel key="intelligence-search" label="Source search" title={demoProject.reusable.query} body="Studio component library · matching components and project sources" /> },
  { id: "intelligence-preview", label: "Preview", summary: "Preview provenance and content before choosing a source.", content: <MiniPanel key="intelligence-preview" label="Preview" title={demoProject.reusable.selection} body={`${demoProject.reusable.sourceVersion} · quantities, notes, and source identity visible`} /> },
  { id: "intelligence-insert", label: "Insert", summary: "Insertion is a deliberate user action, never automatic reuse.", content: <MiniPanel key="intelligence-insert" label="Selection" title={demoProject.reusable.action} body="The estimator chooses the destination and confirms the insertion." /> },
  { id: "intelligence-result", label: "Result", summary: "The inserted result becomes ordinary structured estimate content.", content: <MiniPanel key="intelligence-result" label="Structured result" title={demoProject.estimate.rows[1].label} body={`${demoProject.estimate.rows[1].quantity} ${demoProject.estimate.rows[1].unit} · ${demoProject.estimate.rows[1].total}`} /> },
] as const;

const signalItems = [
  { id: "signal-estimate", label: "Estimate context", summary: "The discussion target retains its estimate and source identity.", content: <MiniPanel key="signal-estimate" label={demoProject.estimate.version} title={demoProject.review.target} body={`${demoProject.reusable.sourceVersion} · ${demoProject.estimate.rows[1].total}`} /> },
  { id: "signal-review", label: "Review signal", summary: "A targeted discussion is visible without implying automated analysis.", content: <MiniPanel key="signal-review" label={demoProject.review.state} title={demoProject.review.comment} body={`${demoProject.review.author} · ${demoProject.output.version}`} /> },
  { id: "signal-decision", label: "Decision state", summary: "The recorded receipt reflects a user decision against the issued proposal.", content: <MiniPanel key="signal-decision" label={demoProject.decision.receipt} title={demoProject.decision.state} body={`${demoProject.decision.recordedAt} · ${demoProject.decision.nextStep}`} /> },
] as const;

export function ConnectedContext() {
  return (
    <>
      <section className={styles.intelligence} data-band="07" aria-labelledby="intelligence-title">
        <div className={`${tokenStyles.frame} ${styles.introGrid}`}><div><p>Reusable intelligence</p><h2 id="intelligence-title">Reuse proven work without losing where it came from.</h2></div><p>Search, preview, and choose from user-owned sources before inserting anything into the estimate you are building.</p></div>
        <div className={`${tokenStyles.frame} ${styles.playbackWrap}`}><ProductPlayback label="Reusable knowledge sequence" items={intelligenceItems} interval={3200} /></div>
      </section>
      <section id="context" className={`${styles.darkAct} ${tokenStyles.gridLines}`} data-band="08" aria-labelledby="context-title">
        <div className={`${tokenStyles.frame} ${styles.darkInner}`}>
          <p className={styles.darkLabel}>Connected context · conceptual system diagram</p>
          <h2 id="context-title">One cost record, carried forward.</h2>
          <p className={styles.darkLead}>The working estimate remains recognizable as it becomes an output, a review surface, and a decision record—without pretending every step updates itself.</p>
          <ol className={styles.contextFlow} aria-label="Conceptual connected cost record"><li><span>01</span><strong>Estimate</strong><small>Traceable source</small></li><li><span>02</span><strong>Proposal / Excel</strong><small>Issued version</small></li><li><span>03</span><strong>Review</strong><small>Targeted feedback</small></li><li><span>04</span><strong>Decision / revision context</strong><small>Recorded decision and preserved activity</small></li></ol>
        </div>
      </section>
      <section className={styles.signalSection} data-band="09" aria-labelledby="signals-title">
        <div className={`${tokenStyles.frame} ${styles.splitIntro}`}><div><p>Decision signals</p><h2 id="signals-title">See what changed, who responded, and what happens next.</h2></div><p>Source identity, targeted discussion, and the issue decision are visible states—not predictions or automatic estimate changes.</p></div>
        <div className={`${tokenStyles.frame} ${styles.playbackWrap}`}><ProductPlayback label="Decision signals" items={signalItems} interval={2600} /></div>
      </section>
      <section className={styles.handoffs} data-band="10" aria-labelledby="handoffs-title">
        <div className={`${tokenStyles.frame} ${styles.sectionHeader}`}><p>Deliverables</p><h2 id="handoffs-title">Change the format, not the cost story.</h2></div>
        <div className={`${tokenStyles.frame} ${styles.handoffGrid}`}>
          <article><header><span>Editable Excel output</span><strong>{demoProject.output.excel}</strong></header><div className={styles.sheet} aria-hidden="true"><span>{demoProject.name}</span>{demoProject.estimate.rows.map((row) => <p key={row.id}><b>{row.label}</b><em>{row.total}</em></p>)}</div><p>Download an editable .xlsx workbook derived from the proposal output.</p></article>
          <article><header><span>Client portal review</span><strong>{demoProject.output.proposal} · {demoProject.output.version}</strong></header><div className={styles.reviewCard} aria-hidden="true"><span>{demoProject.review.target}</span><p>{demoProject.review.comment}</p><b>{demoProject.decision.state}</b></div><p>Review issued context, hold a targeted discussion, and record a decision.</p></article>
        </div>
      </section>
      <section className={styles.control} data-band="11" aria-labelledby="control-title">
        <div className={`${tokenStyles.frame} ${styles.controlGrid}`}><div><p>Traceability</p><h2 id="control-title">Trace every handoff back to its source.</h2><div className={styles.controlLead}>Identifiers, versions, targets, actors, and decisions make the record understandable without presenting a public developer platform.</div></div><dl className={styles.inspector}><div><dt>Row source</dt><dd>{demoProject.reusable.source}</dd></div><div><dt>Source version</dt><dd>{demoProject.reusable.sourceVersion}</dd></div><div><dt>Issued issue</dt><dd>{demoProject.output.proposal} · {demoProject.output.version}</dd></div><div><dt>Discussion target</dt><dd>{demoProject.review.target}</dd></div><div><dt>Actor / time</dt><dd>{demoProject.review.author} · {demoProject.decision.recordedAt}</dd></div><div><dt>Decision receipt</dt><dd>{demoProject.decision.receipt} · {demoProject.decision.state}</dd></div></dl></div>
      </section>
    </>
  );
}
