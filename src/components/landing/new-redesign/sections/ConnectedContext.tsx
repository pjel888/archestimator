import { ClientPortalFinancialSection } from "@/components/client-portal/ClientPortalFinancialSection";
import { demoProject } from "../fixtures";
import { CostThreadScene } from "../interactions/CostThreadScene.client";
import tokenStyles from "../tokens.module.css";
import styles from "./ConnectedContext.module.css";

const reuseSteps = [
  ["Search", demoProject.reusable.query, "Find a component, template, or project source."],
  ["Preview", demoProject.reusable.selection, `Read ${demoProject.reusable.sourceVersion} before choosing it.`],
  ["Insert", "Choose the destination", "Reuse remains an explicit estimator action."],
  ["Continue", demoProject.estimate.version, "The result becomes ordinary structured estimate content."],
] as const;

const financialPayload = {
  schemaVersion: 1,
  currencyCode: demoProject.estimate.currency,
  totalCost: demoProject.estimate.totalValue,
  buckets: demoProject.estimate.rows.map((row) => ({ id: row.id, label: row.label, totalCost: row.totalValue })),
};

export function ConnectedContext() {
  return (
    <>
      <section className={styles.intelligence} data-band="07" aria-labelledby="intelligence-title">
        <div className={`${tokenStyles.frame} ${styles.introGrid}`}>
          <div><p>Reusable knowledge</p><h2 id="intelligence-title">Bring proven work forward without losing its source.</h2></div>
          <p>Search, inspect, and deliberately reuse the work your team already trusts. Provenance stays visible before and after insertion.</p>
        </div>
        <ol className={`${tokenStyles.frame} ${styles.reuseSequence}`}>
          {reuseSteps.map(([step, title, detail], index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><small>{step}</small><strong>{title}</strong><p>{detail}</p></li>)}
        </ol>
      </section>

      <section id="context" className={styles.darkAct} data-band="08" aria-labelledby="context-title" data-cost-thread-section>
        <div className={styles.contextStage} aria-hidden="true">
          <svg viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid meet" className={styles.threadPoster}>
            <path d="M90 220 C 270 90, 430 320, 600 210 S 940 105, 1110 205" />
            {[120, 440, 760, 1080].map((x, index) => <rect key={x} x={x - 85} y={index % 2 === 0 ? 155 : 185} width="170" height="82" rx="3" />)}
          </svg>
          <CostThreadScene />
        </div>
        <div className={`${tokenStyles.frame} ${styles.darkInner}`}>
          <div className={styles.darkCopy}>
            <p>Connected cost record</p>
            <h2 id="context-title">One number, with the history that gives it meaning.</h2>
            <div>Scroll carries a single signal through the estimate, issued proposal, client response, and next revision. Nothing changes automatically.</div>
          </div>
          <ol className={styles.contextFlow} aria-label="Conceptual connected cost record">
            <li><span>01</span><strong>Estimate</strong><small>Source attached</small></li>
            <li><span>02</span><strong>Proposal / Excel</strong><small>Version issued</small></li>
            <li><span>03</span><strong>Client review</strong><small>Feedback targeted</small></li>
            <li><span>04</span><strong>Revision context</strong><small>Decision retained</small></li>
          </ol>
        </div>
      </section>

      <section className={styles.signalSection} data-band="09" aria-labelledby="signals-title">
        <div className={`${tokenStyles.frame} ${styles.splitIntro}`}>
          <div><p>Issued view</p><h2 id="signals-title">Give reviewers the number and the structure behind it.</h2></div>
          <p>The financial view below is the actual client-portal component, rendered with the same sanitized fixture as the estimate.</p>
        </div>
        <div className={`${tokenStyles.frame} ${styles.financialSurface}`}>
          <div className={styles.surfaceChrome}><span>{demoProject.output.proposal}</span><strong>{demoProject.output.version} · {demoProject.output.status}</strong></div>
          <ClientPortalFinancialSection kind="cost_breakdown" payload={financialPayload} />
        </div>
      </section>

      <section className={styles.handoffs} data-band="10" aria-labelledby="handoffs-title">
        <div className={`${tokenStyles.frame} ${styles.sectionHeader}`}><h2 id="handoffs-title">Change the format, not the cost story.</h2><p>Two deliberate outputs. One underlying estimate.</p></div>
        <div className={`${tokenStyles.frame} ${styles.handoffGrid}`}>
          <article><span>Editable workbook</span><strong>{demoProject.output.excel}</strong><dl><div><dt>Source</dt><dd>{demoProject.estimate.version}</dd></div><div><dt>Format</dt><dd>Editable .xlsx</dd></div><div><dt>State</dt><dd>Prepared by the estimator</dd></div></dl></article>
          <article><span>Issued client view</span><strong>{demoProject.output.proposal}</strong><dl><div><dt>Issue</dt><dd>{demoProject.output.version}</dd></div><div><dt>Discussion target</dt><dd>{demoProject.review.target}</dd></div><div><dt>Response</dt><dd>{demoProject.decision.state}</dd></div></dl></article>
        </div>
      </section>

      <section className={styles.control} data-band="11" aria-labelledby="control-title">
        <div className={`${tokenStyles.frame} ${styles.controlGrid}`}>
          <div><p>Traceability</p><h2 id="control-title">The reason stays close to the number.</h2><div className={styles.controlLead}>Identifiers, versions, targets, actors, and decisions make the record understandable without implying a public API or automatic rewrite.</div></div>
          <dl className={styles.inspector}><div><dt>Row source</dt><dd>{demoProject.reusable.source}</dd></div><div><dt>Source version</dt><dd>{demoProject.reusable.sourceVersion}</dd></div><div><dt>Issued issue</dt><dd>{demoProject.output.proposal} · {demoProject.output.version}</dd></div><div><dt>Discussion target</dt><dd>{demoProject.review.target}</dd></div><div><dt>Actor / time</dt><dd>{demoProject.review.author} · {demoProject.decision.recordedAt}</dd></div><div><dt>Decision receipt</dt><dd>{demoProject.decision.receipt} · {demoProject.decision.state}</dd></div></dl>
        </div>
      </section>
    </>
  );
}
