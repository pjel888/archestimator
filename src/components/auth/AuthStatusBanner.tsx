import { getPublicAuthError } from "@/lib/auth/error-mapping";
import { cn } from "@/lib/ui/cn";

/**
 * AuthStatusBanner — the single aria-live status region for the auth surface.
 * Renders the success ("Check your email…") banner when `sent` is truthy, the
 * error banner (mapped through `getPublicAuthError`) when `errorCode` is set,
 * and nothing at all when neither is present (the common first paint).
 *
 * It sits at the TOP of the RIGHT column so a screen reader announces the
 * outcome before the form. `role="status"` + `aria-live="polite"` keeps it
 * non-interrupting (the auth flow never produces a true alert urgency).
 *
 * RSC-safe: no hooks, no "use client".
 */
export interface AuthStatusBannerProps {
  sent?: string | null;
  errorCode?: string | null;
  className?: string;
}

export function AuthStatusBanner({ sent, errorCode, className }: AuthStatusBannerProps) {
  const success = sent ? true : false;
  const publicError = errorCode ? getPublicAuthError(errorCode) : null;

  if (!success && !publicError) return null;

  return (
    <output
      aria-live="polite"
      className={cn(
        "auth-enter flex items-start gap-3 rounded-[14px] border px-4 py-3.5 text-[14px] leading-5",
        success
          ? "border-[color:var(--brand-orange)]/30 bg-[color:var(--brand-orange-soft)] text-[color:var(--brand-orange-dark)]"
          : "border-[color:var(--danger)]/30 bg-[color:var(--danger-soft)]/40 text-[color:var(--danger)]",
        className,
      )}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        focusable="false"
        className="mt-0.5 size-4 shrink-0"
      >
        {success ? (
          <path
            d="M13.5 4.5 6.25 11.75 2.5 8"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <>
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M8 5.25v3M8 10.75h.01"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
      <span>
        {success
          ? "Check your email — we sent a sign-in link to your inbox."
          : publicError?.message}
      </span>
    </output>
  );
}
