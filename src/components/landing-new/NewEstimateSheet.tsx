import styles from "./new-landing.module.css";

const groups = [
  {
    name: "Preliminaries",
    amount: "86,400",
    items: [
      { name: "Site establishment & hoarding", qty: "1 lot", unitCost: "86,400.00", contingency: "0%", amount: "86,400", source: false },
    ],
  },
  {
    name: "Substructure",
    amount: "184,185",
    items: [
      { name: "Bored piers — 900mm dia.", qty: "24 nr", unitCost: "1,850.00", contingency: "10%", amount: "48,840", source: true },
      { name: "Pile caps & ground beams", qty: "1 lot", unitCost: "128,900.00", contingency: "5%", amount: "135,345", source: false },
    ],
  },
  {
    name: "Superstructure",
    amount: "1,111,530",
    items: [
      { name: "RC frame — supply, form & pour", qty: "2,340 m³", unitCost: "385.00", contingency: "5%", amount: "945,945", source: true },
      { name: "Structural steel — stairs & transfers", qty: "38 t", unitCost: "4,150.00", contingency: "5%", amount: "165,585", source: false },
    ],
  },
  {
    name: "Fit-out",
    amount: "612,872",
    items: [
      { name: "Partitions & linings", qty: "5,120 m²", unitCost: "74.50", contingency: "5%", amount: "400,512", source: false },
      { name: "Joinery package", qty: "1 lot", unitCost: "212,360.00", contingency: "0%", amount: "212,360", source: false },
    ],
  },
] as const;

/**
 * The product, as the hero: a live estimate sheet in the app's own cost
 * model — Materials, Qty, Unit cost, per-row Contingency, Total item cost.
 * Server-rendered in its final state; the motion orchestrator replays how it
 * got there (rows cascading, the total rolling up, the status moving
 * draft → sent → approved). Numbers are an illustrative estimate, not a
 * claim.
 */
export function NewEstimateSheet() {
  return (
    <div className={styles.sheetRoot} data-hero="sheet" aria-label="Illustrative Archestimator estimate sheet">
      <div className={styles.sheetHead}>
        <div className={styles.sheetHeadText}>
          <span className={styles.sheetProject}>Harbourview Residences</span>
          <span className={styles.sheetMeta}>Estimate · Revision C</span>
        </div>
        <span className={styles.sheetPill} data-sheet="pill" data-state="approved">
          Approved
        </span>
      </div>

      <div className={styles.sheetColumns} aria-hidden="true">
        <span>Materials</span>
        <span>Qty</span>
        <span className={styles["colCost"]}>Unit cost</span>
        <span className={styles["colCont"]}>Contingency</span>
        <span>Total item cost</span>
      </div>

      <div>
        {groups.map((group) => (
          <div key={group.name} className={styles.rowGroupBlock}>
            <div className={styles.rowGroup} data-sheet-row>
              <span className={styles.rowName}>
                <span className={styles.disclosure} aria-hidden="true" />
                {group.name}
              </span>
              <span className={`${styles.rowAmount} ${styles.groupAmount}`}>{group.amount}</span>
            </div>
            {group.items.map((item) => (
              <div key={item.name} className={styles.rowItem} data-sheet-row>
                <span className={`${styles.rowName} ${styles.itemName}`}>
                  {item.source ? <span className={styles.srcDot} title="Source note attached" /> : null}
                  {item.name}
                </span>
                <span className={styles.rowQty}>{item.qty}</span>
                <span className={styles.rowCost}>{item.unitCost}</span>
                <span className={styles.rowCont}>{item.contingency}</span>
                <span className={styles.rowAmount}>{item.amount}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className={styles.sheetNote} data-sheet="note">
        <span className={styles.noteMark} aria-hidden="true" />
        <span>
          <strong>QS review</strong> — pier rate confirmed against Kea Drilling quote, March
        </span>
      </div>

      <div className={styles.sheetFooter}>
        <div className={`${styles.footerRow} ${styles.totalRow}`}>
          <span>Estimate total</span>
          <span className={styles.totalValue} data-sheet="total" data-value="1994987">
            $1,994,987
          </span>
        </div>
      </div>
    </div>
  );
}
