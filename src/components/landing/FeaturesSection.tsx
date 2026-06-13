import { PlaceholderMedia } from "./PlaceholderMedia";
import { SectionIntro } from "./SectionIntro";

const featureBlocks = [
  {
    title: "Structured Estimate Tabs",
    body: "Stop forcing itemized sales and estimating work into a flat spreadsheet. Build estimates around scope, package, location, supplier, component, and line item.",
    cards: [
      ["Estimate Workspace", "Keep the estimate structure, active tab, selected scope, line items, and running totals visible in one working surface."],
      ["Scope-targeted insertion", "Add rows and catalog items to the exact package, room, area, or sales scope they belong to instead of cleaning up misplaced lines later."],
      ["Assumptions beside prices", "Keep notes, scope status, and commercial context close to the numbers that depend on them."],
    ],
    reverse: false,
  },
  {
    title: "Reusable Catalog",
    body: "Turn repeated products, assemblies, labor rates, services, and scope packages into reusable catalog items your team can trust and adjust per quote.",
    cards: [
      ["Reusable line items", "Save common quote logic once, then bring it into the next offer without rebuilding it from scratch."],
      ["Quote-specific overrides", "Adjust quantities, rates, assumptions, and scope without losing the original catalog reference."],
      ["Replaceable components", "Swap a row's linked component when the specification changes while keeping the estimate context intact."],
    ],
    reverse: true,
  },
  {
    title: "Traceable Revisions",
    body: "When the scope, supplier, or requested package changes, the quote should show what changed, where it changed, and what that means for the proposal.",
    cards: [
      ["Activity history", "Keep quote changes inside the workspace so teams are not guessing which spreadsheet is final."],
      ["Change context", "Review quantity, price, scope, supplier, and proposal changes as visible differences instead of hidden edits."],
      ["Issued snapshots", "Future issued-output work should preserve what was sent so old proposal packages do not silently change later."],
    ],
    reverse: false,
  },
  {
    title: "Proposal Comparisons",
    body: "Compare alternates, revisions, supplier packages, and value options inside one workspace, then show the price difference clearly.",
    cards: [
      ["Multiple estimate tabs", "Keep baseline, revised, and alternate estimate tabs under the same workspace instead of scattering options across files."],
      ["Visual Cost Breakdowns", "Show buyers or clients where the price moved by area, category, supplier, scope, or revision."],
      ["Proposal-Ready Outputs", "Carry inclusions, exclusions, assumptions, allowances, and commercial terms toward client-ready output before export."],
    ],
    reverse: true,
  },
  {
    title: "Spreadsheet And Document Handoff",
    body: "Prepare estimates and proposal packages for Excel and document handoff so buyers, clients, and internal reviewers can review, approve, and archive the work.",
    cards: [
      ["Excel handoff", "Move line items, quantities, unit rates, subtotals, and totals into the spreadsheet format teams already use."],
      ["Document packages", "Future document packages should preserve the proposal structure, assumptions, inclusions, exclusions, and commercial terms."],
      ["Export snapshots", "Future issued-output work should tie exported files back to the quote version so issued work remains traceable after changes."],
    ],
    reverse: false,
  },
];

export function FeaturesSection() {
  return (
    <section id="resources" className="bg-white py-20 lg:py-28">
      <div className="w-full px-6">
        <SectionIntro
          title="Features that do real quote work"
          body="Faster quote setup, reusable catalog logic, traceable changes, clear proposal options, cost differences that are easier to explain, and handoff paths teams can actually use."
        />
        <div className="mt-16 grid gap-14">
          {featureBlocks.map((block) => (
            <div
              key={block.title}
              className="grid gap-8 lg:grid-cols-2 lg:items-center"
            >
              <PlaceholderMedia label={`${block.title} image placeholder`} className={`min-h-[420px] ${block.reverse ? "lg:order-2" : ""}`} />
              <article>
                <h3 className="text-[44px] font-normal leading-none tracking-[-0.055em]">{block.title}</h3>
                <p className="mt-5 text-[18px] leading-[1.45] tracking-[-0.02em] text-[#313130]">{block.body}</p>
                <div className="mt-8 grid gap-3">
                  {block.cards.map(([cardTitle, cardBody]) => (
                    <div key={cardTitle} className="rounded-[8px] border border-[#dedbd6] bg-[#faf9f6] p-4">
                      <h4 className="flex items-center justify-between text-[20px] font-normal tracking-[-0.03em]">
                        <span>{cardTitle}</span>
                        <span aria-hidden="true" className="text-[#7b7b78]">
                          +
                        </span>
                      </h4>
                      <p className="mt-2 text-[14px] leading-[1.45] text-[#626260]">
                        {cardBody}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
