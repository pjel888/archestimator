import { cn } from "@/lib/ui/cn";
import { StatusPill } from "@/components/landing/shared/StatusPill";
//   ↑ D-4 HARD CONTRACT: consume the shared StatusPill + ClaimStatus type.
//     This file does NOT redefine ClaimStatus — the narrowing test grep-enforces it.
import type { ClaimRowData } from "./claims-data";

/**
 * ClaimRow — a single row of the radical-honesty ClaimsLedger (doc 06 §2.2).
 *
 * RSC-safe: no hooks, no "use client". Renders the claim as a `<dt>`, the status
 * pill + §source audit tag as the `<dd>`, and the optional honest `note` beneath
 * the claim. Honesty text is ALWAYS `--secondary` (#5D5D5D, AA-safe) — #7F7F7F /
 * `--tertiary` is forbidden here because it fails WCAG AA at these sizes (doc 12 §6).
 *
 * `data-claim-status` is the literal string the ClaimFilter island toggles via CSS
 * show/hide (doc 06 §2.1). The redline accent is a 2px `--brand-orange` left rail —
 * a visual annotation only; copy is never recolored (doc 06 §2.3).
 *
 * The row is a flex container (pill left, claim/source right) so the ledger reads
 * as a scan-able matrix; the surrounding `<dl>` is provided by ClaimsLedger.
 */
export interface ClaimRowProps {
  row: ClaimRowData;
}

export function ClaimRow({ row }: ClaimRowProps) {
  const { claim, status, source, note, redline } = row;

  return (
    <div
      data-claim-status={status}
      data-redline={redline ? "true" : "false"}
      className={cn(
        "flex items-start gap-3 py-3 sm:gap-4 sm:py-3.5",
        // Redline accent rail — annotation only, copy stays --ink/--secondary.
        redline ? "border-l-2 border-brand-orange pl-3 sm:pl-4" : "border-l-2 border-transparent pl-3 sm:pl-4",
      )}
    >
      <div className="pt-0.5 shrink-0">
        <StatusPill status={status} redline={redline} size="md" />
      </div>

      <div className="min-w-0 flex-1">
        <dt className="text-[15px] leading-snug tracking-[-0.01em] text-landing-ink sm:text-[16px]">
          {claim}
        </dt>

        {note ? (
          <p className="mt-1 text-[13px] leading-relaxed tracking-[-0.005em] text-landing-ink-secondary">
            {note}
          </p>
        ) : null}

        <dd className="mt-1.5">
          <span className="font-numeric text-[11px] uppercase tracking-normal tabular-nums text-landing-ink-secondary">
            {source}
          </span>
        </dd>
      </div>
    </div>
  );
}
