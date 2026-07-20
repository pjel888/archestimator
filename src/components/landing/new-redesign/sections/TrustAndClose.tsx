import Link from "next/link";
import { currentProduct, faqs, pageContract, proofPrinciples } from "../content";
import { demoProject } from "../fixtures";
import { ProductPlayback } from "../interactions/ProductPlayback.client";
import tokenStyles from "../tokens.module.css";
import styles from "./TrustAndClose.module.css";

const storyItems = [
  { id: "story-estimate", label: "Estimate", summary: "Illustrative data: a structured estimate with explicit totals.", content: <div key="story-estimate" className={styles.storyScene} aria-hidden="true"><span>{demoProject.estimate.version}</span><h3>{demoProject.name}</h3><strong>{demoProject.estimate.total}</strong><p>{demoProject.estimate.rows.length} structured scope rows</p></div> },
  { id: "story-reuse", label: "Reuse", summary: "Illustrative data: the estimator deliberately selects a reusable component.", content: <div key="story-reuse" className={styles.storyScene} aria-hidden="true"><span>{demoProject.reusable.source}</span><h3>{demoProject.reusable.selection}</h3><strong>{demoProject.reusable.sourceVersion}</strong><p>{demoProject.reusable.action}</p></div> },
  { id: "story-review", label: "Review", summary: "Illustrative data: a review comment targets an issued proposal row.", content: <div key="story-review" className={styles.storyScene} aria-hidden="true"><span>{demoProject.output.proposal} · {demoProject.output.version}</span><h3>{demoProject.review.target}</h3><strong>{demoProject.review.state}</strong><p>{demoProject.review.comment}</p></div> },
  { id: "story-decision", label: "Decision", summary: "Illustrative data: a decision is recorded, then consulted before manual revision.", content: <div key="story-decision" className={styles.storyScene} aria-hidden="true"><span>{demoProject.decision.receipt}</span><h3>{demoProject.decision.state}</h3><strong>{demoProject.decision.recordedAt}</strong><p>{demoProject.decision.nextStep}</p></div> },
] as const;

export function TrustAndClose() {
  return (
    <>
      <section className={styles.founder} data-band="12" aria-labelledby="founder-title"><div className={tokenStyles.frame}><p>Founder perspective</p><blockquote id="founder-title">I built Archestimator from both sides of the AEC workflow: creating project and cost information, then designing the systems that keep it usable.</blockquote><cite>Philip Echavez Lewis · Founder</cite></div></section>
      <section id="trust" className={styles.proof} data-band="13" aria-labelledby="proof-title"><div className={`${tokenStyles.frame} ${styles.proofIntro}`}><p>Honest proof</p><h2 id="proof-title">Built around states you can inspect.</h2></div><div className={`${tokenStyles.frame} ${styles.proofGrid}`}>{proofPrinciples.map((item) => <article key={item.title}><span aria-hidden="true" /><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section>
      <section className={styles.story} data-band="14" aria-labelledby="story-title"><div className={`${tokenStyles.frame} ${styles.storyIntro}`}><div><p>Illustrative workflow</p><h2 id="story-title">Follow one cost decision from estimate to recorded response.</h2></div><p>The project, people, and values shown here are sanitized demonstration data, not a real project account.</p></div><div className={`${tokenStyles.frame} ${styles.storyPlayback}`}><ProductPlayback label="Illustrative workflow" items={storyItems} manualOnly /></div></section>
      <section className={styles.status} data-band="15" aria-labelledby="status-title"><div className={`${tokenStyles.frame} ${styles.statusHeader}`}><p>Current product</p><h2 id="status-title">What the product supports today.</h2></div><div className={`${tokenStyles.frame} ${styles.statusRail}`}>{currentProduct.map((item, index) => <article key={item.title}><span>{String(index + 1).padStart(2,"0")}</span><div className={styles.statusCrop} aria-hidden="true"><i /><i /><i /></div><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section>
      <section className={styles.briefing} data-band="16" aria-labelledby="briefing-title"><div className={`${tokenStyles.frame} ${styles.briefingGrid}`}><div><p>Early-access briefing</p><h2 id="briefing-title">Know what is ready before you start.</h2><div className={styles.briefingLead}>See who Archestimator is for, what early access includes, and how Excel stays in the workflow.</div><Link href={pageContract.cta.href}>{pageContract.cta.label} ↗</Link></div><div className={styles.faqs}>{faqs.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></div></section>
      <section className={`${styles.finalCta} ${tokenStyles.gridLines}`} data-band="17" aria-labelledby="final-title"><div className={`${tokenStyles.frame} ${styles.finalInner}`}><span aria-hidden="true" className={styles.finalMark} /><p>Controlled early access</p><h2 id="final-title">Keep the number, the context, and the next decision connected.</h2><Link href={pageContract.cta.href}>{pageContract.cta.label}<span aria-hidden="true">↗</span></Link></div></section>
    </>
  );
}
