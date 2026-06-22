import * as React from "react";
import { cn } from "@/lib/ui/cn";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg";
  decorative?: boolean;
}

const sizeClasses = {
  xs: "size-3",
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
};

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "md", decorative = false, role, "aria-hidden": ariaHidden, "aria-label": ariaLabel = "Loading", ...props }, ref) => {
    return (
      <div
        ref={ref}
        role={decorative ? undefined : role ?? "status"}
        aria-hidden={decorative ? true : ariaHidden}
        aria-label={decorative ? undefined : ariaLabel}
        className={cn(
          "inline-flex items-center justify-center text-brand-orange",
          sizeClasses[size],
          className
        )}
        data-blocks-shuffle-loader=""
        {...props}
      >
        <svg
          aria-hidden="true"
          className="size-full"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <style>{`
            .blocks-shuffle-box {
              transform-origin: 50% 50%;
              animation-duration: 4s;
              animation-iteration-count: infinite;
              animation-timing-function: steps(1, end);
            }
            .blocks-shuffle-box:nth-child(1) { fill: var(--brand-orange); animation-name: blocks-shuffle-1; }
            .blocks-shuffle-box:nth-child(2) { fill: color-mix(in srgb, var(--brand-orange) 72%, var(--brand-peach)); animation-name: blocks-shuffle-2; }
            .blocks-shuffle-box:nth-child(3) { fill: var(--brand-orange-dark); animation-name: blocks-shuffle-3; }
            .blocks-shuffle-box:nth-child(4) { fill: color-mix(in srgb, var(--brand-orange) 84%, var(--brand-orange-dark)); animation-name: blocks-shuffle-4; }
            .blocks-shuffle-box:nth-child(5) { fill: color-mix(in srgb, var(--brand-orange) 58%, var(--brand-peach)); animation-name: blocks-shuffle-5; }
            .blocks-shuffle-box:nth-child(6) { fill: color-mix(in srgb, var(--brand-orange) 76%, var(--brand-orange-dark)); animation-name: blocks-shuffle-6; }
            .blocks-shuffle-box:nth-child(7) { fill: color-mix(in srgb, var(--brand-orange-dark) 88%, var(--landing-ink)); animation-name: blocks-shuffle-7; }
            .blocks-shuffle-box:nth-child(8) { fill: color-mix(in srgb, var(--brand-orange) 92%, var(--brand-peach)); animation-name: blocks-shuffle-8; }
            .blocks-shuffle-box:nth-child(9) { fill: color-mix(in srgb, var(--brand-orange-dark) 76%, var(--landing-ink)); animation-name: blocks-shuffle-9; }
            @media (prefers-reduced-motion: reduce) {
              .blocks-shuffle-box { animation-duration: 6s; }
            }
            @keyframes blocks-shuffle-1 {
              9.0909090909% { transform: translate(-12px, 0); }
              18.1818181818%, 27.2727272727% { transform: translate(0, 0); }
              36.3636363636% { transform: translate(12px, 0); }
              45.4545454545%, 54.5454545455%, 63.6363636364% { transform: translate(12px, 12px); }
              72.7272727273% { transform: translate(12px, 0); }
              81.8181818182% { transform: translate(0, 0); }
              90.9090909091% { transform: translate(-12px, 0); }
              100% { transform: translate(0, 0); }
            }
            @keyframes blocks-shuffle-2 {
              9.0909090909% { transform: translate(0, 0); }
              18.1818181818% { transform: translate(12px, 0); }
              27.2727272727% { transform: translate(0, 0); }
              36.3636363636% { transform: translate(12px, 0); }
              45.4545454545%, 54.5454545455%, 63.6363636364%, 72.7272727273% { transform: translate(12px, 12px); }
              81.8181818182%, 90.9090909091% { transform: translate(0, 12px); }
              100% { transform: translate(0, 0); }
            }
            @keyframes blocks-shuffle-3 {
              9.0909090909%, 18.1818181818% { transform: translate(-12px, 0); }
              27.2727272727% { transform: translate(0, 0); }
              36.3636363636%, 45.4545454545%, 54.5454545455%, 63.6363636364%, 72.7272727273% { transform: translate(-12px, 0); }
              81.8181818182% { transform: translate(-12px, -12px); }
              90.9090909091% { transform: translate(0, -12px); }
              100% { transform: translate(0, 0); }
            }
            @keyframes blocks-shuffle-4 {
              9.0909090909%, 18.1818181818% { transform: translate(-12px, 0); }
              27.2727272727% { transform: translate(-12px, -12px); }
              36.3636363636% { transform: translate(0, -12px); }
              45.4545454545% { transform: translate(0, 0); }
              54.5454545455%, 63.6363636364%, 72.7272727273% { transform: translate(0, -12px); }
              81.8181818182% { transform: translate(-12px, -12px); }
              90.9090909091% { transform: translate(-12px, 0); }
              100% { transform: translate(0, 0); }
            }
            @keyframes blocks-shuffle-5 {
              9.0909090909%, 18.1818181818%, 27.2727272727% { transform: translate(0, 0); }
              36.3636363636%, 45.4545454545%, 54.5454545455%, 63.6363636364%, 72.7272727273% { transform: translate(12px, 0); }
              81.8181818182% { transform: translate(12px, -12px); }
              90.9090909091% { transform: translate(0, -12px); }
              100% { transform: translate(0, 0); }
            }
            @keyframes blocks-shuffle-6 {
              9.0909090909% { transform: translate(0, 0); }
              18.1818181818%, 27.2727272727% { transform: translate(-12px, 0); }
              36.3636363636%, 45.4545454545%, 54.5454545455%, 63.6363636364% { transform: translate(0, 0); }
              72.7272727273% { transform: translate(0, 12px); }
              81.8181818182% { transform: translate(-12px, 12px); }
              90.9090909091% { transform: translate(-12px, 0); }
              100% { transform: translate(0, 0); }
            }
            @keyframes blocks-shuffle-7 {
              9.0909090909%, 18.1818181818%, 27.2727272727% { transform: translate(12px, 0); }
              36.3636363636% { transform: translate(0, 0); }
              45.4545454545% { transform: translate(0, -12px); }
              54.5454545455% { transform: translate(12px, -12px); }
              63.6363636364%, 72.7272727273% { transform: translate(0, -12px); }
              81.8181818182% { transform: translate(0, 0); }
              90.9090909091% { transform: translate(12px, 0); }
              100% { transform: translate(0, 0); }
            }
            @keyframes blocks-shuffle-8 {
              9.0909090909% { transform: translate(0, 0); }
              18.1818181818% { transform: translate(-12px, 0); }
              27.2727272727% { transform: translate(-12px, -12px); }
              36.3636363636%, 45.4545454545%, 54.5454545455%, 63.6363636364%, 72.7272727273% { transform: translate(0, -12px); }
              81.8181818182% { transform: translate(12px, -12px); }
              90.9090909091% { transform: translate(12px, 0); }
              100% { transform: translate(0, 0); }
            }
            @keyframes blocks-shuffle-9 {
              9.0909090909%, 18.1818181818% { transform: translate(-12px, 0); }
              27.2727272727% { transform: translate(0, 0); }
              36.3636363636% { transform: translate(-12px, 0); }
              45.4545454545%, 54.5454545455% { transform: translate(0, 0); }
              63.6363636364%, 72.7272727273% { transform: translate(-12px, 0); }
              81.8181818182% { transform: translate(-24px, 0); }
              90.9090909091% { transform: translate(-12px, 0); }
              100% { transform: translate(0, 0); }
            }
          `}</style>
          <g>
            <rect className="blocks-shuffle-box" x="13" y="1" rx="1" width="10" height="10" />
            <rect className="blocks-shuffle-box" x="13" y="1" rx="1" width="10" height="10" />
            <rect className="blocks-shuffle-box" x="25" y="25" rx="1" width="10" height="10" />
            <rect className="blocks-shuffle-box" x="13" y="13" rx="1" width="10" height="10" />
            <rect className="blocks-shuffle-box" x="13" y="13" rx="1" width="10" height="10" />
            <rect className="blocks-shuffle-box" x="25" y="13" rx="1" width="10" height="10" />
            <rect className="blocks-shuffle-box" x="1" y="25" rx="1" width="10" height="10" />
            <rect className="blocks-shuffle-box" x="13" y="25" rx="1" width="10" height="10" />
            <rect className="blocks-shuffle-box" x="25" y="25" rx="1" width="10" height="10" />
          </g>
        </svg>
      </div>
    );
  }
);
Spinner.displayName = "Spinner";
