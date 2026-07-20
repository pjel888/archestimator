import { fixture } from "./landing-content";
import styles from "./new-landing.module.css";

/**
 * The canonical estimate fixture sheet, server-rendered in its final
 * Revision B state. Columns are a legibility crop of the current estimate
 * workspace header set (Materials / Qty / Contingency / Subtotal / Total
 * Item Cost, with Adjustment and Misc Cost cropped out) — real names and
 * order, never renamed or recombined. This is a concept illustration
 * pending a sanctioned product capture, not a screenshot. Numbers are an
 * illustrative estimate, not a claim.
 */
export function EstimateFixtureSheet() {
  return (
    <div className={styles.sheet} aria-label="Illustrative Archestimator estimate sheet">
      <div className={styles.sheetHead}>
        <div className={styles.sheetHeadText}>
          <span className={styles.sheetProject}>{fixture.project}</span>
          <span className={styles.sheetMeta}>{fixture.meta}</span>
        </div>
        <span className={styles.chip}>{fixture.status}</span>
      </div>

      <div className={styles.sheetColumns} aria-hidden="true">
        <span>{fixture.columns[0]}</span>
        <span className={styles.cellQty}>{fixture.columns[1]}</span>
        <span className={styles.cellCont}>{fixture.columns[2]}</span>
        <span className={styles.cellSubtotal}>{fixture.columns[3]}</span>
        <span className={styles.cellTotal}>{fixture.columns[4]}</span>
      </div>

      <div className={styles.sheetBody}>
        {fixture.groups.map((group) => (
          <div key={group.name} className={styles.sheetGroup}>
            <div className={styles.sheetGroupName}>{group.name}</div>
            {group.items.map((item) => (
              <div key={item.name} className={styles.sheetRow}>
                <span className={styles.cellName}>
                  {item.source ? (
                    <span className={styles.srcMark} title={item.source}>
                      <span className={styles.srOnly}>{item.source}</span>
                    </span>
                  ) : null}
                  {item.name}
                </span>
                <span className={styles.cellQty}>{item.qty}</span>
                <span className={styles.cellCont}>{item.contingency}</span>
                <span className={styles.cellSubtotal}>{item.subtotal}</span>
                <span className={styles.cellTotal}>
                  {item.prior ? <s className={styles.ghost}>{item.prior}</s> : null}
                  {item.total}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className={styles.sheetFoot}>
        <div className={styles.sheetTotal}>
          <span>{fixture.totalLabel}</span>
          <span className={styles.sheetTotalValue}>{fixture.total}</span>
        </div>
        <p className={styles.sheetNote}>
          <span className={styles.noteMark} aria-hidden="true" />
          {fixture.note}
        </p>
      </div>
    </div>
  );
}
