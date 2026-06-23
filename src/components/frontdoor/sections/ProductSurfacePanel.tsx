import type { CSSProperties } from "react";

import styles from "../FrontdoorPage.module.css";

export type ProductSurfaceKind =
  | "estimate"
  | "library"
  | "activity"
  | "proposal"
  | "export"
  | "charts"
  | "drift";

type ProductSurfacePanelProps = {
  kind: ProductSurfaceKind;
  compact?: boolean;
};

export function ProductSurfacePanel({ kind, compact = false }: ProductSurfacePanelProps) {
  return (
    <div className={styles.productSurface} data-surface={kind} data-compact={compact ? "true" : "false"} aria-hidden="true">
      {kind === "estimate" ? <EstimateSurface /> : null}
      {kind === "library" ? <LibrarySurface /> : null}
      {kind === "activity" ? <ActivitySurface /> : null}
      {kind === "proposal" ? <ProposalSurface /> : null}
      {kind === "export" ? <ExportSurface /> : null}
      {kind === "charts" ? <ChartsSurface /> : null}
      {kind === "drift" ? <DriftSurface /> : null}
    </div>
  );
}

function SurfaceTop({ title, meta }: { title: string; meta: string }) {
  return (
    <div className={styles.surfaceTop}>
      <span className={styles.surfaceTitle}>{title}</span>
      <span className={styles.surfaceMeta}>{meta}</span>
    </div>
  );
}

function EstimateSurface() {
  return (
    <>
      <SurfaceTop title="Estimate sheet" meta="Revision 04" />
      <div className={styles.surfaceEstimateGrid}>
        {["Area", "Scope", "Qty", "Total"].map((label) => (
          <span key={label} className={styles.surfaceHeaderCell}>{label}</span>
        ))}
        <span>Lobby</span>
        <span>Wall finish</span>
        <span>184 sqm</span>
        <strong>PHP 92k</strong>
        <span>Suite</span>
        <span>Floor tile</span>
        <span>320 sqm</span>
        <strong>PHP 214k</strong>
        <span>Core</span>
        <span>Ceiling works</span>
        <span>128 sqm</span>
        <strong>PHP 88k</strong>
      </div>
      <div className={styles.surfaceTotalRow}>
        <span>Live total</span>
        <strong>PHP 394k</strong>
      </div>
    </>
  );
}

function LibrarySurface() {
  return (
    <>
      <SurfaceTop title="Cost library" meta="42 saved rates" />
      <div className={styles.surfaceLibraryList}>
        {[
          ["Acrylic paint", "Supplier A", "PHP 510 / gal"],
          ["Porcelain tile", "Supplier C", "PHP 1,180 / sqm"],
          ["Gypsum board", "Supplier B", "PHP 745 / sheet"],
        ].map(([name, supplier, price]) => (
          <div key={name} className={styles.surfaceLibraryRow}>
            <span>
              <strong>{name}</strong>
              <small>{supplier}</small>
            </span>
            <em>{price}</em>
          </div>
        ))}
      </div>
    </>
  );
}

function ActivitySurface() {
  return (
    <>
      <SurfaceTop title="Activity" meta="Traceable changes" />
      <div className={styles.surfaceTimeline}>
        {[
          ["Scope updated", "Floor tile quantity changed"],
          ["Rate confirmed", "Supplier C quote attached"],
          ["Decision logged", "Client approved alternate finish"],
        ].map(([title, body]) => (
          <div key={title} className={styles.surfaceTimelineItem}>
            <span className={styles.surfaceTimelineDot} />
            <strong>{title}</strong>
            <small>{body}</small>
          </div>
        ))}
      </div>
    </>
  );
}

function ProposalSurface() {
  return (
    <>
      <SurfaceTop title="Proposal link" meta="Client review" />
      <div className={styles.surfaceProposal}>
        <div>
          <span>Included scope</span>
          <strong>Interior fit-out package</strong>
        </div>
        <div>
          <span>Decision state</span>
          <strong>Review requested</strong>
        </div>
        <div>
          <span>Comments</span>
          <strong>3 open items</strong>
        </div>
      </div>
      <span className={styles.surfaceLock}>Password protected</span>
    </>
  );
}

function ExportSurface() {
  return (
    <>
      <SurfaceTop title="Handoff package" meta="Ready to send" />
      <div className={styles.surfaceExportStack}>
        {["Estimate workbook", "Cost-source appendix", "Proposal summary"].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </>
  );
}

function ChartsSurface() {
  return (
    <>
      <SurfaceTop title="Cost mix" meta="By category" />
      <div className={styles.surfaceChart}>
        <span style={{ "--bar": "78%" } as CSSProperties}>Materials</span>
        <span style={{ "--bar": "54%" } as CSSProperties}>Labor</span>
        <span style={{ "--bar": "38%" } as CSSProperties}>Equipment</span>
        <span style={{ "--bar": "24%" } as CSSProperties}>Contingency</span>
      </div>
    </>
  );
}

function DriftSurface() {
  return (
    <>
      <SurfaceTop title="Estimate memory" meta="Connected record" />
      <div className={styles.surfaceDrift}>
        <span className={styles.surfaceDriftLine} />
        <span className={styles.surfaceDriftLine} />
        <span className={styles.surfaceDriftLine} />
        <span className={styles.surfaceDriftNode} />
        <span className={styles.surfaceDriftNode} />
        <span className={styles.surfaceDriftNode} />
      </div>
    </>
  );
}
