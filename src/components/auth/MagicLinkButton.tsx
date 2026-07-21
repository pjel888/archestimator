"use client";

/**
 * MagicLinkButton - the signal-orange CTA for the email magic-link submit
 * (keystone decision C-3). It fills with brand #F24405 (white text is
 * AA-pass) and steps to #C63804 on hover - NOT the #3D3D3D ink of the app's
 * `primary` variant. It must live INSIDE the magic-link `<form action>` in
 * the form leaf so the server action receives `next` + honeypot fields.
 *
 * The trailing arrow is nested in its own circular wrapper flush with the
 * pill's inner padding (button-in-button): on hover it travels diagonally
 * while the fill darkens, creating internal kinetic tension. Styled for the
 * public auth surface (15px label, 48px target), not the dense in-app
 * `ui/Button`.
 *
 * `"use client"` because it is a submit button that may receive focus / form
 * events.
 */
export interface MagicLinkButtonProps {
  label: string;
  className?: string;
}

export function MagicLinkButton({ label, className }: MagicLinkButtonProps) {
  return (
    <button
      type="submit"
      className={`group inline-flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 rounded-full bg-brand-orange pl-6 pr-2 text-left text-[15px] font-medium leading-none text-white shadow-[0_1px_2px_rgba(194,56,4,0.25),inset_0_1px_0_rgba(255,255,255,0.18)] outline-none transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-brand-orange-dark focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 ${className ?? ""}`}
    >
      <span className="flex-1 text-center">{label}</span>
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:bg-white/25"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="size-4"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M2.5 8h11m0 0L9 3.5M13.5 8 9 12.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
