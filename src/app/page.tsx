'use client'

import Image from 'next/image'
import { NeatWireframeBackground } from '@/components/landing/NeatWireframeBackground'
import { ArchestimatorWordmark } from '@/components/brand/ArchestimatorLogo'

export default function TeaserPage() {
  return (
    <main className="relative h-svh w-full overflow-hidden bg-[#e95d1a]">
      {/* Base gradients matching the hero */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_24%,rgba(255,127,45,0.92)_0_18%,transparent_48%),radial-gradient(ellipse_at_72%_18%,rgba(220,54,37,0.68)_0_18%,transparent_46%),radial-gradient(ellipse_at_58%_78%,rgba(126,35,19,0.48)_0_22%,transparent_54%),linear-gradient(128deg,#ff7a1a_0%,#ed5d24_34%,#d8462c_68%,#9f2d1f_100%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_88%_52%,rgba(255,132,54,0.13)_0_7%,transparent_28%),radial-gradient(circle_at_35%_68%,rgba(255,143,63,0.2)_0_18%,transparent_48%)] blur-2xl"
        aria-hidden="true"
      />

      {/* Neat wireframe canvas */}
      <div className="absolute inset-0 opacity-70 mix-blend-normal" aria-hidden="true">
        <NeatWireframeBackground />
      </div>

      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,rgba(111,41,0,0.32)_0_14%,transparent_42%),linear-gradient(90deg,rgba(84,23,12,0.32),transparent_50%),linear-gradient(0deg,rgba(84,23,12,0.22),transparent_44%)]"
        aria-hidden="true"
      />

      {/* Centered content */}
      <div className="relative z-10 flex h-svh w-full flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <Image
            src="/archestimator_logo_white.svg"
            alt="Archestimator"
            width={96}
            height={96}
            className="h-24 w-24"
            priority
          />

          {/* Horizontal line */}
          <div className="h-px w-28 bg-white/80" />

          {/* Wordmark — same font as the marketing landing page */}
          <ArchestimatorWordmark className="text-[17px] text-white/90" />
        </div>
      </div>
    </main>
  )
}
