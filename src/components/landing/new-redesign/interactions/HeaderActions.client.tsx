"use client";

import Link from "next/link";
import { pageContract } from "../content";
import chrome from "../chrome.module.css";
import { MobileMenu } from "./MobileMenu.client";

const login = { label: "Sign in", href: "/login?next=/workshop" } as const;

export function HeaderActions() {
  return (
    <div className={chrome.actions}>
      <Link className={chrome.signIn} href={login.href}>{login.label}</Link>
      <Link className={chrome.compactCta} href={pageContract.cta.href}>{pageContract.cta.label}</Link>
      <MobileMenu items={pageContract.nav} primary={pageContract.cta} secondary={login} />
    </div>
  );
}
