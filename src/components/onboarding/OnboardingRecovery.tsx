"use client";

import Link from "next/link";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import {
  onboardingSupportContextHref,
  type OnboardingSupportContext,
} from "@/lib/onboarding/support-context";
import { OnboardingBrandVisual } from "./OnboardingBrandVisual";

export function OnboardingRecovery({
  message,
  onRetry,
  onSkip,
  onExit,
  supportContext,
}: {
  message: string;
  onRetry?: () => void;
  onSkip?: () => void;
  onExit: () => void;
  supportContext: OnboardingSupportContext;
}) {
  const titleId = useId();
  const messageId = useId();
  return (
    <section
      role="alert"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      className="pointer-events-auto fixed bottom-4 left-1/2 z-[901] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[1.25rem] border border-[#1b2b44]/15 bg-white text-ink shadow-[0_24px_60px_-26px_rgba(17,31,50,0.5)]"
    >
      <OnboardingBrandVisual className="h-16">
        <p className="px-4 pt-3 text-[9px] font-medium uppercase tracking-[0.16em] text-white/80">
          Your guided build
        </p>
      </OnboardingBrandVisual>
      <div className="p-4">
        <h2 id={titleId} className="text-[13px] font-semibold">Guidance paused</h2>
        <p id={messageId} className="mt-1 text-[10px] leading-5 text-secondary">{message}</p>
        <div className="mt-4 flex flex-wrap gap-2">
        {onRetry ? (
          <Button className="rounded-full px-3" variant="brand" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        {onSkip ? (
          <Button className="rounded-full px-3" variant="secondary" size="sm" onClick={onSkip}>
            Skip this step
          </Button>
        ) : null}
        <Button className="rounded-full px-2" variant="ghost" size="sm" onClick={onExit}>
          Stop guide
        </Button>
        <Link
          href={onboardingSupportContextHref(supportContext)}
          className="inline-flex min-h-8 items-center rounded-full px-2 text-[10px] font-medium text-secondary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Contact Support
        </Link>
        </div>
      </div>
    </section>
  );
}
