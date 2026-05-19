import { PlaceholderMedia } from "./PlaceholderMedia";
import { SectionIntro } from "./SectionIntro";

const partnerCards = [
  ["The company you can trust", "Built for contractors who need transparent assumptions, editable data, and proposal-grade traceability."],
  ["Expert support, at every stage", "From setup to revision workflows, the product is shaped around how estimates become real project commitments."],
  ["The estimating blueprint", "A repeatable path from project setup to hierarchy, cost library, revision review, and client-ready proposal issue."],
];

export function PartnerSection() {
  return (
    <section id="about" className="bg-white py-20 lg:py-28">
      <div className="w-full px-6">
        <SectionIntro
          title="A true partner with deep estimating expertise"
          body="We partner with construction teams to set up repeatable estimate workflows, component libraries, proposal structures, and revision practices that protect margin and client trust."
        />
        <div className="mt-16 grid gap-4 lg:grid-cols-3">
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
