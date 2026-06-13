import React from "react";

/**
 * T1-C (Shared Link Improvement — MVP): the single source of truth for the public
 * /share proposal page width ladder. Encodes the responsive max-width + horizontal
 * padding ONCE so the full-bleed session banner and the page body stay aligned.
 *
 * Single column only (no xl sticky-rail / grid split — that is a deferred follow-up).
 * The wider container kills UX-14 (the old 960px cap wasted the browser on desktop).
 *
 * Width ladder:
 *   base   → 820px   (comfortable mobile/tablet reading measure)
 *   lg     → 1120px
 *   xl     → 1280px
 *   2xl    → 1440px  (full client-portal work-zone on large displays)
 */
export const SHARE_CONTAINER_WIDTH =
  "mx-auto w-full px-4 sm:px-6 lg:px-8 max-w-[820px] lg:max-w-[1120px] xl:max-w-[1280px] 2xl:max-w-[1440px]";

type ShareContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export function ShareContainer({ children, className }: ShareContainerProps) {
  return <div className={`${SHARE_CONTAINER_WIDTH}${className ? ` ${className}` : ""}`}>{children}</div>;
}
