import { CtaLink } from "./CtaLink";
import { workshopHref } from "./constants";

export function SectionIntro({
  eyebrow,
  title,
  body,
  showActions = false,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  showActions?: boolean;
}) {
  return (
    <div className="mx-auto max-w-[820px] text-center">
      {eyebrow ? (
        <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7b7b78]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-[36px] font-normal leading-[1.02] tracking-[-0.052em] text-[#111111] sm:text-[52px]">
        {title}
      </h2>
      <p className="mx-auto mt-5 max-w-[620px] text-[15px] leading-[1.55] tracking-[-0.015em] text-[#4f4f4d] sm:text-[16px]">
        {body}
      </p>
      {showActions ? (
        <div className="mt-7 flex justify-center gap-3">
          <CtaLink href={workshopHref}>See the workspace</CtaLink>
          <CtaLink href="/features" variant="secondary">
            View product preview
          </CtaLink>
        </div>
      ) : null}
    </div>
  );
}
