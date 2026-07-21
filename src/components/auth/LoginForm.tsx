"use client";

import Link from "next/link";

import { GoogleButton } from "@/components/auth/GoogleButton";
import { MagicLinkButton } from "@/components/auth/MagicLinkButton";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth/actions";

/**
 * LoginForm — the two `<form action>` leaves for the auth surface (Google OAuth
 * + email magic link). Auth model = Google OAuth + magic link, NO password
 * (keystone decision D-2 / `23-AUTH-EXPERIENCE.md`). `signInWithEmail` is
 * `shouldCreateUser:true`, so the same magic-link leaf doubles as signup.
 *
 * `"use client"`: the honeypot + label markup are static, but the component is a
 * form boundary that may receive focus / submit events.
 *
 * Honeypot: `name="company_url"` is a visually-hidden bait field. Real users
 * never see/fill it; a bot autofilling "company_url" gets its submission
 * rejected by the server action (Phase 5 wiring). It is `aria-hidden`,
 * `tabindex=-1`, `autocomplete="off"`, and positioned off-flow at zero opacity
 * so it stays in the serialized FormData WITHOUT being reachable by keyboard or
 * screen reader. NOTE: `hidden` attribute is wrong here — the server action must
 * still receive the field, and `hidden` inputs can be skipped by some autofill
 * bots; the off-flow technique is the documented honeypot pattern.
 */
export interface LoginFormProps {
  next: string;
}

const HONEYPOT_CLASS = "absolute -z-10 h-0 w-0 opacity-0";

export function LoginForm({ next }: LoginFormProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Google OAuth leaf */}
      <form action={signInWithGoogle} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <div aria-hidden="true" className={HONEYPOT_CLASS}>
          <label htmlFor="login-company-url">Company URL</label>
          <input
            id="login-company-url"
            name="company_url"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        <GoogleButton label="Continue with Google" className="w-full" />
      </form>

      {/* "or" divider */}
      <div
        className="flex items-center gap-3 text-[13px] text-landing-ink-muted"
        aria-hidden="true"
      >
        <span className="h-px flex-1 bg-landing-hairline-strong" />
        <span>or</span>
        <span className="h-px flex-1 bg-landing-hairline-strong" />
      </div>

      {/* Email magic-link leaf */}
      <form action={signInWithEmail} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <div aria-hidden="true" className={HONEYPOT_CLASS}>
          <label htmlFor="login-company-url-2">Company URL</label>
          <input
            id="login-company-url-2"
            name="company_url"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <label htmlFor="login-email" className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium text-landing-ink">Email</span>
          {/* 16px input text keeps iOS Safari from zooming on focus; the pill
              matches the auth CTAs. */}
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            required
            className="min-h-[52px] w-full min-w-0 rounded-full border border-landing-hairline-strong bg-white px-5 text-[16px] leading-none text-landing-ink outline-none transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-landing-ink-muted hover:border-landing-ink-muted focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/15"
          />
        </label>

        <MagicLinkButton
          label="Email me a sign-in link"
          className="w-full"
        />
      </form>

      {/* Cross-link */}
      <p className="text-[14px] leading-5 text-landing-ink-secondary">
        New to Archestimator?{" "}
        <Link
          href="/signup"
          className="font-medium text-[color:var(--brand-orange-dark)] underline decoration-landing-hairline-strong underline-offset-2 transition-colors hover:decoration-[color:var(--brand-orange-dark)]"
        >
          Start free →
        </Link>
      </p>

      {/* Legal row */}
      <p className="border-t border-landing-hairline pt-5 text-[13px] leading-5 text-landing-ink-muted">
        By continuing you agree to our{" "}
        <Link
          href="/terms"
          className="font-medium text-landing-ink underline decoration-landing-hairline-strong underline-offset-2 transition-colors hover:decoration-landing-ink"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="font-medium text-landing-ink underline decoration-landing-hairline-strong underline-offset-2 transition-colors hover:decoration-landing-ink"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
