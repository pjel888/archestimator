"use client";

import Link from 'next/link'
import dynamic from "next/dynamic";
import { featuresHref, requestAccessHref } from './constants'
import { trackConversion } from "@/lib/ab-testing/experiment-tracker";

const trustBadges = ['Estimate', 'Revise', 'Propose']

const NeatWireframeBackground = dynamic(() =>
  import("./NeatWireframeBackground").then((module) => module.NeatWireframeBackground),
  {
    loading: () => null,
    ssr: false,
  },
);

export const heroCopyVariants = [
  {
    id: 'connected-workflow',
    headline: 'Quote logic your buyer can trust.',
    support:
      'Build estimates, track revisions, and hand off proposals with the math attached.',
    evidenceGate: 'Workflow preview',
  },
  {
    id: 'review-ready-quotes',
    headline: 'From estimate to proposal, keep the math attached.',
    support:
      'Structure quantities, supplier context, assumptions, and proposal notes in one record.',
    evidenceGate: 'Workflow preview',
  },
] as const

export function HeroSection({ variant = "A" }: { variant?: "A" | "B" }) {
  const activeHeroCopy = variant === "B" ? heroCopyVariants[1] : heroCopyVariants[0];
  return (
    <section className='relative w-full bg-[#eeeeec] px-6 pb-12'>
      <div className='relative min-h-[calc(100svh-92px)] w-full overflow-hidden rounded-[6px] bg-[#e95d1a] text-white shadow-[0_1px_0_rgba(17,17,17,0.08)]'>
        <div
          className='absolute inset-0 bg-[radial-gradient(ellipse_at_18%_24%,rgba(255,127,45,0.92)_0_18%,transparent_48%),radial-gradient(ellipse_at_72%_18%,rgba(220,54,37,0.68)_0_18%,transparent_46%),radial-gradient(ellipse_at_58%_78%,rgba(126,35,19,0.48)_0_22%,transparent_54%),linear-gradient(128deg,#ff7a1a_0%,#ed5d24_34%,#d8462c_68%,#9f2d1f_100%)]'
          aria-hidden='true'
        />
        <div
          className='absolute inset-0 bg-[radial-gradient(circle_at_88%_52%,rgba(255,132,54,0.13)_0_7%,transparent_28%),radial-gradient(circle_at_35%_68%,rgba(255,143,63,0.2)_0_18%,transparent_48%)] blur-2xl'
          aria-hidden='true'
        />
        <div
          className='absolute inset-0 opacity-70 mix-blend-normal'
          aria-hidden='true'
        >
          <NeatWireframeBackground />
        </div>
        <div
          className='absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,rgba(111,41,0,0.32)_0_14%,transparent_42%),linear-gradient(90deg,rgba(84,23,12,0.32),transparent_50%),linear-gradient(0deg,rgba(84,23,12,0.22),transparent_44%)]'
          aria-hidden='true'
        />

        <div className='relative z-10 flex min-h-[calc(100svh-92px)] flex-col px-6 py-9 sm:px-10 lg:px-12 lg:py-12'>
          <div className='flex items-center gap-3 text-[11px] font-semibold uppercase tracking-normal text-white/90'>
            <span>Estimates to proposals</span>
            <span className='h-px w-12 bg-white/45' aria-hidden='true' />
            <span className='hidden text-white/75 sm:inline'>
              Cost logic first
            </span>
          </div>

          <div className='mt-7 max-w-[780px]'>
            <h1 className='max-w-[760px] text-[43px] font-medium leading-[1.02] tracking-normal text-white sm:text-[70px] sm:leading-[0.98] lg:text-[86px] xl:text-[96px]'>
              {activeHeroCopy.headline}
            </h1>

            <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
              <Link
                href={requestAccessHref}
                onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "hero", target: "request_access", variant })}
                className='inline-flex min-h-9 items-center justify-center rounded-[5px] bg-white px-4 text-[10px] font-bold uppercase tracking-normal text-[#17181c] shadow-[0_12px_30px_rgba(111,41,0,0.12)] transition hover:translate-y-[-1px] hover:bg-[#fff7ef]'
              >
                Request access
              </Link>
              <Link
                href={featuresHref}
                onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "hero", target: "feature_status", variant })}
                className='inline-flex min-h-9 items-center justify-center rounded-[5px] border border-white/40 px-4 text-[10px] font-bold uppercase tracking-normal text-white transition hover:translate-y-[-1px] hover:border-white/70 hover:bg-white/10'
              >
                View product direction
              </Link>
            </div>
          </div>

          <div className='mt-auto pt-10'>
            <p className='max-w-[500px] text-[15px] font-normal leading-[1.45] tracking-normal text-white/92 sm:text-[16px]'>
              {activeHeroCopy.support}
            </p>
            <br />
            <div className='mt-7 flex flex-wrap gap-2'>
              {trustBadges.map((badge) => (
                <span
                  key={badge}
                  className='inline-flex min-h-8 items-center justify-center rounded-[5px] border border-white/36 px-3 text-[10px] font-bold leading-none tracking-normal text-white/88 backdrop-blur-sm'
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
