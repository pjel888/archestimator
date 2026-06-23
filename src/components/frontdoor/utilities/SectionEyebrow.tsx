import styles from "../FrontdoorPage.module.css";

type SectionEyebrowProps = {
  ordinal: string;
  label: string;
  className?: string;
};

/**
 * Workshop-style dotted mono "01 — LABEL" eyebrow.
 * Renders as `<p>` (not heading) so it never competes with H1/H2 semantics.
 */
export function SectionEyebrow({ ordinal, label, className }: SectionEyebrowProps) {
  return (
    <p className={`${styles.eyebrow} ${className ?? ""}`}>
      <span className={styles.eyebrowOrdinal}>{ordinal}</span>
      <span className={styles.eyebrowDivider} aria-hidden="true">
        —
      </span>
      <span className={styles.eyebrowLabel}>{label}</span>
    </p>
  );
}
