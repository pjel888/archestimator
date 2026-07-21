import { cn } from "@/lib/ui/cn";
import {
  CLAIM_GROUPS,
  FOOTER_CLAIM_ROWS,
  type ClaimGroup,
  type ClaimRowData,
} from "./claims-data";
import { ClaimRow } from "./ClaimRow";
import { ClaimFilter } from "./ClaimFilter";

/**
 * ClaimsLedger - the radical-honesty proof engine (doc 06 §2 / doc 13 §3 / doc 12 §6).
 *
 * Renders the claims matrix from `claims-data.ts` as a real, crawlable semantic
 * structure: each status group is a `<section aria-labelledby>` whose body is a
 * `<dl>` of `<dt>` (claim) + `<dd>` (status pill + §source). Footer variant renders
 * only the 3-row `FOOTER_CLAIM_ROWS` abbreviation flat - no group headings, no filter
 * (doc 06 §2.4).
 *
 * The container carries `data-claims-ledger`; the ClaimFilter island flips an ancestor
 * `data-claims-filter` attribute and the rows stay in the DOM (SEO + a11y) - only
 * visibility toggles via CSS, no React re-render of the rows (doc 06 §2.1).
 *
 * The "not-us" group is rendered as a clearly-delimited "What we are NOT" block - it
 * is NOT a fourth status bucket competing with Live/Building/Planned (doc 06 §3.4).
 *
 * RSC-safe: no hooks, no "use client".
 */
export interface ClaimsLedgerProps {
  /** Override the row source (defaults to CLAIM_GROUPS in full mode). */
  rows?: ClaimRowData[];
  /** Override the group structure (defaults to CLAIM_GROUPS). */
  groups?: ClaimGroup[];
  /** Section heading; renders as an `<h2>`. Defaults to "What is real today".
   *  Pass `null` to suppress the heading entirely (used when the section
   *  wrapper already provides the heading - e.g. homepage Section 7). */
  title?: string | null;
  /** Render the ClaimFilter island (homepage Section 7 + /trust). Footer never does. */
  enableFilter?: boolean;
  /** "full" (default) renders grouped CLAIM_GROUPS; "footer" renders FOOTER_CLAIM_ROWS flat. */
  variant?: "full" | "footer";
}

const DEFAULT_TITLE = "What is real today";

export function ClaimsLedger({
  rows,
  groups,
  title,
  enableFilter = false,
  variant = "full",
}: ClaimsLedgerProps) {
  // Footer variant: 3-row abbreviation, no filter, no group headings (doc 06 §2.4).
  if (variant === "footer") {
    const footerRows = rows ?? [...FOOTER_CLAIM_ROWS];
    return (
      <div
        data-claims-ledger
        data-claims-filter="All"
        data-claims-variant="footer"
        className="dashboard-glass w-full rounded-landing-panel border border-landing-hairline bg-landing-canvas/40 px-4 py-2 sm:px-6"
      >
        <dl className="divide-y divide-landing-hairline">
          {footerRows.map((row) => (
            <ClaimRow key={`${row.status}-${row.claim}`} row={row} />
          ))}
        </dl>
      </div>
    );
  }

  const effectiveGroups = groups ?? [...CLAIM_GROUPS];

  return (
    <div
      data-claims-ledger
      data-claims-filter="All"
      data-claims-variant="full"
      className="dashboard-glass w-full rounded-landing-panel border border-landing-hairline bg-landing-canvas/40 p-4 sm:p-6"
    >
      {title !== null && title !== "" ? (
        <div className="mb-4 flex flex-col gap-3 border-b border-landing-hairline pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h2 className="text-[22px] font-normal leading-tight tracking-[-0.02em] text-landing-ink sm:text-[26px]">
            {title ?? DEFAULT_TITLE}
          </h2>
          {enableFilter ? <ClaimFilter /> : null}
        </div>
      ) : enableFilter ? (
        <div className="mb-4 border-b border-landing-hairline pb-4">
          <ClaimFilter />
        </div>
      ) : null}

      {effectiveGroups.map((group) => {
        const isNotUs = group.id === "not-us";
        return (
          <section
            key={group.id}
            data-claims-group={group.id}
            aria-labelledby={`claims-group-${group.id}`}
            className={cn(
              "first:pt-0",
              // Every group is separated by the landing hairline.
              "border-t border-landing-hairline pt-5 mt-5 first:border-t-0 first:mt-0 first:pt-0",
            )}
          >
            <div className="mb-2">
              <h3
                id={`claims-group-${group.id}`}
                className={cn(
                  "font-numeric text-[11px] font-semibold uppercase tracking-[0.12em]",
                  isNotUs ? "text-landing-accent-aa" : "text-landing-ink-secondary",
                )}
              >
                {group.heading}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-landing-ink-secondary">
                {group.lead}
              </p>
            </div>

            <dl className="divide-y divide-landing-hairline">
              {group.rows.map((row) => (
                <ClaimRow key={`${group.id}-${row.claim}`} row={row} />
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
