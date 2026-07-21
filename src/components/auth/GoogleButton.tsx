"use client";

/**
 * GoogleButton - the Google-OAuth submit leaf. A quiet white pill carrying
 * the official Google "G" mark (inline SVG, no external asset) plus the
 * supplied label. It must live INSIDE the Google `<form action>` in the form
 * leaf (`LoginForm`) so the server action receives the serialized `next` +
 * honeypot fields.
 *
 * Styled for the public auth surface (15px label, 48px target) rather than
 * the dense in-app `ui/Button` (10px), which is sized for workspace grids.
 * States: default / hover (lift + stronger hairline) / focus-visible (brand
 * ring) / active (physical press) / disabled.
 *
 * `"use client"` because it is a button that may receive focus / form events;
 * the mark itself is pure markup.
 */
export interface GoogleButtonProps {
  label: string;
  className?: string;
}

const GOOGLE_G_MARK = (
  <svg
    viewBox="0 0 18 18"
    aria-hidden="true"
    focusable="false"
    className="size-[18px] shrink-0"
  >
    <path
      fill="#4285F4"
      d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
    />
    <path
      fill="#FBBC05"
      d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
    />
  </svg>
);

export function GoogleButton({ label, className }: GoogleButtonProps) {
  return (
    <button
      type="submit"
      className={`inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-landing-hairline-strong bg-white px-5 text-[15px] font-medium leading-none text-landing-ink shadow-[0_1px_2px_rgba(23,23,23,0.05)] outline-none transition-[border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-px hover:border-landing-ink-muted hover:shadow-[0_4px_12px_-4px_rgba(23,23,23,0.12)] focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 ${className ?? ""}`}
    >
      {GOOGLE_G_MARK}
      <span>{label}</span>
    </button>
  );
}
