import { StatusPill } from "@/components/landing/shared/StatusPill";
import type { PlateNode } from "./plate-data";
import { cn } from "@/lib/ui/cn";

/**
 * PlateNode — renders a single node card of the commercial-graph plate
 * (doc 04 §4.4). RSC. The card carries `data-plate-node-id` +
 * `data-plate-public-label` + `data-plate-status` so the client PlateCaption
 * island (sibling) can read the focused node via ONE focusin listener and
 * update the aria-live caption (doc 07 §1.2 — the section's single client leaf).
 *
 * The card is keyboard-reachable: rendered as a real `<button>` so it lands in
 * DOM tab order with a native `:focus-visible` ring. The 2px left rule turns
 * `--brand-orange` on hover/focus (the accent rail / redline, D-3).
 */
export interface PlateNodeCardProps {
  node: PlateNode;
}

export function PlateNodeCard({ node }: PlateNodeCardProps) {
  const isPlanned = node.status === "Planned";
  const isBuilding = node.status === "Building";
  return (
    <button
      type="button"
      data-plate-node-id={node.id}
      data-plate-public-label={node.publicLabel}
      data-plate-status={node.status}
      data-plate-band={node.band}
      aria-label={`${node.label}. ${node.publicLabel}`}
      className={cn(
        "group/plate-node relative flex w-full flex-col gap-[var(--landing-space-2xs)] rounded-landing-dense border bg-surface p-[var(--landing-space-md)] text-left",
        "transition focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-landing-canvas",
        "hover:border-landing-hairline-strong",
        // Planned nodes render with a dashed border to signal "direction, not shipped" (doc 04 §4.7).
        isPlanned && "border-dashed border-landing-hairline-strong",
        !isPlanned && "border-landing-hairline",
        // The accent rail (D-3 presence mark) on the active node.
        "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:rounded-full before:bg-transparent before:transition-colors",
        "hover:before:bg-brand-orange focus-visible:before:bg-brand-orange",
        // Building nodes get a subtle amber tint to distinguish "in progress".
        isBuilding && "bg-warning/[0.03]",
      )}
    >
      <div className="flex items-center justify-between gap-[var(--landing-space-2xs)]">
        <span className="font-numeric text-landing-text-label uppercase tracking-landing-label text-landing-ink-muted">
          {node.id}
        </span>
        <StatusPill status={node.status} size="sm" />
      </div>
      <h3 className="font-display text-landing-text-body-lg leading-landing-tight text-landing-ink">
        {node.label}
      </h3>
      {node.subLabel ? (
        <p
          data-plate-sublabel="true"
          className="text-landing-text-caption leading-landing-prose text-landing-ink-secondary max-[360px]:hidden"
        >
          {node.subLabel}
        </p>
      ) : null}
    </button>
  );
}
