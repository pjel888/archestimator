"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { useLandingAuthHint } from "@/lib/landing/use-landing-auth-hint";
import { cn } from "@/lib/ui/cn";
import styles from "./new-landing.module.css";
import {
  EARLY_ACCESS_HREF,
  LOGIN_HREF,
  PRIMARY_CTA_LABEL,
  SIGNED_IN_CTA_LABEL,
  SIGN_IN_LABEL,
  WORKSPACE_HREF,
  type LandingCtaLocation,
} from "./new-landing-content";

/**
 * Small client island: the only auth-dependent UI on `/new`. Everything else
 * on the route stays server-rendered. SSR and first client render always
 * show the signed-out variant (the hook fails closed), so hydration matches.
 */

type EarlyAccessCtaProps = {
  location: LandingCtaLocation;
  className?: string;
};

export function EarlyAccessCta({ location, className }: EarlyAccessCtaProps) {
  const isLoggedIn = useLandingAuthHint();

  return (
    <Link
      href={isLoggedIn ? WORKSPACE_HREF : EARLY_ACCESS_HREF}
      data-landing-cta="primary"
      data-landing-cta-location={location}
      className={cn(styles.primaryCta, className)}
    >
      <span>{isLoggedIn ? SIGNED_IN_CTA_LABEL : PRIMARY_CTA_LABEL}</span>
      <span className={styles.primaryCtaArrow} aria-hidden="true">
        <ArrowRight size={15} weight="bold" />
      </span>
    </Link>
  );
}

type AuthUtilityLinkProps = {
  className?: string;
  workspaceLabel?: string;
};

export function AuthUtilityLink({ className, workspaceLabel }: AuthUtilityLinkProps) {
  const isLoggedIn = useLandingAuthHint();

  return (
    <Link href={isLoggedIn ? WORKSPACE_HREF : LOGIN_HREF} className={className}>
      {isLoggedIn ? (workspaceLabel ?? SIGNED_IN_CTA_LABEL) : SIGN_IN_LABEL}
    </Link>
  );
}
