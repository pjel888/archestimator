import styles from "../FrontdoorPage.module.css";

type AsciiDividerProps = {
  pattern?: string;
  className?: string;
};

const DEFAULT_PATTERN = "·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.·.";

/**
 * Full-bleed workshop-style dotted mono divider.
 * Decorative only — `aria-hidden` and `role="presentation"`.
 */
export function AsciiDivider({ pattern = DEFAULT_PATTERN, className }: AsciiDividerProps) {
  const repeated = pattern.repeat(4);
  return (
    <div className={`${styles.divider} ${className ?? ""}`} aria-hidden="true" role="presentation">
      <div className={styles.dividerTrack}>{repeated}</div>
    </div>
  );
}
