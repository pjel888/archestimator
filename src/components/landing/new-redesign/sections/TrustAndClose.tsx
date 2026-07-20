import Link from "next/link";
import { currentProduct, faqs, pageContract, proofPrinciples } from "../content";
import { demoProject } from "../fixtures";
import tokenStyles from "../tokens.module.css";
import styles from "./TrustAndClose.module.css";

const decisionTrail = [
  ["Estimate", demoProject.estimate.version, demoProject.estimate.total],
  ["Reuse", demoProject.reusable.selection, demoProject.reusable.sourceVersion],
  ["Review", demoProject.review.target, demoProject.review.comment],
  ["Decision", demoProject.decision.state, `${demoProject.decision.receipt} · ${demoProject.decision.recordedAt}`],
] as const;

export function TrustAndClose() {
  return (
    <>
      <section className={styles.founder} data-band="12" aria-labelledby="founder-title">
        <div className={tokenStyles.frame}><p>Founder perspective</p><blockquote id="founder-title">I built Archestimator from both sides of the AEC workflow: creating project and cost information, then designing the systems that keep it usable.</blockquote><cite>Philip Echavez Lewis · Founder</cite></div>
      </section>
      <section id="trust" className={styles.proof} data-band="13" aria-labelledby="proof-title">
        <div className={`${tokenStyles.frame} ${styles.proofIntro}`}><p>Product principles</p><h2 id="proof-title">Built around states you can inspect.</h2></div>
        <div className={`${tokenStyles.frame} ${styles.proofGrid}`}>{proofPrinciples.map((item, index) => <article key={item.title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
      </section>
      <section className={styles.story} data-band="14" aria-labelledby="story-title">
        <div className={`${tokenStyles.frame} ${styles.storyIntro}`}><div><p>One sanitized record</p><h2 id="story-title">The page describes one cost decision. It does not invent another interface.</h2></div><p>Every value below is fictional demonstration data. The software surface above is the actual product component.</p></div>
        <ol className={`${tokenStyles.frame} ${styles.decisionTrail}`}>
          {decisionTrail.map(([label, title, detail], index) => <li key={label}><span>{String(index + 1).padStart(2, "0")}</span><small>{label}</small><strong>{title}</strong><p>{detail}</p></li>)}
        </ol>
      </section>
      <section className={styles.status} data-band="15" aria-labelledby="status-title">
        <div className={`${tokenStyles.frame} ${styles.statusHeader}`}><p>Current product</p><h2 id="status-title">What Archestimator supports today.</h2></div>
        <div className={`${tokenStyles.frame} ${styles.statusRail}`}>{currentProduct.map((item, index) => <article key={item.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{item.title}</h3><p>{item.body}</p></div><strong>{item.evidence}</strong></article>)}</div>
      </section>
      <section className={styles.briefing} data-band="16" aria-labelledby="briefing-title">
        <div className={`${tokenStyles.frame} ${styles.briefingGrid}`}><div><p>Early-access briefing</p><h2 id="briefing-title">Know what is ready before you start.</h2><div className={styles.briefingLead}>See who Archestimator is for, what early access includes, and how Excel stays in the workflow.</div><Link href={pageContract.cta.href}>{pageContract.cta.label} ↗</Link></div><div className={styles.faqs}>{faqs.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></div>
      </section>
      <section className={`${styles.finalCta} ${tokenStyles.gridLines}`} data-band="17" aria-labelledby="final-title">
        <div className={`${tokenStyles.frame} ${styles.finalInner}`}><span aria-hidden="true" className={styles.finalMark} /><p>Controlled early access</p><h2 id="final-title">Keep the number, the context, and the next decision connected.</h2><Link href={pageContract.cta.href}>{pageContract.cta.label}<span aria-hidden="true">↗</span></Link></div>
      </section>
    </>
  );
}
