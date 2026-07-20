import { fixture } from "./landing-content";
import styles from "./new-landing.module.css";

/**
 * The Living Estimate, as a static composition: a ledger-style estimate
 * fragment on the left, the orange Cost Thread flowing into the client
 * proposal plane, and — below/right — the client comment pin and the
 * revision ghost (₱864,000 → ₱912,000). This is the hero's complete
 * no-JS, no-WebGL, reduced-motion, and mobile experience; the WebGL scene
 * mounts later into the wrapping [data-hero-scene-slot] container.
 */
export function LivingEstimatePoster() {
  // Four fragment rows from the fixture, including the source-marked Joinery row.
  const rows = fixture.groups.flatMap((group) => group.items).slice(1, 5);

  return (
    <div className={styles.poster} data-hero="poster">
      <div className={styles.posterSheet}>
        <div className={styles.posterSheetHead}>
          <span className={styles.posterProject}>{fixture.project}</span>
          <span className={styles.posterMeta}>{fixture.meta}</span>
        </div>
        <div className={styles.posterRows}>
          {rows.map((item) => (
            <div key={item.name} className={styles.posterRow}>
              <span className={styles.posterRowName}>
                {item.source ? (
                  <span className={styles.srcMark} title={item.source}>
                    <span className={styles.srOnly}>{item.source}</span>
                  </span>
                ) : null}
                {item.name}
              </span>
              <span className={styles.posterRowQty}>{item.qty}</span>
              <span className={styles.posterRowTotal}>{item.total}</span>
            </div>
          ))}
        </div>
        <div className={styles.posterSheetTotal}>
          <span>{fixture.totalLabel}</span>
          <span>{fixture.total}</span>
        </div>
      </div>

      <svg
        className={styles.posterThread}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        {/* Cost Thread: Joinery row → proposal plane → client comment. */}
        <path
          d="M50 34 C 58 34, 61 21, 70 20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M80 34 C 84 44, 80 56, 74 64"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className={styles.threadDot} style={{ left: "50%", top: "34%" }} aria-hidden="true" />
      <span className={styles.threadDot} style={{ left: "70%", top: "20%" }} aria-hidden="true" />
      <span className={styles.threadDot} style={{ left: "74%", top: "64%" }} aria-hidden="true" />

      <div className={styles.posterProposal}>
        <div className={styles.posterProposalHead}>
          <span className={styles.posterProposalTitle}>{fixture.proposal.title}</span>
          <span className={styles.chip}>{fixture.proposal.status}</span>
        </div>
        <div className={styles.posterProposalLines}>
          {fixture.proposal.summary.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      </div>

      <div className={styles.posterAside}>
        <div className={styles.posterComment}>
          <span className={styles.commentPin} aria-hidden="true" />
          <div className={styles.posterCommentBody}>
            <span className={styles.commentLabel}>{fixture.comment.label}</span>
            <p className={styles.commentQuote}>“{fixture.comment.quote}”</p>
          </div>
        </div>
        <div className={styles.posterGhostRow}>
          <s className={styles.ghost}>{fixture.joinery.prior}</s>
          <span className={styles.ghostArrow} aria-hidden="true">
            →
          </span>
          <span className={styles.ghostCurrent}>{fixture.joinery.current}</span>
          <span className={styles.ghostMeta}>{fixture.joinery.revision}</span>
        </div>
      </div>

      <span className={styles.posterCaption}>{fixture.posterCaption}</span>
    </div>
  );
}
