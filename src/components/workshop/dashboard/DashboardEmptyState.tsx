"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, FolderPlus } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { NewProjectModal } from "@/components/workshop/NewProjectModal";
import { cn } from "@/lib/ui/cn";

import { WORKSHOP_ROUTES } from "./lib";

type DashboardEmptyStateProps = {
  /** Personalises the hero greeting when known (e.g. first name). */
  displayName?: string | null;
};

/** The four destination previews, using the same dashboard surface system. */
const PREVIEW_TILES = [
  {
    href: WORKSHOP_ROUTES.projects,
    label: "Projects",
    toneClass: "dashboard-destination-card--projects",
  },
  {
    href: WORKSHOP_ROUTES.libraryComponents,
    label: "Components",
    toneClass: "dashboard-destination-card--components",
  },
  {
    href: WORKSHOP_ROUTES.libraryTemplates,
    label: "Templates",
    toneClass: "dashboard-destination-card--templates",
  },
  {
    href: WORKSHOP_ROUTES.library,
    label: "Library",
    toneClass: "dashboard-destination-card--library",
  },
] as const;

/**
 * First-run experience (BENTO v2) — what a brand-new user with zero projects and
 * zero sheets sees. A blank dashboard is a failure: this is a purposeful, warm
 * hero that drives the very first project (which in turn unlocks the first
 * estimate sheet), sitting above a "what you can build" strip that previews the
 * four destinations the workspace will fill out.
 *
 * Self-contained by design: the preview tiles are rendered inline from the
 * existing global card classes rather than importing the sibling card
 * components (those may be mid-edit). The primary action opens the real
 * create-project flow; a quiet secondary link starts from a template instead.
 */
export function DashboardEmptyState({ displayName }: DashboardEmptyStateProps) {
  const [open, setOpen] = useState(false);

  const greeting = displayName?.trim() ? `${displayName.trim()}, let's` : "Let's";

  return (
    <section
      role="region"
      aria-label="Get started"
      className="flex w-full flex-col gap-2"
    >
      {/* Warm-glass hero over a faint bloom — never blank, always a start. */}
      <div className="relative w-full">
        <span
          aria-hidden="true"
          className="workshop-dashboard-bloom pointer-events-none absolute inset-0"
        />

        <div
          className={cn(
            "dashboard-glass-warm dashboard-hero-create grain-overlay",
            "relative flex flex-col gap-2 rounded-xs p-2",
          )}
        >
          <span className="font-numeric text-[9px] text-secondary">First run</span>

          <h2 className="font-display text-[24px] font-medium text-ink">
            {greeting} build your first estimate
          </h2>

          <p className="max-w-prose text-[12px] text-secondary">
            Create a project, then add estimate sheets — reusable line items,
            supplier context, and a document-ready proposal.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
              <FolderPlus size={16} weight="regular" aria-hidden="true" />
              New project
            </Button>

            <Link
              href={WORKSHOP_ROUTES.libraryTemplates}
              className={cn(
                "inline-flex items-center gap-1 rounded-xs px-1.5 py-1",
                "font-numeric text-[10px] text-secondary transition-colors hover:text-ink",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              )}
            >
              or browse templates
              <ArrowRight size={11} weight="regular" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {/* "What you can build" — preview of the four destinations using the same
          surface system as the populated dashboard. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PREVIEW_TILES.map(({ href, label, toneClass }) => (
          <Link
            key={label}
            href={href}
            aria-label={`Open ${label}`}
            className={cn(
              "dashboard-destination-card relative block h-[120px]",
              toneClass,
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
            )}
          >
            <span className="dashboard-destination-card-mark" aria-hidden="true" />
            <span
              className="dashboard-destination-card-title absolute bottom-2 right-2 z-10 max-w-[calc(100%-16px)] text-right text-[11px] font-medium"
            >
              {label}
            </span>
          </Link>
        ))}
      </div>

      {open ? <NewProjectModal onClose={() => setOpen(false)} /> : null}
    </section>
  );
}
