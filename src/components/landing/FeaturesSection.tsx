import { PlaceholderMedia } from "./PlaceholderMedia";
import { SectionIntro } from "./SectionIntro";

const featureBlocks = [
  {
    title: "Project-Shaped Estimates",
    body: "Stop forcing real construction work into a flat sheet. Build estimates by lot, structure, level, area, scope, trade, component, and line item.",
    cards: [
      ["Estimate Workspace", "Keep the project tree, estimate sheet, selected area, and running totals visible in one working surface."],
      ["Area-targeted insertion", "Add rows and components to the exact area or scope they belong to instead of cleaning up misplaced lines later."],
      ["Assumptions beside costs", "Keep notes, scope status, and commercial context close to the numbers that depend on them."],
    ],
    reverse: false,
  },
  {
    title: "Component Library",
    body: "Turn repeated assemblies, materials, labor rates, and scope packages into reusable cost components your team can trust and adjust per project.",
    cards: [
      ["Reusable cost components", "Save common estimate logic once, then bring it into the next project without rebuilding it from scratch."],
      ["Project-specific overrides", "Adjust quantities, rates, assumptions, and scope without losing the original library reference."],
      ["Replaceable components", "Swap a row's linked component when the specification changes while keeping the estimate context intact."],
    ],
    reverse: true,
  },
  {
    title: "Traceable Revisions",
    body: "When the project changes, the estimate should show what changed, where it changed, and what that means for the proposal.",
    cards: [
      ["Version history", "Keep estimate versions inside the project so teams are not guessing which spreadsheet is final."],
      ["Change deltas", "Review quantity, rate, scope, and proposal changes as visible differences instead of hidden edits."],
      ["Issued snapshots", "Preserve what was sent to the client so old proposal packages do not silently change later."],
    ],
    reverse: false,
  },
  {
    title: "Proposal Comparisons",
    body: "Compare alternates, revisions, and value-engineering options inside one project, then show the cost difference clearly.",
    cards: [
      ["Multiple estimate sheets", "Keep baseline, revised, and alternate estimates under the same project instead of scattering options across files."],
      ["Visual Cost Breakdowns", "Show clients where the cost moved by area, trade, scope, or revision."],
      ["Proposal-Ready Outputs", "Carry inclusions, exclusions, assumptions, allowances, and commercial terms into client-ready output before export."],
    ],
    reverse: true,
  },
  {
    title: "Industry Standard Export Formats",
    body: "Export estimate sheets and proposal packages to Excel and PDF so the work leaves Archestimator in formats construction teams already know how to review, price, approve, and archive.",
    cards: [
      ["Excel exports", "Move line items, quantities, unit rates, subtotals, and totals into the spreadsheet format estimators and project teams already use."],
      ["PDF proposal packages", "Share client-readable estimate output with the proposal structure, assumptions, inclusions, exclusions, and commercial terms intact."],
      ["Export snapshots", "Tie exported files back to the estimate version so issued work remains traceable after the project changes."],
    ],
    reverse: false,
  },
];

export function FeaturesSection() {
  return (
    <section id="resources" className="bg-white py-20 lg:py-28">
      <div className="w-full px-6">
        <SectionIntro
          title="Features that do real estimating work"
          body="Faster estimates, reusable cost logic, traceable versions, clear proposal options, cost differences that are easier to explain, and Excel/PDF exports teams can actually use."
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
