"use client";

import Link from "next/link";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import {
  onboardingSupportContextHref,
  type OnboardingSupportContext,
} from "@/lib/onboarding/support-context";

export function OnboardingRecovery({
  message,
  onRetry,
  onSkip,
  onExit,
  supportContext,
}: {
  message: string;
  onRetry: () => void;
  onSkip: () => void;
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
      className="pointer-events-auto fixed bottom-4 left-1/2 z-[901] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xs border border-warningSoft bg-white p-3 text-ink shadow-2xl"
    >
      <h2 id={titleId} className="text-[11px] font-medium">Guidance paused</h2>
      <p id={messageId} className="mt-1 text-[10px] leading-4 text-secondary">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={onRetry}>
          Try again
        </Button>
        <Button variant="secondary" size="sm" onClick={onSkip}>
          Skip this step
        </Button>
        <Button variant="ghost" size="sm" onClick={onExit}>
          Stop guide
        </Button>
        <Link
          href={onboardingSupportContextHref(supportContext)}
          className="inline-flex min-h-8 items-center rounded-xs px-2 text-[10px] font-medium text-secondary underline underline-offset-2"
        >
          Contact Support
        </Link>
      </div>
    </section>
  );
}
