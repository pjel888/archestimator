import { HeroEstimateWorkspaceMockup } from "@/components/landing-v3/HeroEstimateWorkspaceMockup";
import { cn } from "@/lib/ui/cn";
import styles from "./new-landing.module.css";
import { heroCopy } from "./new-landing-content";

export type NewLandingHeroDemoProps = {
  className?: string;
};

/**
 * Route-owned wrapper around the real sanitized estimate-workspace demo.
 *
 * It stays on a populated, deterministic product state so the proof remains
 * legible instead of cycling through empty setup phases.
 */
export function NewLandingHeroDemo({ className }: NewLandingHeroDemoProps) {
  return (
    <div className={cn(styles.heroDemoShell, className)} data-new-landing-product-frame>
      <div className={styles.heroDemoFrame}>
        <div className={styles.heroDemoViewport} role="region" aria-label={heroCopy.demoRegionLabel}>
          {/* The demo is a presentation of the real workspace: pointer-inert
              already, and inert here keeps its many controls out of the tab
              order and accessibility tree. The region label plus the visible
              disclosure communicate what it is. */}
          <div inert className={styles.heroDemoViewportInner}>
            <HeroEstimateWorkspaceMockup
              playback="static"
              staticPhase="fauxwood-replaced"
            />
          </div>
        </div>
      </div>
      <p className={styles.heroDemoDisclosure}>{heroCopy.demoDisclosure}</p>
    </div>
  );
}
