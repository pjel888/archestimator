import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";
import styles from "./new-landing.module.css";
import type { BentoVisual } from "./new-landing-content";

/**
 * Route-owned structural primitives for `/new`. Server-compatible: no hooks,
 * no browser APIs. Mini illustrations are semantic markup, not screenshots.
 */

export function LandingContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(styles.container, className)}>{children}</div>;
}

type SectionHeadingProps = {
  id: string;
  kicker?: string;
  title: string;
  lead?: string;
  align?: "start" | "center";
};

export function SectionHeading({ id, kicker, title, lead, align = "start" }: SectionHeadingProps) {
  return (
    <div className={cn(styles.sectionHeading, align === "center" && styles.sectionHeadingCenter)}>
      {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      {lead ? <p className={styles.sectionLead}>{lead}</p> : null}
    </div>
  );
}

/* ---------------------------------- bento mini visuals ---------------------------------- */

export function BentoMiniVisual({ visual }: { visual: BentoVisual }) {
  switch (visual) {
    case "scope-tree":
      return <MiniScopeTree />;
    case "saved-component":
      return <MiniSavedComponent />;
    case "outputs":
      return <MiniOutputBridge />;
    case "revision":
      return <MiniRevisionTrail />;
  }
}

/** Nested scope rows: Project → Ground floor → Kitchen → Finishes. */
function MiniScopeTree() {
  return (
    <div className={cn(styles.miniVisual, styles.miniScopeTree)} aria-hidden="true">
      <div className={styles.miniTreeRow} data-depth="0">
        <span className={styles.miniTreeNode}>Project</span>
        <span className={styles.miniTreeRollup} />
      </div>
      <div className={styles.miniTreeRow} data-depth="1">
        <span className={styles.miniTreeNode}>Ground floor</span>
        <span className={styles.miniTreeRollup} />
      </div>
      <div className={styles.miniTreeRow} data-depth="2" data-selected="true">
        <span className={styles.miniTreeNode}>Kitchen</span>
        <span className={styles.miniTreeRollup} data-active="true" />
      </div>
      <div className={styles.miniTreeRow} data-depth="3">
        <span className={styles.miniTreeNode}>Finishes</span>
        <span className={styles.miniTreeRollup} data-active="true" />
      </div>
    </div>
  );
}

/** One reusable component row with supplier/source chips and an add affordance. */
function MiniSavedComponent() {
  return (
    <div className={cn(styles.miniVisual, styles.miniSaved)} aria-hidden="true">
      <div className={styles.miniSavedRow}>
        <span className={styles.miniSavedThumb} />
        <span className={styles.miniSavedText}>
          <span className={styles.miniSavedName}>Saved component</span>
          <span className={styles.miniSavedChips}>
            <span className={styles.miniChip}>Supplier</span>
            <span className={styles.miniChip}>Source note</span>
          </span>
        </span>
        <span className={styles.miniSavedAdd}>Add to estimate</span>
      </div>
    </div>
  );
}

/** Estimate rows bridging into a proposal sheet and an Excel tab. */
function MiniOutputBridge() {
  return (
    <div className={cn(styles.miniVisual, styles.miniBridge)} aria-hidden="true">
      <div className={styles.miniBridgeEstimate}>
        <span className={styles.miniBridgeLabel}>Estimate</span>
        <span className={styles.miniBridgeLine} />
        <span className={styles.miniBridgeLine} data-short="true" />
        <span className={styles.miniBridgeLine} />
      </div>
      <span className={styles.miniBridgeConnector} />
      <div className={styles.miniBridgeOutputs}>
        <span className={styles.miniBridgePaper}>
          <span className={styles.miniBridgeLabel}>Proposal</span>
          <span className={styles.miniBridgeLine} />
          <span className={styles.miniBridgeLine} data-short="true" />
        </span>
        <span className={styles.miniBridgeTab}>Excel</span>
      </div>
    </div>
  );
}

/** Review → changed value → revision → decision trail. */
function MiniRevisionTrail() {
  return (
    <div className={cn(styles.miniVisual, styles.miniTrail)} aria-hidden="true">
      <span className={styles.miniTrailStep}>Review</span>
      <span className={styles.miniTrailStep} data-tone="signal">
        Changed value
      </span>
      <span className={styles.miniTrailStep}>Revision</span>
      <span className={styles.miniTrailStep} data-tone="olive">
        Decision
      </span>
    </div>
  );
}
