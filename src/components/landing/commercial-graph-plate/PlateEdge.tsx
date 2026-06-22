import type { EdgeDirection, EdgeKind } from "./plate-data";
import { cn } from "@/lib/ui/cn";

/**
 * PlateEdgeConnector — a decorative vertical hairline connector between
 * stacked plate nodes (doc 04 §4.3 / §4.6). Pure presentational RSC.
 *
 * The bidirectional visual (↔ in the desktop composition) is rendered as a
 * small double-arrowhead glyph on the connector; the data stores each
 * bidirectional edge once (doc 04 §4.8 storage note).
 *
 * Edge kinds (doc 04 §4.3):
 *  - solid          : warm hairline (Live ↔ Live)
 *  - lighter        : thinner hairline (→ Building)
 *  - dashed-accent  : --brand-orange dashed (→ Planned, the aspiration arrow)
 */
export interface PlateEdgeConnectorProps {
  kind: EdgeKind;
  direction?: EdgeDirection;
  /** Optional edge label rendered beside the connector. */
  label?: string;
}

export function PlateEdgeConnector({ kind, direction = "uni", label }: PlateEdgeConnectorProps) {
  const isAccent = kind === "dashed-accent";
  const isLighter = kind === "lighter";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex flex-col items-center justify-center gap-[var(--landing-space-3xs)] py-[var(--landing-space-2xs)]",
      )}
    >
      {/* Top arrowhead (only for bidirectional) */}
      {direction === "bidirectional" ? (
        <span className={cn("text-[8px] leading-none", isAccent ? "text-brand-orange" : "text-landing-ink-muted")}>▲</span>
      ) : null}
      <span
        className={cn(
          "block w-px",
          isLighter ? "h-[var(--landing-space-sm)]" : "h-[var(--landing-space-md)]",
          isAccent
            ? "border-l border-dashed border-brand-orange"
            : isLighter
              ? "border-l border-landing-hairline"
              : "border-l border-landing-hairline-strong",
        )}
      />
      {label ? (
        <span className="font-numeric text-[10px] uppercase tracking-landing-label text-landing-ink-muted">
          {label}
        </span>
      ) : null}
      {/* Bottom arrowhead (uni + bidirectional) */}
      <span className={cn("text-[8px] leading-none", isAccent ? "text-brand-orange" : "text-landing-ink-muted")}>▼</span>
    </div>
  );
}
