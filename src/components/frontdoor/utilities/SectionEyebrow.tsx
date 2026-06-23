import styles from "../FrontdoorPage.module.css";

type SectionEyebrowProps = {
  label: string;
  className?: string;
};

/**
 * Quiet section kicker.
 * Renders as `<p>` (not heading) so it never competes with H1/H2 semantics.
 */
export function SectionEyebrow({ label, className }: SectionEyebrowProps) {
  return (
    <p className={`${styles.eyebrow} ${className ?? ""}`}>
      <span className={styles.eyebrowLabel}>{label}</span>
    </p>
  );
}
