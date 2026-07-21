import { cn } from "@/lib/ui/cn";

/**
 * StatusPill - the ONE shared claim-status component (keystone decision D-4).
 *
 * Defines the single `ClaimStatus` type consumed by the commercial-graph plate (which
 * narrows to the Live|Building|Planned subset at its call site) and by the ClaimsLedger.
 * Do NOT redefine this type elsewhere - `tests/unit/claim-status-narrowing.test.ts` grep-enforces it.
 *
 * Color map (MASTER-IMPLEMENTATION-PLAN §C-1):
 *   Live     → --success #15803d
 *   Building → --warning #b45309
 *   Planned  → --ink #3D3D3D
 *   NotUs    → --muted-foreground #6b6b6b   (#7F7F7F is NEVER used - it fails WCAG AA)
 * Font: Roboto Mono (--font-numeric). The component renders the status LABEL, not color alone
 * (color-only fails WCAG 1.4.1). A `redline` accent dot marks load-bearing claims.
 *
 * RSC-safe: no hooks, no "use client" - renders on the server.
 */
export type ClaimStatus = "Live" | "Building" | "Planned" | "NotUs";

export interface StatusPillProps {
  status: ClaimStatus;
  /** Load-bearing claim - renders the signal-orange accent dot. */
  redline?: boolean;
  size?: "sm" | "md";
}

const STATUS_LABEL: Record<ClaimStatus, string> = {
  Live: "Live",
  Building: "Building",
  Planned: "Planned",
  // NotUs display label is owner-gated (LOOP_LEDGER); "Not us" is the interim default.
  NotUs: "Not us",
};

const STATUS_TONE: Record<ClaimStatus, string> = {
  Live: "border-success/30 bg-success/10 text-success",
  Building: "border-warning/30 bg-warning/10 text-warning",
  Planned: "border-hairline bg-surfaceMuted text-ink",
  NotUs: "border-hairline bg-surfaceMuted text-muted-foreground",
};

const SIZE_CLASS: Record<NonNullable<StatusPillProps["size"]>, string> = {
  sm: "min-h-5 px-1.5 !text-[9px]",
  md: "min-h-6 px-2 !text-[10px]",
};

export function StatusPill({ status, redline = false, size = "sm" }: StatusPillProps) {
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xs border font-medium uppercase leading-none tracking-normal tabular-nums font-numeric",
        STATUS_TONE[status],
        SIZE_CLASS[size],
      )}
    >
      {redline ? (
        <span aria-hidden="true" className="inline-block size-1 rounded-full bg-brand-orange" />
      ) : null}
      {STATUS_LABEL[status]}
    </span>
  );
}
