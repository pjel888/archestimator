"use client";

import { useEffect, useRef } from "react";
import { annotate } from "rough-notation";

/* Mirrors --brand-clay in globals.css (rough-notation needs a literal string) */
const ARTIFACT_ANNOTATION_COLOR = "#b2492c";

/* Assembly timeline (ms), once on mount — rows stagger in (120–780), the
   overlap cards enter (800/900), the subtotal lands (1000), the rough circle
   draws on a still canvas (1100–1800), and the margin note settles last
   (1700–1900). Total ≤1.9s; everything collapses to the final state under
   prefers-reduced-motion. */
const ROW_BASE_DELAY_MS = 120;
const ROW_STAGGER_MS = 80;
const LIBRARY_CARD_DELAY_MS = 800;
const PROPOSAL_CHIP_DELAY_MS = 900;
const SUBTOTAL_DELAY_MS = 1000;
const CIRCLE_DELAY_MS = 1100;
const CIRCLE_DRAW_MS = 700;
const MARGIN_NOTE_DELAY_MS = 1700;
const MARGIN_NOTE_FADE_MS = 200;

type EstimateRow = {
  readonly item: string;
  readonly qty: string;
  readonly rate: number;
  readonly amount: number;
};

/* Real kitchen fit-out content; every amount is qty × rate, and the subtotal
   is computed from the rows on screen so the document always adds up. */
const ESTIMATE_ROWS: readonly EstimateRow[] = [
  { item: "Demolition & site protection", qty: "1", rate: 54_600, amount: 54_600 },
  { item: "Cabinetry, base & wall units", qty: "12 lm", rate: 18_500, amount: 222_000 },
  { item: "Counter top, quartz", qty: "6.4 sqm", rate: 9_800, amount: 62_720 },
  { item: "Lighting rough-in", qty: "6", rate: 7_800, amount: 46_800 },
  { item: "Painter day rate", qty: "7", rate: 2_400, amount: 16_800 },
];

const PROJECT_TREE = ["Kitchen", "Bathroom", "Project-wide"] as const;
const ACTIVE_TREE_NODE = "Kitchen";

function formatPeso(value: number): string {
  return `₱${value.toLocaleString("en-PH")}`;
}

export function HeroEstimateArtifact({ compact = false }: { compact?: boolean }) {
  const subtotalRef = useRef<HTMLSpanElement | null>(null);
  const rows = compact ? ESTIMATE_ROWS.slice(0, 4) : ESTIMATE_ROWS;
  const subtotal = rows.reduce((sum, row) => sum + row.amount, 0);

  useEffect(() => {
    const target = subtotalRef.current;
    if (!target) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let annotation: ReturnType<typeof annotate> | null = null;
    let timer: number | undefined;

    const clearAnnotation = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
      annotation?.remove();
      annotation = null;
    };

    const annotateIfVisible = () => {
      /* Never annotate the same node twice. */
      if (annotation) {
        return;
      }

      /* The hero renders a desktop and a compact copy of this artifact and
         hides one with CSS. Annotating the zero-rect hidden copy would paint
         a stray mark at the page origin, so only the visible instance gets
         the circle. */
      if (typeof target.getClientRects === "function" && target.getClientRects().length === 0) {
        return;
      }

      const created = annotate(target, {
        type: "circle",
        color: ARTIFACT_ANNOTATION_COLOR,
        strokeWidth: 2,
        /* Tight vertical, looser horizontal — hugs the 17px subtotal figure. */
        padding: [4, 8],
        iterations: 2,
        animationDuration: prefersReducedMotion ? 0 : CIRCLE_DRAW_MS,
        animate: !prefersReducedMotion,
      });
      annotation = created;
      timer = window.setTimeout(
        () => created.show(),
        prefersReducedMotion ? 0 : CIRCLE_DELAY_MS,
      );
    };

    annotateIfVisible();

    /* When the lg breakpoint flips, the previously hidden instance becomes
       the visible one (and vice versa): drop any stale mark on this instance,
       then re-check visibility so the newly visible copy draws its circle. */
    const breakpoint = window.matchMedia("(min-width: 1024px)");
    const handleBreakpointFlip = () => {
      clearAnnotation();
      annotateIfVisible();
    };
    if (typeof breakpoint.addEventListener === "function") {
      breakpoint.addEventListener("change", handleBreakpointFlip);
    }

    return () => {
      if (typeof breakpoint.removeEventListener === "function") {
        breakpoint.removeEventListener("change", handleBreakpointFlip);
      }
      clearAnnotation();
    };
  }, []);

  return (
    <figure
      data-testid="landing-hero-estimate-artifact"
      className={`relative ${compact ? "pb-9" : "pb-10 pr-9"}`}
    >
      <figcaption className="sr-only">
        {compact
          ? "A sample Archestimator estimate: a kitchen fit-out project with grouped line items and a client-ready proposal preview."
          : "A sample Archestimator estimate: a kitchen fit-out project with grouped line items, a reusable component being added from the library, and a client-ready proposal preview."}
      </figcaption>

      {/* Paper mat */}
      <div className={`rounded-[3px] border border-line-2 bg-paper-2 ${compact ? "p-2.5" : "p-3.5"}`}>
        {/* Document sheet — capped so internal type density reads right */}
        <div className="max-w-[720px] rounded-[3px] border border-line-1 bg-paper-0">
          {/* Sheet title block — .landing-num is intentional drawing-sheet mono */}
          <div className="rounded-t-[3px] border-b border-line-1 bg-paper-1 px-3.5 py-2">
            <span className="landing-num block truncate text-[11px] text-ink-3">
              Estimate — Kitchen fit-out — Rev B
            </span>
          </div>

          {compact ? (
            /* Collapsed project tree: horizontal chip row */
            <ul className="flex flex-wrap gap-1.5 border-b border-line-1 px-3 py-2" aria-label="Sample project areas">
              {PROJECT_TREE.map((node) => (
                <li key={node}>
                  <span
                    aria-current={node === ACTIVE_TREE_NODE ? "true" : undefined}
                    className={`inline-block rounded-[3px] border px-2 py-0.5 text-[11px] leading-4 ${
                      node === ACTIVE_TREE_NODE
                        ? "border-line-2 bg-paper-1 font-medium text-brand-clay"
                        : "border-line-1 text-ink-2"
                    }`}
                  >
                    {node}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex">
            {!compact ? (
              /* Mini project tree rail */
              <div className="w-[30%] min-w-[122px] border-r border-line-1">
                <p className="px-3.5 pb-1 pt-3 text-[11px] text-ink-3">Project</p>
                <ul className="text-[12.5px] leading-5" aria-label="Sample project areas">
                  {PROJECT_TREE.map((node) => (
                    <li key={node} className="border-b border-line-1 last:border-b-0">
                      <span
                        aria-current={node === ACTIVE_TREE_NODE ? "true" : undefined}
                        className={`block px-3.5 py-2 ${
                          node === ACTIVE_TREE_NODE
                            ? "bg-paper-1 font-medium text-brand-clay"
                            : "text-ink-2"
                        }`}
                      >
                        {node}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Estimate table */}
            <div className={`min-w-0 flex-1 ${compact ? "pb-7" : "pb-8"}`}>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line-1 text-[12px] text-ink-3">
                    <th scope="col" className={`py-2 font-medium ${compact ? "px-2.5" : "px-3.5"}`}>
                      Item
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">
                      Qty
                    </th>
                    <th scope="col" className="px-2 py-2 text-right font-medium">
                      Rate
                    </th>
                    <th scope="col" className={`py-2 text-right font-medium ${compact ? "px-2.5" : "px-3.5"}`}>
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.item}
                      className="landing-artifact-row-in border-b border-line-1 last:border-b-0"
                      style={{ animationDelay: `${ROW_BASE_DELAY_MS + index * ROW_STAGGER_MS}ms` }}
                    >
                      <td className={`py-2 text-[12.5px] leading-4 text-ink-1 ${compact ? "px-2.5" : "px-3.5"}`}>
                        {row.item}
                      </td>
                      <td className="landing-num whitespace-nowrap px-2 py-2 text-right text-[12px] text-ink-1">
                        {row.qty}
                      </td>
                      <td className="landing-num whitespace-nowrap px-2 py-2 text-right text-[12px] text-ink-1">
                        {formatPeso(row.rate)}
                      </td>
                      <td
                        className={`landing-num whitespace-nowrap py-2 text-right text-[12px] text-ink-1 ${compact ? "px-2.5" : "px-3.5"}`}
                      >
                        {formatPeso(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr
                    className="landing-artifact-fade-in border-t border-line-2"
                    style={{ animationDelay: `${SUBTOTAL_DELAY_MS}ms` }}
                  >
                    <th
                      scope="row"
                      colSpan={3}
                      className={`py-2.5 text-left text-[12px] font-semibold text-ink-1 ${compact ? "px-2.5" : "px-3.5"}`}
                    >
                      Kitchen subtotal
                    </th>
                    {/* The focal number of the whole hero — the circled climax */}
                    <td
                      className={`landing-num whitespace-nowrap py-2.5 text-right text-[17px] font-semibold text-ink-1 ${compact ? "px-2.5" : "px-3.5"}`}
                    >
                      <span ref={subtotalRef} className="relative inline-block">
                        {formatPeso(subtotal)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

      {!compact ? (
        /* Library card, clearly breaking the sheet's right frame edge */
        <div
          className="landing-artifact-fade-in absolute -right-6 bottom-4 w-[190px] rounded-[3px] border border-line-2 bg-paper-1 px-3 py-2.5"
          style={{ animationDelay: `${LIBRARY_CARD_DELAY_MS}ms` }}
        >
          <p className="text-[12px] font-medium leading-4 text-ink-1">Painter day rate</p>
          <p className="mt-1 text-[11px] leading-4 text-ink-3">From your library — drag into Kitchen</p>
        </div>
      ) : null}

      {/* Proposal preview chip, straddling the mat's bottom-left corner */}
      <div
        className="landing-artifact-fade-in absolute -left-2 bottom-6 flex items-center gap-2 rounded-[3px] border border-line-1 bg-paper-1 px-3 py-2"
        style={{ animationDelay: `${PROPOSAL_CHIP_DELAY_MS}ms` }}
      >
        <svg width="11" height="14" viewBox="0 0 11 14" fill="none" aria-hidden="true" className="shrink-0">
          <path d="M1 1h6l3 3v9H1z" fill="var(--paper-0)" stroke="var(--ink-3)" strokeLinejoin="round" />
          <path d="M7 1v3h3" stroke="var(--ink-3)" strokeLinejoin="round" />
          <path d="M3 7h5M3 9.5h5" stroke="var(--line-2)" strokeLinecap="round" />
        </svg>
        <span className="text-[12px] font-medium leading-4 text-ink-2">Proposal preview</span>
      </div>

      {/* Hand-set margin note pointing at the proposal chip */}
      <div
        className="landing-artifact-fade-in absolute bottom-[30px] left-[150px] flex items-start gap-1"
        style={{
          animationDelay: `${MARGIN_NOTE_DELAY_MS}ms`,
          animationDuration: `${MARGIN_NOTE_FADE_MS}ms`,
        }}
      >
        <svg width="30" height="24" viewBox="0 0 30 24" fill="none" aria-hidden="true" className="mt-1.5">
          {/* Two rough strokes: a wavering shaft and a loose arrowhead */}
          <path
            d="M27.5 3.2c-4.6 4.1-8.2 8.9-15.7 13.4-2.2 1.3-4.4 2.1-6.9 2.6"
            stroke="var(--linework-clay)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M9.8 14.6l-5.3 4.8 7 .4"
            stroke="var(--linework-clay)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="-rotate-2 text-[11px] italic leading-4 text-ink-3">clients see this</span>
      </div>
    </figure>
  );
}
