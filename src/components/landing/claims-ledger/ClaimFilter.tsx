"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { cn } from "@/lib/ui/cn";
import type { ClaimStatus } from "@/components/landing/shared/StatusPill";
//   ↑ D-4 HARD CONTRACT: consume the shared ClaimStatus type. Not redefined here.

/**
 * ClaimFilter - the All/Live/Building/Planned filter island for the ClaimsLedger
 * (doc 06 §2.1).
 *
 * Contract: the rows stay in the DOM (SEO + a11y). Clicking a chip flips a single
 * `data-claims-filter` attribute on the nearest `[data-claims-ledger]` ancestor; the
 * scoped `<style>` block below then shows/hides rows (and their empty group sections)
 * via pure CSS attribute selectors. NO React state re-render of the rows - only the
 * chip `aria-pressed` state is React-owned (for the presence mark).
 *
 * Accessibility (doc 12 §6):
 *   - Real `<button>`s with logical tab order (one tab stop each).
 *   - `aria-pressed` marks the active chip (color is never the only signal).
 *   - Active chip carries the `--brand-orange` outline (the presence mark, D-3).
 *   - Reduced motion: state change is instant (no transition on the chip).
 */
export type ClaimsFilterValue = "All" | ClaimStatus;

const FILTER_CHIPS: ReadonlyArray<{ value: ClaimsFilterValue; label: string }> = [
  { value: "All", label: "All" },
  { value: "Live", label: "Live" },
  { value: "Building", label: "Building" },
  { value: "Planned", label: "Planned" },
];

/**
 * The show/hide stylesheet. Scoped tightly to `[data-claims-ledger]` with one rule
 * per non-All status (doc 06 §2.1 verbatim contract). "All" shows everything, so it
 * has no rule. Rows are hidden by `data-claim-status`; empty group `<section>`s are
 * hidden by `data-claims-group` so headings do not linger over zero matching rows.
 * Group id ↔ status map: live↔Live, building↔Building, planned↔Planned, not-us↔NotUs.
 */
const FILTER_STYLE = `
[data-claims-ledger][data-claims-filter="Live"] [data-claim-status]:not([data-claim-status="Live"]) { display: none; }
[data-claims-ledger][data-claims-filter="Live"] [data-claims-group]:not([data-claims-group="live"]) { display: none; }
[data-claims-ledger][data-claims-filter="Building"] [data-claim-status]:not([data-claim-status="Building"]) { display: none; }
[data-claims-ledger][data-claims-filter="Building"] [data-claims-group]:not([data-claims-group="building"]) { display: none; }
[data-claims-ledger][data-claims-filter="Planned"] [data-claim-status]:not([data-claim-status="Planned"]) { display: none; }
[data-claims-ledger][data-claims-filter="Planned"] [data-claims-group]:not([data-claims-group="planned"]) { display: none; }
`;

export interface ClaimFilterProps {
  className?: string;
}

export function ClaimFilter({ className }: ClaimFilterProps) {
  const [active, setActive] = useState<ClaimsFilterValue>("All");

  const handleSelect = useCallback(
    (value: ClaimsFilterValue, event: MouseEvent<HTMLButtonElement>) => {
      setActive(value);
      // Flip the ancestor attribute - CSS does the show/hide. No row re-render.
      const ledger = event.currentTarget.closest("[data-claims-ledger]");
      if (ledger) {
        ledger.setAttribute("data-claims-filter", value);
      }
    },
    [],
  );

  return (
    // react-doctor-disable-next-line react-doctor/prefer-tag-over-role -- This is a named filter control group; <address> would be the wrong semantic element.
    <div
      role="group"
      aria-label="Filter claims by status"
      className={cn(
        "inline-flex items-center gap-1 rounded-landing-pill border border-landing-hairline bg-landing-canvas/60 p-1",
        className,
      )}
    >
      {/*
        Scoped show/hide stylesheet - one rule per status (doc 06 §2.1). Rendered once
        per island; selectors are attribute-based and idempotent if multiple land.
      */}
      <style>{FILTER_STYLE}</style>

      {FILTER_CHIPS.map((chip) => {
        const isActive = active === chip.value;
        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={isActive}
            onClick={(event) => handleSelect(chip.value, event)}
            className={cn(
              "min-h-6 cursor-pointer rounded-landing-dense px-2.5 text-[11px] font-medium leading-none tracking-normal outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-1 focus-visible:ring-offset-landing-canvas",
              // Reduced-motion: no transition on state change.
              "motion-reduce:transition-none",
              isActive
                ? // Presence mark (D-3): --brand-orange outline + ink text.
                  "border border-brand-orange bg-brand-orange/10 text-landing-ink"
                : "border border-transparent text-landing-ink-secondary hover:text-landing-ink",
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
