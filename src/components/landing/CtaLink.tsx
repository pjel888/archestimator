"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function CtaLink({
  href,
  children,
  variant = "primary",
  onClick,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={
        variant === "primary"
          ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-[4px] bg-brand-orange px-4 text-[15px] font-semibold leading-none text-white transition hover:scale-[1.04] hover:bg-brand-orange-dark active:scale-95"
          : "inline-flex min-h-10 items-center justify-center gap-2 rounded-[4px] border border-[#171514] bg-white px-4 text-[15px] font-semibold leading-none text-[#171514] transition hover:scale-[1.04] hover:bg-[#faf7f2] active:scale-95"
      }
    >
      {children}
    </Link>
  );
}
