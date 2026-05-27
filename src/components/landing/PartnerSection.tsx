import { PlaceholderMedia } from "./PlaceholderMedia";
import { SectionIntro } from "./SectionIntro";

const partnerCards = [
  ["Faster setup", "Start from structured line items and reusable catalog components instead of rebuilding the same quote logic every time."],
  ["Safer revisions", "Keep versions, assumptions, issued files, and change history traceable as the offer moves."],
  ["Clearer buyer decisions", "Use proposal comparisons and visual cost breakdowns to explain what changed and why it matters."],
  ["Cleaner handoff", "Prepare spreadsheet and document handoff for buyers, clients, consultants, and internal reviewers who still expect standard files."],
];

export function PartnerSection() {
  return (
    <section id="about" className="bg-white py-20 lg:py-28">
      <div className="w-full px-6">
        <SectionIntro
          title="What this changes for quote teams"
          body="Archestimator is built around the moments that usually slow quotes down: setup, repeated catalog logic, revisions, option comparison, buyer explanation, and standard-format handoff."
        />
        <div className="mt-16 grid gap-4 lg:grid-cols-4">
          {partnerCards.map(([title, body]) => (
            <article key={title} className="rounded-[8px] border border-[#dedbd6] bg-[#faf9f6] p-6">
              <PlaceholderMedia label="support image" className="mb-6 min-h-[210px]" />
              <h3 className="text-[28px] font-normal leading-none tracking-[-0.045em]">{title}</h3>
              <p className="mt-4 text-[15px] leading-[1.5] text-[#626260]">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
