"use client";

import Link from "next/link";
import { useLandingAuthHint } from "@/lib/landing/use-landing-auth-hint";
import { pageContract } from "../content";
import chrome from "../chrome.module.css";
import { MobileMenu } from "./MobileMenu.client";

const login = { label: "Sign in", href: "/login?next=/workshop" } as const;
const workspace = { label: "Open workspace", href: "/workshop" } as const;

export function HeaderActions() {
  const isLoggedIn = useLandingAuthHint();
  const primary = isLoggedIn ? workspace : pageContract.cta;

  return (
    <div className={chrome.actions}>
      {!isLoggedIn ? <Link className={chrome.signIn} href={login.href}>{login.label}</Link> : null}
      <Link className={chrome.compactCta} href={primary.href}>{primary.label}</Link>
      <MobileMenu items={pageContract.nav} primary={primary} secondary={isLoggedIn ? undefined : login} />
    </div>
  );
}
