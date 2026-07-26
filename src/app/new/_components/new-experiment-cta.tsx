"use client";

import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { ButtonLink } from "@/components/ui/button";
import { useLandingAuthHintState } from "@/lib/landing/use-landing-auth-hint";
import { cn } from "@/lib/ui/cn";

import {
  BETA_ACCESS_MAILTO_HREF,
  WORKSPACE_HREF,
} from "../../kimi3d/_content";
import lockedStyles from "../../kimi3d/kimi-landing.module.css";
import { newLandingCopy } from "../_content";
import styles from "../new-landing.module.css";

type NewExperimentCtaProps = {
  className?: string;
  placement?: "closing" | "hero";
};

export function NewExperimentCta({
  className,
  placement = "closing",
}: NewExperimentCtaProps) {
  const { isLoggedIn, isLoading } = useLandingAuthHintState();
  const showSignedOutFallback = isLoading || !isLoggedIn;
  const isHero = placement === "hero";

  return (
    <ButtonLink
      href={showSignedOutFallback ? BETA_ACCESS_MAILTO_HREF : WORKSPACE_HREF}
      variant="plain"
      size="lg"
      className={cn(isHero ? lockedStyles.ctaButton : styles.closingCta, "min-w-0", className)}
      data-new-experiment-cta={placement}
      data-new-cta-loading={isLoading ? "" : undefined}
    >
      <span>
        {showSignedOutFallback
          ? newLandingCopy.closing.ctaLabel
          : newLandingCopy.closing.signedInCtaLabel}
      </span>
      {isHero ? (
        <span className={lockedStyles.ctaArrow} aria-hidden="true">
          <ArrowRight size={16} weight="bold" />
        </span>
      ) : (
        <ArrowRight size={18} weight="bold" aria-hidden="true" />
      )}
    </ButtonLink>
  );
}
