"use client";

import Link from 'next/link'
import Image from "next/image";
import dynamic from "next/dynamic";
import { loginHref } from './constants'
import { trackConversion } from "@/lib/ab-testing/experiment-tracker";

const NeatWireframeBackground = dynamic(() =>
  import("./NeatWireframeBackground").then((module) => module.NeatWireframeBackground),
  {
    loading: () => null,
    ssr: false,
  },
);

const heroVisualSlides = [
  {
    src: "/landing/hero-slides/construction-slide-01.jpg",
    alt: "Frosted commercial construction site with crane",
    motion: "landing-hero-slide-motion-a",
  },
  {
    src: "/landing/hero-slides/construction-slide-02.jpg",
    alt: "Frosted structural construction site with cranes",
    motion: "landing-hero-slide-motion-b",
  },
  {
    src: "/landing/hero-slides/construction-slide-03.jpg",
    alt: "Frosted interior framing construction preview",
    motion: "landing-hero-slide-motion-c",
  },
  {
    src: "/landing/hero-slides/construction-slide-04.jpg",
    alt: "Frosted rebar and construction drawings preview",
    motion: "landing-hero-slide-motion-d",
  },
  {
    src: "/landing/hero-slides/construction-slide-05.jpg",
    alt: "Frosted residential framing and materials preview",
    motion: "landing-hero-slide-motion-e",
  },
  {
    src: "/landing/hero-slides/construction-slide-06.jpg",
    alt: "Frosted architectural estimating desk preview",
    motion: "landing-hero-slide-motion-f",
  },
  {
    src: "/landing/hero-slides/construction-slide-07.jpg",
    alt: "Frosted facade installation construction preview",
    motion: "landing-hero-slide-motion-g",
  },
  {
    src: "/landing/hero-slides/construction-slide-08.jpg",
    alt: "Frosted renovation corridor construction preview",
    motion: "landing-hero-slide-motion-h",
  },
  {
    src: "/landing/hero-slides/construction-slide-09.jpg",
    alt: "Frosted site office and proposal package preview",
    motion: "landing-hero-slide-motion-i",
  },
] as const;

const heroDiagramSteps = [
  {
    number: "01",
    label: "Build",
    detail: "Scope map",
  },
  {
    number: "02",
    label: "Estimate",
    detail: "Rate logic",
  },
  {
    number: "03",
    label: "Propose",
    detail: "Handoff",
  },
] as const;

const heroSignalItems = [
  "Site scope",
  "Supplier pricing",
  "Labor logic",
  "Assumptions",
  "Proposal package",
  "Change control",
] as const;

export const heroCopyVariants = [
  {
    id: 'connected-workflow',
    headline: 'The proposal workspace for construction estimates.',
    support:
      'Keep scope, rates, assumptions, and closed-beta revisions connected before handoff.',
    evidenceGate: 'Closed beta preview',
  },
  {
    id: 'review-ready-quotes',
    headline: 'A calmer platform for estimate handoff.',
    support:
      'Keep quote sheets, supplier context, and buyer-ready outputs aligned during closed-beta review.',
    evidenceGate: 'Closed beta preview',
  },
] as const

export function HeroSection({ variant = "A" }: { variant?: "A" | "B" }) {
  const activeHeroCopy = variant === "B" ? heroCopyVariants[1] : heroCopyVariants[0];
  return (
    <section className='relative isolate w-full overflow-hidden bg-[#fffdf9] px-6 pb-14 pt-20 text-[#171514] sm:px-8 lg:px-12 lg:pb-24 lg:pt-[150px]'>
      <div
        className='pointer-events-none absolute inset-x-0 top-24 h-[620px] bg-[linear-gradient(112deg,rgba(255,253,249,0)_0%,rgba(255,253,249,0.84)_32%,rgba(190,91,45,0.24)_68%,rgba(134,55,28,0.34)_100%)]'
        aria-hidden='true'
      />
      <div
        className='pointer-events-none absolute right-[-12vw] top-10 h-[640px] w-[82vw] max-w-[1180px] bg-[radial-gradient(ellipse_at_55%_38%,rgba(199,93,42,0.42),transparent_58%),linear-gradient(135deg,rgba(255,180,104,0.2),rgba(146,58,31,0.28)_58%,transparent)] blur-3xl'
        aria-hidden='true'
      />
      <div
        className='landing-hero-plus-grid pointer-events-none absolute right-[-10vw] top-20 h-[620px] w-[86vw] max-w-[1280px]'
        aria-hidden='true'
      />

      <div className='relative z-10 grid w-full gap-12 lg:grid-cols-[minmax(0,635px)_minmax(0,1fr)] lg:items-start'>
        <div
          data-testid='landing-hero-copy-block'
          className='flex max-w-[635px] flex-col lg:h-[603px] lg:justify-between lg:border-l lg:border-[#d6cec5] lg:pl-7'
        >
          <div>
            <p className='max-w-[440px] text-[13px] font-medium leading-6 text-[#6b5f55]'>
              Built for the teams turning site scope, supplier pricing, and revision pressure into proposal-ready decisions.
            </p>

            <h1 className='mt-7 text-[38px] font-normal leading-[1.06] tracking-normal text-[#171514] text-balance sm:mt-8 sm:text-[48px] sm:leading-[1.05] lg:text-[54px]'>
              {activeHeroCopy.headline}
            </h1>
          </div>

          <div className='mt-8 lg:mt-10'>
            <p className='max-w-[420px] border-l border-[#d9d1c8] pl-5 text-[15px] font-normal leading-6 text-[#473f39] text-pretty sm:text-[17px] sm:leading-7 lg:border-l-0 lg:pl-0'>
              {activeHeroCopy.support}
            </p>

            <div className='mt-7 flex flex-row flex-wrap gap-3'>
              <Link
                href="/contact"
                onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "hero", target: "book_walkthrough", variant })}
                className='inline-flex min-h-10 items-center justify-center rounded-[6px] bg-[#a9532d] px-4 text-[12px] font-semibold text-white transition hover:bg-[#8f4728] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b65f2f] focus-visible:ring-offset-2 sm:min-h-11 sm:px-5 sm:text-[13px]'
              >
                Book a walkthrough
              </Link>
              <Link
                href={loginHref}
                onClick={() => trackConversion("hero-cta-copy", "cta_click", { location: "hero", target: "open_workspace", variant })}
                className='inline-flex min-h-10 items-center justify-center rounded-[6px] bg-white/82 px-4 text-[12px] font-semibold text-[#171514] ring-1 ring-[#ded6cc] transition hover:bg-[#f4f1ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b65f2f] focus-visible:ring-offset-2 sm:min-h-11 sm:px-5 sm:text-[13px]'
              >
                Open workspace
              </Link>
            </div>
          </div>
        </div>

        <div
          data-testid='landing-hero-frosted-visual'
          data-visual-reference='amigo-right-rail'
          className='relative min-h-[320px] overflow-hidden rounded-[24px] bg-[#9f4b29] shadow-[0_18px_44px_rgba(83,51,30,0.14)] sm:min-h-[470px] lg:h-[603px] lg:min-h-0'
        >
          <Image
            src={heroVisualSlides[0].src}
            alt={heroVisualSlides[0].alt}
            fill
            priority
            sizes='(min-width: 1024px) 58vw, 100vw'
            className='landing-hero-slide landing-hero-slide-01 landing-hero-slide-motion-a absolute inset-0 size-full object-cover'
            data-testid='landing-hero-slide'
          />
          {heroVisualSlides.slice(1).map((slide, index) => (
            <Image
              key={slide.src}
              src={slide.src}
              alt=''
              aria-hidden='true'
              fill
              sizes='(min-width: 1024px) 58vw, 100vw'
              className={`landing-hero-slide landing-hero-slide-${String(index + 2).padStart(2, "0")} ${slide.motion} absolute inset-0 size-full object-cover`}
              data-testid='landing-hero-slide'
            />
          ))}
          <div className='absolute inset-0 bg-[linear-gradient(118deg,rgba(255,246,236,0.38),rgba(176,82,40,0.16)_38%,rgba(39,29,23,0.55)),radial-gradient(ellipse_at_28%_18%,rgba(255,168,90,0.5),transparent_46%)]' aria-hidden='true' />
          <div className='absolute inset-0 bg-[#1d1511]/[0.1] backdrop-blur-[1.5px]' aria-hidden='true' />
          <div className='absolute inset-0 opacity-45 mix-blend-screen' aria-hidden='true' data-testid='neat-wireframe-background'>
            <NeatWireframeBackground />
          </div>
          <div className='pointer-events-none absolute inset-0 z-10 hidden sm:block' aria-hidden='true'>
            <div className='absolute left-[7%] right-[7%] top-[42%] flex items-center justify-between'>
              {heroDiagramSteps.map((step, index) => (
                <div key={step.label} className='flex min-w-0 flex-1 items-center last:flex-none'>
                  <div className='landing-hero-diagram-node min-w-[118px] rounded-full border border-white/24 bg-white/[0.13] px-3 py-2 text-white shadow-[0_12px_30px_rgba(36,20,13,0.16)] backdrop-blur-md'>
                    <p className='text-[10px] font-semibold leading-none text-white/62'>{step.number}</p>
                    <p className='mt-1 text-[12px] font-semibold leading-none text-white'>{step.label}</p>
                    <p className='mt-1 text-[10px] font-medium leading-none text-white/62'>{step.detail}</p>
                  </div>
                  {index < heroDiagramSteps.length - 1 ? (
                    <div className='landing-hero-flow-line mx-3 h-px min-w-10 flex-1 bg-white/32' />
                  ) : null}
                </div>
              ))}
            </div>
            <div className='absolute right-[8%] top-[17%] w-[220px] max-w-[34%] text-white/64'>
              {heroSignalItems.map((item, index) => (
                <div
                  key={item}
                  className={`landing-hero-signal-row landing-hero-signal-row-${index + 1} flex items-center gap-2 border-b border-white/10 py-1.5 text-[12px] font-medium leading-none last:border-b-0`}
                >
                  <span className='h-1.5 w-1.5 rounded-full bg-white/46' />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className='absolute left-5 top-5 z-10 inline-flex min-h-8 items-center rounded-full border border-white/35 bg-white/16 px-4 text-[12px] font-semibold text-white backdrop-blur-md'>
            Closed beta workspace preview
          </div>
          <div className='absolute inset-x-0 bottom-0 z-10 grid grid-cols-3 border-t border-white/22 bg-[#56301f]/72 text-white backdrop-blur-sm'>
            {heroDiagramSteps.map(({ number, label, detail }) => (
              <div key={label} className='min-h-16 border-r border-white/22 px-4 py-3 last:border-r-0'>
                <p className='text-[11px] font-semibold leading-none text-white/92'>{number}</p>
                <p className='mt-2 text-[12px] font-semibold leading-none text-white/92'>{label}</p>
                <p className='mt-1 text-[10px] font-medium leading-none text-white/62'>{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
