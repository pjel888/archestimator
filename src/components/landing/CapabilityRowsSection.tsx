import type { ReactNode } from "react";
import { Clock } from "@phosphor-icons/react/dist/ssr";
import { MotionReveal } from "./MotionReveal";

/* ------------------------------------------------------------------ */
/* Row A proof: a grouped estimate sheet on a paper mat.               */
/* Arithmetic is intentional: qty × rate = amount, subtotals add up.   */
/*   Kitchen:  6 × 8,400 = 50,400 · 4.8 × 9,800 = 47,040 → 97,440      */
/*   Bathroom: 22 × 1,850 = 40,700 · 6 × 3,200 = 19,200 → 59,900       */
/*   Sheet:    97,440 + 59,900 = 157,340                               */
/* ------------------------------------------------------------------ */

const estimateSheetGroups = [
  {
    name: "Kitchen",
    subtotal: "₱97,440",
    items: [
      { name: "Base cabinets, laminated", math: "6 lm × ₱8,400", amount: "₱50,400" },
      { name: "Counter top, quartz", math: "4.8 sqm × ₱9,800", amount: "₱47,040" },
    ],
  },
  {
    name: "Bathroom",
    subtotal: "₱59,900",
    items: [
      { name: "Wall tiling, 60×60", math: "22 sqm × ₱1,850", amount: "₱40,700" },
      { name: "Plumbing rough-in", math: "6 pt × ₱3,200", amount: "₱19,200" },
    ],
  },
] as const;

function GroupedSheetProof() {
  return (
    <div aria-hidden="true" className="rounded-[3px] bg-paper-2 p-5 sm:p-8">
      <div className="landing-num inline-block rounded-t-[3px] border border-b-0 border-line-2 bg-paper-0 px-3 py-1.5 text-[11px] text-ink-3">
        Estimate — Floors 1–3 — Rev A
      </div>
      <div className="min-h-[280px] rounded-[3px] rounded-tl-none border border-line-2 bg-paper-0">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 border-b border-line-1 px-4 py-2 text-[11px] text-ink-3 sm:gap-x-6">
          <span>Item</span>
          <span className="landing-num">Qty × Rate</span>
          <span className="landing-num text-right">Amount</span>
        </div>

        {estimateSheetGroups.map((group) => (
          <div key={group.name} className="border-b border-line-1">
            <p className="px-4 pb-1 pt-3 text-[12px] font-medium text-ink-1">{group.name}</p>
            {group.items.map((item) => (
              <div
                key={item.name}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-4 py-1.5 pl-7 pr-4 text-[12px] sm:gap-x-6"
              >
                <span className="truncate text-ink-2">{item.name}</span>
                <span className="landing-num text-[11px] text-ink-3">{item.math}</span>
                <span className="landing-num text-right text-ink-1">{item.amount}</span>
              </div>
            ))}
            <div className="flex items-baseline justify-between border-t border-line-1 py-1.5 pl-7 pr-4">
              <span className="text-[11px] text-ink-3">Subtotal — {group.name}</span>
              <span className="landing-num text-[11px] text-ink-2">{group.subtotal}</span>
            </div>
          </div>
        ))}

        <div className="flex items-baseline justify-between px-4 py-2.5">
          <span className="text-[11px] text-ink-3">Sheet subtotal</span>
          <span className="landing-num text-[12px] text-ink-1">₱157,340</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Row B proof: library cards, one mid-drag toward an estimate sheet.  */
/* Carries the section's single hand-drawn mark: a muted sketch arrow  */
/* plus a margin note.                                                 */
/* ------------------------------------------------------------------ */

function LibraryCard({ name, rate, unit }: { name: string; rate: string; unit: string }) {
  return (
    <div className="rounded-[3px] border border-line-2 bg-paper-1 px-4 py-3">
      <p className="text-[12px] text-ink-1">{name}</p>
      <p className="landing-num mt-0.5 text-[11px] text-ink-2">
        {rate}
        <span className="text-ink-3">{unit}</span>
      </p>
    </div>
  );
}

function LibraryDragProof() {
  return (
    <div aria-hidden="true" className="relative overflow-hidden rounded-[3px] bg-paper-2 p-5 sm:p-8">
      <div className="flex min-h-[264px] items-stretch gap-6 sm:gap-10">
        {/* Library card cluster */}
        <div className="flex w-full max-w-[240px] flex-col justify-center gap-3">
          <p className="landing-num text-[11px] text-ink-3">Component library</p>
          <LibraryCard name="Painter day rate" rate="₱2,400" unit="/day" />
          {/* Slot the dragged card left behind */}
          <div className="rounded-[3px] border border-dashed border-line-2 px-4 py-3">
            <p className="text-[11px] italic text-ink-3">Quartz counter top</p>
            <p className="landing-num mt-0.5 text-[11px] text-ink-3/70">₱9,800/sqm</p>
          </div>
          <LibraryCard name="Lighting rough-in" rate="₱7,800" unit="/point" />
        </div>

        {/* Estimate sheet edge the card is heading for */}
        <div className="ml-auto flex w-[120px] shrink-0 flex-col rounded-[3px] border border-line-2 bg-paper-0 sm:w-[170px]">
          <p className="landing-num truncate border-b border-line-1 px-3 py-2 text-[11px] text-ink-3">
            Estimate — Rev B
          </p>
          <div className="flex flex-1 flex-col gap-2 px-3 py-3">
            <div className="flex items-baseline justify-between gap-2 border-b border-line-1 pb-2 text-[11px]">
              <span className="truncate text-ink-2">Demolition</span>
              <span className="landing-num text-ink-1">₱22,500</span>
            </div>
            <div className="flex items-baseline justify-between gap-2 border-b border-line-1 pb-2 text-[11px]">
              <span className="truncate text-ink-2">Paintwork</span>
              <span className="landing-num text-ink-1">₱18,360</span>
            </div>
            <div className="rounded-[3px] border border-dashed border-line-2 bg-paper-1 px-2 py-2.5" />
          </div>
        </div>
      </div>

      {/* Dragged card, mid-flight, with the sketch arrow + margin note */}
      <div className="absolute left-[26%] top-[40%] flex w-[min(220px,52%)] flex-col sm:left-[30%]">
        <div className="rotate-[2deg] rounded-[3px] border border-line-2 bg-paper-1 px-4 py-3">
          <p className="text-[12px] text-ink-1">Quartz counter top</p>
          <p className="landing-num mt-0.5 text-[11px] text-ink-2">
            ₱9,800<span className="text-ink-3">/sqm</span>
          </p>
        </div>
        <div className="mt-1.5 flex items-start justify-end gap-2 pr-1">
          <p className="max-w-[110px] text-right text-[11px] italic leading-4 text-ink-3">
            reused from last project
          </p>
          <svg
            viewBox="0 0 92 44"
            className="mt-0.5 h-[38px] w-[80px] shrink-0"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 36 C 26 41, 50 34, 71 20 S 84 11, 86 9"
              stroke="var(--linework-clay)"
              strokeWidth="1.7"
              strokeLinecap="round"
              opacity="0.75"
            />
            <path
              d="M74 7.5 L 86.5 8.5 L 80 20"
              stroke="var(--linework-clay)"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.75"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Row C proof: estimate fragment beside the client share view, with   */
/* a planned revision timeline strip underneath.                       */
/* 97,440 + 59,900 + 245,580 = 402,920                                 */
/* ------------------------------------------------------------------ */

const handoffRows = [
  { name: "Cabinetry & counters", amount: "₱97,440" },
  { name: "Tiling & plumbing", amount: "₱59,900" },
  { name: "Appliances & electrical", amount: "₱245,580" },
] as const;

function HandoffProof() {
  return (
    <div aria-hidden="true" className="rounded-[3px] bg-paper-2 p-5 sm:p-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:gap-0">
        {/* Estimate-sheet fragment */}
        <div className="sm:border-r sm:border-line-2 sm:pr-6">
          <p className="landing-num text-[11px] text-ink-3">Estimate — internal</p>
          <div className="mt-3">
            {handoffRows.map((row) => (
              <div
                key={row.name}
                className="flex items-baseline justify-between gap-3 border-b border-line-1 py-2 text-[12px]"
              >
                <span className="truncate text-ink-2">{row.name}</span>
                <span className="landing-num text-ink-1">{row.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Client view fragment */}
        <div className="sm:pl-6">
          <div className="rounded-[3px] border border-line-2 bg-paper-0 p-4">
            <p className="text-[11px] text-ink-3">Client view</p>
            <p className="mt-1 text-[13px] font-medium text-ink-1">Proposal — Kitchen fit-out</p>
            <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-line-1 pt-3">
              <span className="text-[11px] text-ink-3">Total</span>
              <span className="landing-num text-[15px] text-ink-1">₱402,920</span>
            </div>
            <span className="mt-3 inline-flex items-center rounded-[3px] border border-line-2 px-3 py-1.5 text-[11px] font-medium text-ink-2">
              Approve
            </span>
          </div>
        </div>
      </div>

      {/* Revision timeline strip */}
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line-2 pt-4">
        <div className="flex items-center gap-2 text-[11px] text-ink-3">
          <span className="size-[7px] rounded-full border border-line-2 bg-paper-0" />
          <span className="landing-num">Rev A</span>
          <span className="h-px w-5 bg-line-2 sm:w-7" />
          <span className="size-[7px] rounded-full border border-line-2 bg-paper-0" />
          <span className="landing-num">Rev B</span>
          <span className="h-px w-5 bg-line-2 sm:w-7" />
          <span className="size-[7px] rounded-full bg-ink-2" />
          <span className="landing-num text-ink-2">Current</span>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-[3px] border border-line-2 px-2 py-0.5 text-[11px] text-ink-3">
          <Clock size={12} aria-hidden="true" />
          Planned
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Row shell: text 5/12, proof 7/12, alternating sides.                */
/* Mobile stacks proof above text.                                     */
/* ------------------------------------------------------------------ */

function CapabilityRow({
  index,
  label,
  heading,
  body,
  srDescription,
  proof,
  swap = false,
  footnote,
}: {
  index: number;
  label: string;
  heading: string;
  body: string;
  srDescription: string;
  proof: ReactNode;
  swap?: boolean;
  footnote?: ReactNode;
}) {
  return (
    <MotionReveal staggerIndex={index}>
      <div className="mt-16 border-t border-line-1 pt-16 sm:mt-20 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className={`lg:col-span-7 ${swap ? "" : "lg:order-2"}`}>
            {proof}
            <p className="sr-only">{srDescription}</p>
          </div>
          <div className={`lg:col-span-5 ${swap ? "" : "lg:order-1"}`}>
            <p className="text-[12px] font-semibold leading-5 text-ink-3">{label}</p>
            <h3 className="landing-h3 mt-3 text-ink-1 text-balance">{heading}</h3>
            <p className="landing-body mt-4 max-w-[52ch] text-ink-2 text-pretty">{body}</p>
            {footnote}
          </div>
        </div>
      </div>
    </MotionReveal>
  );
}

export function CapabilityRowsSection() {
  return (
    <section
      id="method"
      aria-labelledby="method-heading"
      data-landing-snap-section="true"
      className="scroll-mt-[68px] border-b border-line-1 bg-paper-0 px-6 py-24 sm:px-8 sm:py-32 lg:px-12"
    >
      <div className="mx-auto w-full max-w-[1180px]">
        <MotionReveal>
          <div className="max-w-[820px]">
            <p className="text-[12px] font-semibold leading-5 text-ink-3">
              Built around construction estimate patterns
            </p>
            <h2 id="method-heading" className="landing-headline-lg mt-3 text-ink-1">
              Workflows designed for every estimating specialty.
            </h2>
            <p className="landing-body-lg mt-6 max-w-[68ch] text-ink-2 text-pretty">
              Every team names scope differently. Archestimator gives the quote enough structure to carry rooms, assemblies, supplier context, allowances, and revisions without flattening the work into one brittle spreadsheet.
            </p>
          </div>
        </MotionReveal>

        <CapabilityRow
          index={0}
          label="Project-shaped workflow"
          heading="Structure your proposal the way you think about the work"
          body="Organize costs around the real shape of the engagement, by phase, location, scope, or package, however your team naturally thinks. Archestimator handles the format, so your clients always receive a clean, professional proposal."
          srDescription="Illustration: an estimate sheet grouped by room, with priced line items and subtotals for a kitchen and a bathroom."
          proof={<GroupedSheetProof />}
        />

        <CapabilityRow
          index={1}
          swap
          label="Reusable component library"
          heading="Build it once. Use it everywhere."
          body="Save any component, materials, services, labor, packages, and reuse it across future proposals. Variants included, so every size, spec, and configuration is ready when you need it."
          srDescription="Illustration: saved library components with rates, one card being dragged onto an estimate sheet, annotated 'reused from last project'."
          proof={<LibraryDragProof />}
        />

        <CapabilityRow
          index={2}
          label="Proposal handoff"
          heading="From costing to client-ready in one flow"
          body="Carry your line items, totals, exclusions, and assumptions straight into a polished proposal output, no reformatting, no copy-pasting, no last-minute scrambling."
          srDescription="Illustration: an internal estimate fragment beside the client-facing proposal view it produces, with a planned revision timeline underneath."
          proof={<HandoffProof />}
          footnote={
            <div className="mt-8 border-t border-line-1 pt-5">
              <p className="text-[12px] font-semibold leading-5 text-ink-3">Revision history</p>
              <p className="landing-body mt-2 max-w-[52ch] text-ink-2 text-pretty">
                In progress: every change traceable as the quote matures.
              </p>
            </div>
          }
        />
      </div>
    </section>
  );
}
