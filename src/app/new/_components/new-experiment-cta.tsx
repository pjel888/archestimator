"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { useLandingAuthHintState } from "@/lib/landing/use-landing-auth-hint";
import { cn } from "@/lib/ui/cn";

import {
  BETA_ACCESS_MAILTO_HREF,
  WORKSPACE_HREF,
} from "../../kimi3d/_content";
import { newLandingCopy } from "../_content";
import styles from "../new-landing.module.css";

export function NewExperimentCta({ className }: { className?: string }) {
  const { isLoggedIn, isLoading } = useLandingAuthHintState();

  if (isLoading) {
    return (
      <span
        className={cn(styles.closingCta, styles.closingCtaSkeleton, className)}
        data-new-closing-cta-loading
        aria-hidden="true"
      />
    );
  }

  return (
    <Link
      href={isLoggedIn ? WORKSPACE_HREF : BETA_ACCESS_MAILTO_HREF}
      className={cn(styles.closingCta, className)}
      data-new-closing-cta
    >
      <span>
        {isLoggedIn
          ? newLandingCopy.closing.signedInCtaLabel
          : newLandingCopy.closing.ctaLabel}
      </span>
      <ArrowRight size={18} weight="bold" aria-hidden="true" />
    </Link>
  );
}
