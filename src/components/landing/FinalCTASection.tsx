import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { MotionReveal } from "./MotionReveal";
import { workshopHref } from "./constants";

export function FinalCTASection() {
  return (
    <section
      id="contact"
      data-landing-snap-section="true"
      className="scroll-mt-[68px] bg-[#eeeeec] px-4 py-20 text-[#111111] sm:px-6 sm:py-28 lg:px-8"
    >
      <div className="mx-auto w-full max-w-[1120px]">
        <MotionReveal>
          <div className="flex flex-col items-start justify-between gap-8 rounded-[14px] border border-[#dedbd6] bg-[#ff7a1a] p-8 text-white shadow-[0_18px_46px_rgba(111,41,0,0.13)] sm:p-10 lg:flex-row lg:items-end">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                Start quoting
              </p>
              <h2 className="mt-4 max-w-[760px] text-[40px] font-normal leading-[1.02] tracking-[-0.052em] sm:text-[62px]">
                Build your next quote with the logic still connected.
              </h2>
            </div>
            <Link
              href={workshopHref}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] bg-white px-4 text-[12px] font-semibold leading-none text-[#111111] transition hover:translate-y-[-1px] hover:bg-[#fff7ef] active:scale-95 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#ff7a1a]"
            >
              Open workspace <ArrowRight className="size-4" weight="bold" />
            </Link>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
