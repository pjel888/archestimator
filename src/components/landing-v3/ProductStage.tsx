import styles from "./landing-v3.module.css";

type ProductStageProps = {
  mode?: "hero" | "workflow" | "library" | "proposal" | "revision" | "specialty";
  activeStep?: number;
};

export function ProductStage({ mode = "hero", activeStep = 0 }: ProductStageProps) {
  return (
    <div className={`${styles.productStage} ${styles[`stage-${mode}`]}`} data-active-step={activeStep} aria-label="Future software preview placeholder">
      <div className={styles.stageGlassFrame} aria-hidden="true">
        <div className={styles.stageGlassInner}>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
