"use client";

import { type ReactNode, Fragment, type Ref } from "react";
import Link from "next/link";
import { CaretRight, House } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/ui/cn";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export interface BreadcrumbsProps {
  ref?: Ref<HTMLElement>;
  items: BreadcrumbItem[];
  showHome?: boolean;
  homeHref?: string;
  maxItems?: number;
  className?: string;
}

export function Breadcrumbs({ items, showHome = false, homeHref = "/workshop", maxItems = 5, className, ref, ...props }: BreadcrumbsProps) {
  const visibleItems =
    items.length > maxItems
      ? [items[0], { label: "…" } as BreadcrumbItem, ...items.slice(-(maxItems - 2))]
      : items;

  return (
    <nav ref={ref} aria-label="Breadcrumb" className={cn("flex items-center gap-0.5", className)} {...props}>
      {showHome && (
        <>
          <Link
            href={homeHref}
            className="flex items-center justify-center rounded-xs p-0.5 text-muted hover:text-ink transition-colors"
          >
            <House weight="regular" className="h-3.5 w-3.5" />
          </Link>
          <Separator />
        </>
      )}
      {visibleItems.map((item, i) => {
        const isLast = i === visibleItems.length - 1;
        return (
          <Fragment key={i}>
            {isLast ? (
              <span
                aria-current="page"
                className="text-[10px] font-medium text-ink tracking-normal truncate max-w-[200px]"
              >
                {item.label}
              </span>
            ) : item.href ? (
              <Link
                href={item.href}
                className="text-[10px] font-normal text-muted hover:text-ink tracking-normal truncate max-w-[200px] transition-colors rounded-xs"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-[10px] font-normal text-muted tracking-normal">{item.label}</span>
            )}
            {!isLast && <Separator />}
          </Fragment>
        );
      })}
    </nav>
  );
}

function Separator() {
  return (
    <CaretRight weight="regular" className="h-3 w-3 text-muted shrink-0" aria-hidden="true" />
  );
}
