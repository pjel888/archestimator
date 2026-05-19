import { CtaLink } from "./CtaLink";
import { workshopHref } from "./constants";

export function SectionIntro({ eyebrow, title, body }: { eyebrow?: string; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-[900px] text-center">
      {eyebrow ? <p className="mb-5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b7b78]">{eyebrow}</p> : null}
      <h2 className="text-[48px] font-normal leading-none tracking-[-0.055em] text-[#111111] sm:text-[64px]">{title}</h2>
      <p className="mx-auto mt-5 max-w-[650px] text-[18px] leading-[1.45] tracking-[-0.02em] text-[#313130]">{body}</p>
      <div className="mt-7 flex justify-center gap-3">
        <CtaLink href={workshopHref}>Start free trial</CtaLink>
        <CtaLink href="#demo" variant="secondary">View demo</CtaLink>
      </div>
    </div>
  );
}
