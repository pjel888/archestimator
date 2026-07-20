import { ActualWorkspaceStage } from "../interactions/ActualWorkspaceStage.client";
import tokenStyles from "../tokens.module.css";
import styles from "./ProductStage.module.css";

const productStates = [
  ["01", "Estimate", "Build in the real workspace"],
  ["02", "Reuse", "Select from your owned sources"],
  ["03", "Issue", "Carry the estimate into an output"],
  ["04", "Review", "Keep the response tied to context"],
] as const;

export function ProductStage() {
  return (
    <div id="product" className={`${tokenStyles.frame} ${styles.atmosphere}`}>
      <div className={styles.stageIntro}>
        <p>Exact product surface</p>
        <div>
          <strong>The estimate workspace itself. Not a reconstruction.</strong>
          <span>The production estimate workspace is mounted below with sanitized, local-only data and its real component tree.</span>
        </div>
      </div>
      <div className={styles.stageWindow}>
        <ActualWorkspaceStage />
      </div>
      <div className={styles.stageNote}>
        <span>Sanitized demonstration data</span>
        <span>Actual workspace component · interactions disabled on the landing page</span>
      </div>
      <ol className={styles.stateRail} aria-label="Estimate-to-decision product states">
        {productStates.map(([number, title, detail]) => (
          <li key={number}><span>{number}</span><strong>{title}</strong><small>{detail}</small></li>
        ))}
      </ol>
    </div>
  );
}
