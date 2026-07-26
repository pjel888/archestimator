"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { useLandingAuthHintState } from "@/lib/landing/use-landing-auth-hint";
import { cn } from "@/lib/ui/cn";

import {
  BETA_ACCESS_MAILTO_HREF,
  LOGIN_HREF,
  PRIMARY_CTA_LABEL,
  SIGNED_IN_CTA_LABEL,
  SIGN_IN_LABEL,
  WORKSPACE_HREF,
} from "../_content";
import styles from "../kimi-landing.module.css";

/**
 * Small client islands: the only auth-dependent UI on the route. SSR and the
 * first client render always show the signed-out variant (the hint hook fails
 * closed), so hydration matches.
 */

export function PrimaryCtaLink({ className }: { className?: string }) {
  const { isLoggedIn, isLoading } = useLandingAuthHintState();

  if (isLoading) {
    return <span className={cn(styles.ctaButton, styles.ctaButtonSkeleton)} aria-hidden="true" />;
  }

  return (
    <Link
      href={isLoggedIn ? WORKSPACE_HREF : BETA_ACCESS_MAILTO_HREF}
      className={cn(styles.ctaButton, className)}
    >
      <span>{isLoggedIn ? SIGNED_IN_CTA_LABEL : PRIMARY_CTA_LABEL}</span>
      <span className={styles.ctaArrow} aria-hidden="true">
        <ArrowRight size={16} weight="bold" />
      </span>
    </Link>
  );
}

export function AuthUtilityLink({ className }: { className?: string }) {
  const { isLoggedIn, isLoading } = useLandingAuthHintState();

  if (isLoading) {
    return null;
  }

  return (
    <Link href={isLoggedIn ? WORKSPACE_HREF : LOGIN_HREF} className={className}>
      {isLoggedIn ? SIGNED_IN_CTA_LABEL : SIGN_IN_LABEL}
    </Link>
  );
}
