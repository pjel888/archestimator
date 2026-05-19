import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { workshopHref } from "./constants";

export function FinalCTASection() {
  return (
    <section id="contact" className="bg-[#111111] py-20 text-white lg:py-28">
      <div className="flex w-full flex-col items-start justify-between gap-8 px-6 lg:flex-row lg:items-end">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Start estimating</p>
          <h2 className="mt-4 max-w-[820px] text-[48px] font-normal leading-none tracking-[-0.055em] sm:text-[72px]">
            Build your next estimate the smart way.
          </h2>
        </div>
        <Link
          href={workshopHref}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[4px] bg-white px-4 text-[15px] font-semibold leading-none text-[#111111] transition hover:scale-[1.04] active:scale-95"
        >
          Open workspace <ArrowRight className="size-4" weight="bold" />
        </Link>
      </div>
    </section>
  );
}
