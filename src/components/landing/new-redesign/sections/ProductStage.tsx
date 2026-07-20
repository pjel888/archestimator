import { demoProject } from "../fixtures";
import { ProductPlayback } from "../interactions/ProductPlayback.client";
import tokenStyles from "../tokens.module.css";
import styles from "./ProductStage.module.css";

function EstimateScene() {
  return <div className={styles.productScene} aria-hidden="true"><div className={styles.windowBar}><span>{demoProject.name}</span><span>{demoProject.estimate.version}</span></div><div className={styles.estimateHeader}><span>Estimate</span><strong>{demoProject.estimate.total}</strong></div><div className={styles.table}><div className={styles.tableHead}><span>Scope</span><span>Qty</span><span>Rate</span><span>Total</span></div>{demoProject.estimate.rows.map((row) => <div className={styles.tableRow} key={row.id}><strong>{row.label}</strong><span data-label="Qty">{row.quantity} {row.unit}</span><span data-label="Rate">{row.rate}</span><span data-label="Total">{row.total}</span></div>)}</div></div>;
}

function ReuseScene() {
  return <div className={styles.productScene} aria-hidden="true"><div className={styles.windowBar}><span>Reusable sources</span><span>{demoProject.reusable.source}</span></div><div className={styles.reuseGrid}><div><label>Search</label><div className={styles.search}>{demoProject.reusable.query}</div><span className={styles.mockControl}>{demoProject.reusable.selection}</span></div><aside><span>Source</span><strong>{demoProject.reusable.sourceVersion}</strong><p>Preview quantities, notes, and provenance before choosing what to insert.</p><b>{demoProject.reusable.action}</b></aside></div></div>;
}

function OutputScene() {
  return <div className={styles.productScene} aria-hidden="true"><div className={styles.windowBar}><span>{demoProject.output.proposal}</span><span>{demoProject.output.version}</span></div><div className={styles.outputGrid}><div className={styles.paper}><span>Project proposal</span><h3>{demoProject.name}</h3><hr /><p>Structured scope and cost summary</p><strong>{demoProject.estimate.total}</strong></div><aside><span>{demoProject.output.status}</span><strong>{demoProject.output.excel}</strong><span className={styles.mockControl}>Download editable Excel</span></aside></div></div>;
}

function ReviewScene() {
  return <div className={styles.productScene} aria-hidden="true"><div className={styles.windowBar}><span>Client review</span><span>{demoProject.output.version}</span></div><div className={styles.reviewGrid}><div><span>Target</span><strong>{demoProject.review.target}</strong><p>{demoProject.review.comment}</p><small>{demoProject.review.author} · {demoProject.review.state}</small></div><aside><span>Decision</span><strong>{demoProject.decision.state}</strong><p>{demoProject.decision.nextStep}</p><small>{demoProject.decision.receipt}</small></aside></div></div>;
}

export function ProductStage() {
  const items = [
    { id: "stage-estimate", label: "Estimate", summary: "Hierarchy, quantities, rates, and totals remain explicit and deterministic.", content: <EstimateScene key="stage-estimate" /> },
    { id: "stage-reuse", label: "Reusable knowledge", summary: "A user searches, previews, selects, and explicitly inserts a reusable source.", content: <ReuseScene key="stage-reuse" /> },
    { id: "stage-output", label: "Proposal output", summary: "The estimate becomes a proposal preview and an editable Excel download.", content: <OutputScene key="stage-output" /> },
    { id: "stage-review", label: "Client review", summary: "Targeted feedback and a recorded decision stay tied to an issued version; no automatic estimate change occurs.", content: <ReviewScene key="stage-review" /> },
  ] as const;
  return <div id="product" className={`${tokenStyles.frame} ${styles.atmosphere}`}><div className={styles.stageWindow}><ProductPlayback label="Product workflow" items={items} interval={3200} /></div></div>;
}
