"use client";

import {
  LIVING_ESTIMATE_STATES,
  LIVING_ESTIMATE_STATE_LABELS,
  type LivingEstimateState,
} from "./living-estimate-model";
import styles from "./living-estimate.module.css";

export interface LivingEstimateControlsProps {
  state: LivingEstimateState;
  onChange: (next: LivingEstimateState) => void;
}

/**
 * Segmented state switcher for The Living Estimate hero scene. Four native
 * buttons (Estimate / Proposal / Review / Revision) with aria-pressed on
 * the active one, plus a visually-hidden live region announcing the current
 * state label. These demonstrate the scene's concept — they are not CTAs.
 */
export function LivingEstimateControls({ state, onChange }: LivingEstimateControlsProps) {
  return (
    <>
      <div className={styles.controls} role="group" aria-label="Living Estimate scene state (illustrative)">
        {LIVING_ESTIMATE_STATES.map((option) => (
          <button
            key={option}
            type="button"
            className={styles.controlButton}
            data-active={option === state || undefined}
            aria-pressed={option === state}
            onClick={() => onChange(option)}
          >
            {LIVING_ESTIMATE_STATE_LABELS[option]}
          </button>
        ))}
      </div>
      <span className={styles.srOnly} aria-live="polite">
        {LIVING_ESTIMATE_STATE_LABELS[state]}
      </span>
    </>
  );
}
