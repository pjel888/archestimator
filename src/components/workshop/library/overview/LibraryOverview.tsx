"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Blueprint, Package, Plus } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { pesoFormatter } from "@/components/workshop/component-library/helpers";
import type { EstimateTemplate } from "@/components/workshop/component-library/templates";
import type {
  LibraryOverview as LibraryOverviewPayload,
  LibraryOverviewHealth,
  LibraryOverviewTemplate,
} from "@/lib/repositories/component-library-repository";
import { LibraryOverviewSearch } from "./LibraryOverviewSearch";
import { RecentComponentCard } from "./RecentComponentCard";

const NewTemplateModal = dynamic(
  () => import("@/components/workshop/component-library/NewTemplateModal").then((module) => module.NewTemplateModal),
  { loading: () => null },
);

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function SectionHeader({
  headingId,
  title,
  meta,
  linkHref,
  linkLabel,
}: {
  headingId: string;
  title: string;
  meta?: string;
  linkHref: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="flex min-w-0 items-baseline gap-2">
        <h2 id={headingId} className="text-[12px] font-medium leading-4 text-ink">
          {title}
        </h2>
        {meta ? <p className="truncate text-[9px] font-normal leading-3 text-tertiary">{meta}</p> : null}
      </div>
      <Link
        href={linkHref}
        className="shrink-0 rounded-xs text-[9px] font-medium leading-3 text-secondary transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

function RecentTemplateRow({
  template,
  onOpen,
}: {
  template: LibraryOverviewTemplate;
  onOpen: (templateId: string) => void;
}) {
  const counts = [
    // One node type: groups + areas read as a single "area" count.
    pluralize(template.groupCount + template.areaCount, "area"),
    pluralize(template.rowCount, "row"),
  ].join(" · ");

  return (
    <li
      data-library-overview-recent-template={template.id}
      className="group flex cursor-pointer items-center gap-2 rounded-xs border border-hairline bg-white px-3 py-2 transition hover:border-divider"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button, a")) return;
        onOpen(template.id);
      }}
    >
      <Blueprint size={12} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
      <p className="min-w-0 truncate text-[11px] font-medium leading-4 text-ink" title={template.name}>
        {template.name}
      </p>
      <p className="min-w-0 truncate text-[9px] font-normal leading-3 text-tertiary">{counts}</p>
      <span className="ml-auto shrink-0 rounded-xs border border-hairline bg-surfaceMuted px-1 py-0.5 text-[8px] font-medium leading-3 text-secondary">
        {template.category}
      </span>
      <p className="shrink-0 text-[11px] font-medium leading-4 tabular-nums text-ink">
        {pesoFormatter.format(template.total)}
      </p>
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="min-h-6 min-w-0 px-2 !text-[9px]"
        aria-label={`Open ${template.name}`}
        onClick={() => onOpen(template.id)}
      >
        Open
      </Button>
    </li>
  );
}

function LibraryHealthLine({ health }: { health: LibraryOverviewHealth }) {
  const stats: Array<{ id: string; value: string; label: string; href?: string }> = [];
  if (health.staleComponentCount > 0) {
    stats.push({
      id: "stale-prices",
      value: String(health.staleComponentCount),
      label: health.staleComponentCount === 1 ? "price older than 90 days" : "prices older than 90 days",
      href: "/workshop/library/components?freshness=stale",
    });
  }
  if (health.discontinuedInUseCount > 0) {
    stats.push({
      id: "discontinued-in-use",
      value: String(health.discontinuedInUseCount),
      label:
        health.discontinuedInUseCount === 1
          ? "discontinued item still in use"
          : "discontinued items still in use",
      href: "/workshop/library/components?lifecycle=discontinued",
    });
  }
  if (health.missingBrandCount > 0) {
    stats.push({
      id: "missing-brand",
      value: String(health.missingBrandCount),
      label: health.missingBrandCount === 1 ? "component missing a brand" : "components missing a brand",
      href: "/workshop/library/components?brand=none",
    });
  }
  if (health.lastLibraryUpdate) {
    stats.push({
      id: "last-update",
      value: health.lastLibraryUpdate.slice(0, 10),
      label: "last library update",
    });
  }
  if (stats.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-start gap-x-10 gap-y-3 border-t border-hairline pt-4"
      aria-label="Library health"
      data-library-overview-health="true"
    >
      {stats.map((stat) =>
        stat.href ? (
          <Link
            key={stat.id}
            href={stat.href}
            data-library-overview-health-stat={stat.id}
            className="group flex flex-col gap-0.5 rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <span className="text-[12px] font-medium leading-4 tabular-nums text-ink">{stat.value}</span>
            <span className="text-[9px] font-normal leading-3 text-tertiary transition group-hover:text-ink">
              {stat.label}
            </span>
          </Link>
        ) : (
          <div key={stat.id} data-library-overview-health-stat={stat.id} className="flex flex-col gap-0.5">
            <span className="text-[12px] font-medium leading-4 tabular-nums text-ink">{stat.value}</span>
            <span className="text-[9px] font-normal leading-3 text-tertiary">{stat.label}</span>
          </div>
        ),
      )}
    </div>
  );
}

export type LibraryOverviewProps = {
  overview: LibraryOverviewPayload;
};

/**
 * Library Overview home (`/workshop/library`): cross-library search, create
 * actions, recently updated components and templates, and the library
 * health line. A work surface, not a metrics dashboard — every element
 * routes into the Components or Templates tab. Renders from one lightweight
 * `getLibraryOverview()` payload; it never fetches the full datasets.
 */
export function LibraryOverview({ overview }: LibraryOverviewProps) {
  const router = useNavigationRouter();
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);

  const isEmptyWorkspace = overview.componentCount === 0 && overview.templateCount === 0;

  const openTemplateEditor = (templateId: string) => {
    router.push(`/workshop/library/templates/${templateId}`);
  };

  const handleTemplateCreated = (template: EstimateTemplate) => {
    openTemplateEditor(template.id);
  };

  const componentsMeta = `${overview.componentCount} in ${pluralize(overview.categoryCount, "category", "categories")} · ${pluralize(overview.supplierCount, "supplier")} · ${pluralize(overview.brandCount, "brand")}`;
  const templatesMeta = `${overview.templateCount} in ${pluralize(overview.templateGroupCount, "group")}`;

  const componentsEmptyState = (
    <EmptyState
      icon={<Package size={18} weight="regular" aria-hidden="true" />}
      title="Build your component library"
      description="Add your first component, or import from a price list."
      action={
        <Button type="button" variant="primary" size="xs" onClick={() => router.push("/workshop/library/components?add=component")}>
          Add component
        </Button>
      }
    />
  );

  const templatesEmptyState = (
    <EmptyState
      icon={<Blueprint size={18} weight="regular" aria-hidden="true" />}
      title="No templates yet"
      description="Create a template from scratch, or save any estimate group as a template from the estimate page."
      action={
        <Button type="button" variant="secondary" size="xs" onClick={() => setNewTemplateOpen(true)}>
          New template
        </Button>
      }
    />
  );

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-white" data-library-overview="true">
      <div className="mx-auto flex w-full flex-col gap-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LibraryOverviewSearch />
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="ghost" size="xs" onClick={() => setNewTemplateOpen(true)}>
              <Plus size={12} weight="regular" aria-hidden="true" />
              New template
            </Button>
            {/* Library Optimization Plan P1 T8 (F23): land on the Components tab AND
                open the Add Component modal via ?add=component (handled in
                ComponentLibraryManager), instead of just navigating to the tab. */}
            <Button type="button" variant="primary" size="xs" onClick={() => router.push("/workshop/library/components?add=component")}>
              <Plus size={12} weight="regular" aria-hidden="true" />
              Add component
            </Button>
          </div>
        </div>

        {isEmptyWorkspace ? (
          <div className="grid gap-3 md:grid-cols-2" data-library-overview-empty-workspace="true">
            {componentsEmptyState}
            {templatesEmptyState}
          </div>
        ) : (
          <>
            <section aria-labelledby="library-overview-components-heading" className="flex flex-col gap-2">
              <SectionHeader
                headingId="library-overview-components-heading"
                title="Components"
                meta={overview.componentCount > 0 ? componentsMeta : undefined}
                linkHref="/workshop/library/components"
                linkLabel="Open components"
              />
              {overview.componentCount === 0 ? (
                componentsEmptyState
              ) : (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {overview.recentComponents.map((component) => (
                    <RecentComponentCard key={component.id} component={component} />
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="library-overview-templates-heading" className="flex flex-col gap-2">
              <SectionHeader
                headingId="library-overview-templates-heading"
                title="Templates"
                meta={overview.templateCount > 0 ? templatesMeta : undefined}
                linkHref="/workshop/library/templates"
                linkLabel="Open templates"
              />
              {overview.templateCount === 0 ? (
                templatesEmptyState
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {overview.recentTemplates.map((template) => (
                    <RecentTemplateRow key={template.id} template={template} onOpen={openTemplateEditor} />
                  ))}
                </ul>
              )}
            </section>

            <LibraryHealthLine health={overview.health} />
          </>
        )}
      </div>

      {newTemplateOpen ? (
        <NewTemplateModal
          open={newTemplateOpen}
          mode="scratch"
          sourceNode={null}
          existingCategories={overview.templateCategories}
          onOpenChange={(open) => {
            if (!open) setNewTemplateOpen(false);
          }}
          onCreated={handleTemplateCreated}
        />
      ) : null}
    </div>
  );
}
