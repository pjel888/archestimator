"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, FolderPlus } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { NewProjectModal } from "@/components/workshop/NewProjectModal";
import { cn } from "@/lib/ui/cn";

import { WORKSHOP_ROUTES } from "./lib";

type DashboardEmptyStateProps = {
  /** Personalises the hero greeting when known (e.g. first name). */
  displayName?: string | null;
};

/** Shared responsive sizing hint for the destination preview images. */
const TILE_IMAGE_SIZES = "(max-width:640px) 50vw, (max-width:1024px) 25vw, 22vw";

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
      className="flex w-full flex-col gap-3"
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
            "relative flex flex-col gap-3 rounded-xs p-6",
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

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
              <FolderPlus size={16} weight="regular" aria-hidden="true" />
              New project
            </Button>

            <Link
              href={WORKSHOP_ROUTES.libraryTemplates}
              className={cn(
                "inline-flex items-center gap-1 rounded-xs px-1.5 py-1",
                "font-numeric text-[10px] text-secondary transition-colors hover:text-ink",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
              )}
            >
              or browse templates
              <ArrowRight size={11} weight="regular" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {/* "What you can build" — preview of the four destinations (self-contained). */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          href={WORKSHOP_ROUTES.projects}
          aria-label="Open Projects"
          className={cn(
            "image-card image-card-projects relative block h-[120px]",
            "[background-color:var(--block-clay)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
          )}
        >
          <Image
            src="/Cards/Projects-Card.jpg"
            alt=""
            fill
            className="object-cover"
            sizes={TILE_IMAGE_SIZES}
          />
          <span className="image-card-scrim" aria-hidden="true" />
          <span className="absolute inset-x-0 bottom-0 z-10 p-3 text-[11px] font-medium text-[color:var(--on-art)]">
            Projects
          </span>
        </Link>

        <Link
          href={WORKSHOP_ROUTES.libraryComponents}
          aria-label="Open Components"
          className={cn(
            "image-card image-card-components relative block h-[120px]",
            "[background-color:var(--block-sage)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
          )}
        >
          <Image
            src="/Cards/Components-Card.jpg"
            alt=""
            fill
            className="object-cover"
            sizes={TILE_IMAGE_SIZES}
          />
          <span className="image-card-scrim" aria-hidden="true" />
          <span className="absolute inset-x-0 bottom-0 z-10 p-3 text-[11px] font-medium text-[color:var(--on-art)]">
            Components
          </span>
        </Link>

        <Link
          href={WORKSHOP_ROUTES.libraryTemplates}
          aria-label="Open Templates"
          className={cn(
            "image-card image-card-templates relative block h-[120px]",
            "[background-color:var(--block-indigo)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
          )}
        >
          <Image
            src="/Cards/Templates-Card.jpg"
            alt=""
            fill
            className="object-cover"
            sizes={TILE_IMAGE_SIZES}
          />
          <span className="image-card-scrim" aria-hidden="true" />
          <span className="absolute inset-x-0 bottom-0 z-10 p-3 text-[11px] font-medium text-[color:var(--on-art)]">
            Templates
          </span>
        </Link>

        <Link
          href={WORKSHOP_ROUTES.library}
          aria-label="Open Library"
          className={cn(
            "library-hub grain-overlay relative block h-[120px]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
          )}
        >
          <span className="image-card-scrim" aria-hidden="true" />
          <span className="absolute inset-x-0 bottom-0 z-10 p-3 text-[11px] font-medium text-[color:var(--on-art)]">
            Library
          </span>
        </Link>
      </div>

      {open ? <NewProjectModal onClose={() => setOpen(false)} /> : null}
    </section>
  );
}
