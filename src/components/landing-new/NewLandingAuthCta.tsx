"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { ButtonLink } from "@/components/ui/button";
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
 * Small client island: the only auth-dependent UI on the public landing page. Everything else
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
    <ButtonLink
      href={isLoggedIn ? WORKSPACE_HREF : EARLY_ACCESS_HREF}
      data-landing-cta="primary"
      data-landing-cta-location={location}
      variant="plain"
      size="lg"
      className={cn(styles.primaryCta, "min-w-0", className)}
    >
      <span>{isLoggedIn ? SIGNED_IN_CTA_LABEL : PRIMARY_CTA_LABEL}</span>
      <span className={styles.primaryCtaArrow} aria-hidden="true">
        <ArrowRight size={15} weight="bold" />
      </span>
    </ButtonLink>
  );
}

type AuthUtilityLinkProps = {
  className?: string;
  hideWhenLoggedIn?: boolean;
  workspaceLabel?: string;
};

export function AuthUtilityLink({ className, hideWhenLoggedIn = false, workspaceLabel }: AuthUtilityLinkProps) {
  const isLoggedIn = useLandingAuthHint();

  if (isLoggedIn && hideWhenLoggedIn) return null;

  return (
    <Link href={isLoggedIn ? WORKSPACE_HREF : LOGIN_HREF} className={className}>
      {isLoggedIn ? (workspaceLabel ?? SIGNED_IN_CTA_LABEL) : SIGN_IN_LABEL}
    </Link>
  );
}
