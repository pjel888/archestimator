import Link from 'next/link'
import { NeatWireframeBackground } from './NeatWireframeBackground'
import { loginHref } from './constants'

const trustBadges = ['Reusable catalog', 'Quote-ready', 'Document-aware']

export const heroCopyVariants = [
  {
    id: 'smart-way',
    headline: 'Only the smart ones create quotes this way.',
    support:
      'Move from item selection to proposal handoff without losing supplier details, assumptions, or revision context.',
    evidenceGate: 'Can test now',
  },
  {
    id: 'competitive-pressure',
    headline: 'Your competitors are already a step ahead.',
    support:
      'Build quote logic faster without letting the proposal drift away from the details buyers need to review.',
    evidenceGate: 'Can test now',
  },
] as const

const activeHeroCopy = heroCopyVariants[0]

export function HeroSection() {
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

        <div className='relative z-10 flex min-h-[calc(100svh-92px)] flex-col px-12 py-9 lg:py-12'>
          <div className='flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.055em] text-white/90'>
            <span>Built for teams that create quotes, estimates, and proposals</span>
            <span className='h-px w-12 bg-white/45' aria-hidden='true' />
            <span className='hidden text-white/75 sm:inline'>
              Quotes · Estimates · Proposals
            </span>
          </div>

          <div className='mt-7 max-w-[780px]'>
            <h1 className='max-w-[760px] text-[56px] font-medium leading-[0.98] tracking-[-0.038em] text-white sm:text-[70px] lg:text-[86px] xl:text-[96px]'>
              {activeHeroCopy.headline}
            </h1>

            <Link
              href={loginHref}
              className='mt-8 inline-flex min-h-9 items-center justify-center rounded-[5px] bg-white px-4 text-[10px] font-bold uppercase tracking-[0.02em] text-[#17181c] shadow-[0_12px_30px_rgba(111,41,0,0.12)] transition hover:translate-y-[-1px] hover:bg-[#fff7ef]'
            >
              See the workspace
            </Link>
          </div>

          <div className='mt-auto pt-10'>
            <p className='max-w-[500px] text-[15px] font-normal leading-[1.45] tracking-[-0.006em] text-white/92 sm:text-[16px]'>
              {activeHeroCopy.support}
            </p>
            <br />
            <p>This is the Archestimator way.</p>
            <div className='mt-7 flex flex-wrap gap-3'>
              {trustBadges.map((badge) => (
                <span
                  key={badge}
                  className='inline-flex h-[52px] min-w-[52px] items-center justify-center rounded-full border border-white/55 px-3 text-center text-[9px] font-bold uppercase leading-[1.05] tracking-[0.04em] text-white/88 backdrop-blur-sm'
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
