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
          ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-[4px] bg-[#FF7A1A] px-4 text-[15px] font-semibold leading-none text-white transition hover:scale-[1.04] hover:bg-[#c85100] active:scale-95"
          : "inline-flex min-h-10 items-center justify-center gap-2 rounded-[4px] border border-[#111111] bg-white px-4 text-[15px] font-semibold leading-none text-[#111111] transition hover:scale-[1.04] hover:bg-[#faf9f6] active:scale-95"
      }
    >
      {children}
    </Link>
  );
}

