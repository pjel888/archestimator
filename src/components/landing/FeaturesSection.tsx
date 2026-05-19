import { PlaceholderMedia } from "./PlaceholderMedia";
import { SectionIntro } from "./SectionIntro";

const helpdeskBlocks = [
  {
    title: "Resolve estimate questions faster",
    body: "Keep the selected lot, structure, floor, area, row items, and cost components visible so estimators do not lose context while pricing work.",
    cards: ["Context-aware rows", "Component replacement", "Area-targeted insertion"],
    reverse: false,
  },
  {
    title: "Deliver tailored proposals across every project type",
    body: "Translate estimate detail into client-ready packages with structured scope, assumptions, exclusions, allowances, and proposal sections.",
    cards: ["Proposal sections", "Commercial terms", "Frozen snapshots"],
    reverse: true,
  },
  {
    title: "Engage the client at the right moment",
    body: "Use versions, deltas, notes, and issued files to show what changed before a design revision becomes a client decision.",
    cards: ["Revision deltas", "Export history", "Client package status"],
    reverse: false,
  },
  {
    title: "Monitor and improve every estimate",
    body: "Surface pricing confidence, stale supplier assumptions, unassigned rows, and risky scope statuses before they become proposal mistakes.",
    cards: ["Cost confidence", "Source notes", "Risk review"],
    reverse: true,
  },
];

export function FeaturesSection() {
  return (
    <section id="resources" className="bg-white py-20 lg:py-28">
      <div className="w-full px-6">
        <SectionIntro
          title="A fully-featured proposal-powered estimate system"
          body="Archestimator has the core surfaces contractors need to price work faster, manage reusable costs, engage clients clearly, and continuously improve proposal quality."
        />
        <div className="mt-16 grid gap-14">
          {helpdeskBlocks.map((block) => (
            <div
              key={block.title}
              className={`grid gap-8 lg:grid-cols-2 lg:items-center ${block.reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
            >
              <PlaceholderMedia label={`${block.title} image placeholder`} className="min-h-[420px]" />
              <article>
                <h3 className="text-[44px] font-normal leading-none tracking-[-0.055em]">{block.title}</h3>
                <p className="mt-5 text-[18px] leading-[1.45] tracking-[-0.02em] text-[#313130]">{block.body}</p>
                <div className="mt-8 grid gap-3">
                  {block.cards.map((card) => (
                    <div key={card} className="rounded-[8px] border border-[#dedbd6] bg-[#faf9f6] p-4">
                      <h4 className="flex items-center justify-between text-[20px] font-normal tracking-[-0.03em]">
                        <span>{card}</span>
                        <span aria-hidden="true" className="text-[#7b7b78]">
                          +
                        </span>
                      </h4>
                      <p className="mt-2 text-[14px] leading-[1.45] text-[#626260]">
                        Placeholder feature detail following Intercom&apos;s compact expandable-card pattern.
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
