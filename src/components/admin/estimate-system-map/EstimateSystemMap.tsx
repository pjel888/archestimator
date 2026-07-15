"use client";

import { useMemo, useState } from "react";

import { EstimateSystemGraph } from "./EstimateSystemGraph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs } from "@/components/ui/tabs";
import {
  findEstimateSystemArea,
  findEstimateSystemFeature,
  findEstimateSystemPage,
  type EstimateSystemDocumentation,
  type EstimateSystemFeature,
  type EstimateSystemPage,
  type EstimateSystemSource,
  type EstimateSystemView,
} from "@/lib/admin/estimate-system-map";

type EstimateSystemMapProps = Readonly<{
  documentation: EstimateSystemDocumentation;
}>;

const VIEW_TABS = [
  { id: "product", label: "Product" },
  { id: "features", label: "Features" },
  { id: "pages", label: "Pages" },
] as const;

function SourceNotes({ sources }: { sources: readonly EstimateSystemSource[] }) {
  return (
    <details className="border-t border-hairline pt-2">
      <summary className="cursor-pointer text-[9px] font-medium text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
        Source notes
      </summary>
      <ul className="mt-2 space-y-1.5">
        {sources.map((item) => (
          <li key={`${item.file}:${item.note}`} className="grid gap-0.5 text-[8px] leading-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:gap-3">
            <code className="break-all text-ink">{item.file}</code>
            <span className="text-tertiary">{item.note}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function DetailList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <section>
      <h3 className="text-[9px] font-medium text-ink">{title}</h3>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[9px] leading-4 text-secondary">
            <span className="mt-[6px] size-1 shrink-0 rounded-xs bg-tertiary" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NavigationButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="xs"
      aria-pressed={active}
      className="h-auto min-h-0 w-full min-w-0 flex-col items-start gap-0.5 whitespace-normal rounded-none border-l-2 border-transparent px-2 py-1.5 text-left aria-pressed:border-ink aria-pressed:bg-surfaceMuted"
      onClick={onClick}
    >
      <span className="text-[10px] leading-3 text-ink">{title}</span>
      {description ? <span className="line-clamp-2 text-[8px] font-normal leading-3 text-tertiary">{description}</span> : null}
    </Button>
  );
}

function ProductIndex({ documentation, onOpenPage }: { documentation: EstimateSystemDocumentation; onOpenPage: (pageId: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-px bg-hairline lg:block lg:gap-0 lg:divide-y lg:divide-hairline lg:bg-transparent">
      {documentation.areas.map((area, index) => (
        <div key={area.id} className="grid grid-cols-[22px_minmax(0,1fr)] gap-1.5 bg-surface px-2 py-2 lg:bg-transparent lg:px-0 lg:first:pt-0">
          <span className="text-[8px] font-medium tabular-nums text-tertiary">{String(index + 1).padStart(2, "0")}</span>
          <div>
            <p className="text-[10px] font-medium leading-3 text-ink">{area.title}</p>
            <p className="mt-0.5 hidden text-[8px] leading-3 text-tertiary lg:block">{area.userOutcome}</p>
            {area.pageIds[0] ? (
              <Button
                variant="plain"
                size="xs"
                className="mt-1 h-auto min-h-0 min-w-0 px-0 py-0 !text-[8px] underline decoration-divider underline-offset-2"
                onClick={() => onOpenPage(area.pageIds[0])}
              >
                <span className="lg:hidden">Open page</span>
                <span className="hidden lg:inline">Open page map</span>
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function FeatureDetails({
  documentation,
  feature,
  onOpenFeature,
  onOpenPage,
}: {
  documentation: EstimateSystemDocumentation;
  feature: EstimateSystemFeature;
  onOpenFeature: (featureId: string) => void;
  onOpenPage: (pageId: string) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="space-y-3">
        <section className="border-l-2 border-ink pl-2.5">
          <h3 className="text-[8px] font-medium uppercase text-tertiary">User need</h3>
          <p className="mt-0.5 text-[10px] leading-4 text-ink">{feature.userNeed}</p>
        </section>
        <DetailList title="Entry points" items={feature.entryPoints} />
      </div>
      <div className="space-y-3">
        <DetailList title="Behavior rules" items={feature.rules} />
        <section>
          <h3 className="text-[9px] font-medium text-ink">Related documentation</h3>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {feature.pageIds.map((pageId) => {
              const page = findEstimateSystemPage(documentation, pageId);
              if (!page) return null;
              return (
                <Button key={page.id} variant="outline" size="xs" className="min-w-0" onClick={() => onOpenPage(page.id)}>
                  Page · {page.title}
                </Button>
              );
            })}
            {feature.relatedFeatureIds.map((featureId) => {
              const related = findEstimateSystemFeature(documentation, featureId);
              if (!related) return null;
              return (
                <Button key={related.id} variant="ghost" size="xs" className="min-w-0" onClick={() => onOpenFeature(related.id)}>
                  Feature · {related.title}
                </Button>
              );
            })}
          </div>
        </section>
        <SourceNotes sources={feature.sources} />
      </div>
    </div>
  );
}

function PageDetails({ documentation, page }: { documentation: EstimateSystemDocumentation; page: EstimateSystemPage }) {
  const area = findEstimateSystemArea(documentation, page.ownerAreaId);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section>
        <h3 className="text-[9px] font-medium text-ink">Purpose</h3>
        <p className="mt-1 text-[9px] leading-4 text-secondary">{page.purpose}</p>
        <dl className="mt-2 grid gap-1 text-[9px] leading-3 sm:grid-cols-2">
          <div>
            <dt className="text-tertiary">Audience</dt>
            <dd className="mt-0.5 text-ink">{page.audience}</dd>
          </div>
          <div>
            <dt className="text-tertiary">Product area</dt>
            <dd className="mt-0.5 text-ink">{area?.title ?? page.ownerAreaId}</dd>
          </div>
        </dl>
      </section>
      <div className="space-y-3">
        <DetailList title="Primary actions" items={page.actions} />
        <SourceNotes sources={page.sources} />
      </div>
    </div>
  );
}

export function EstimateSystemMap({ documentation }: EstimateSystemMapProps) {
  const [view, setView] = useState<EstimateSystemView>("product");
  const [query, setQuery] = useState("");
  const [selectedFeatureId, setSelectedFeatureId] = useState(documentation.features[0]?.id ?? "");
  const [selectedPageId, setSelectedPageId] = useState(
    documentation.pages.find((page) => page.id === "estimate-workspace")?.id ?? documentation.pages[0]?.id ?? "",
  );

  const selectedFeature = findEstimateSystemFeature(documentation, selectedFeatureId);
  const selectedPage = findEstimateSystemPage(documentation, selectedPageId);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredFeatures = useMemo(
    () =>
      documentation.features.filter((feature) =>
        `${feature.title} ${feature.summary} ${feature.userNeed}`.toLowerCase().includes(normalizedQuery),
      ),
    [documentation.features, normalizedQuery],
  );
  const filteredPages = useMemo(
    () =>
      documentation.pages.filter((page) =>
        `${page.title} ${page.route} ${page.summary}`.toLowerCase().includes(normalizedQuery),
      ),
    [documentation.pages, normalizedQuery],
  );

  function changeView(nextView: string) {
    if (nextView !== "product" && nextView !== "features" && nextView !== "pages") return;
    setView(nextView);
    setQuery("");
  }

  function openFeature(featureId: string) {
    setSelectedFeatureId(featureId);
    setView("features");
    setQuery("");
  }

  function openPage(pageId: string) {
    setSelectedPageId(pageId);
    setView("pages");
    setQuery("");
  }

  const heading = view === "product"
    ? documentation.journey.title
    : view === "features"
      ? selectedFeature?.title ?? "Feature"
      : selectedPage?.title ?? "Page";
  const summary = view === "product"
    ? documentation.journey.summary
    : view === "features"
      ? selectedFeature?.summary ?? ""
      : selectedPage?.summary ?? "";

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-[8px] font-medium uppercase text-tertiary">Admin · Product documentation</p>
          <h1 className="mt-0.5 text-[12px] font-medium leading-5 text-ink">{documentation.title}</h1>
          <p className="mt-0.5 text-[10px] leading-4 text-secondary">{documentation.summary}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-[8px] text-tertiary">
          <Badge tone="neutral" size="xs" className="min-w-0 normal-case">Product-level</Badge>
          <span>Verified {documentation.lastVerified}</span>
        </div>
      </header>

      <Tabs
        tabs={VIEW_TABS.map((tab) => ({
          ...tab,
          badge:
            tab.id === "features"
              ? documentation.integrity.featureCount
              : tab.id === "pages"
                ? documentation.integrity.pageCount
                : documentation.integrity.areaCount,
        }))}
        activeId={view}
        onChange={changeView}
        ariaLabel="Estimate system documentation views"
        idBase="estimate-system-view"
        controlsPanels={false}
        getTabButtonProps={() => ({
          className: "focus-visible:bg-surfaceMuted focus-visible:ring-0 focus-visible:ring-offset-0",
        })}
      />

      <div
        id={`estimate-system-view-panel-${view}`}
        role="tabpanel"
        aria-labelledby={`estimate-system-view-tab-${view}`}
        tabIndex={0}
        className="grid min-h-[560px] overflow-hidden rounded-xs border border-hairline bg-surface lg:grid-cols-[230px_minmax(0,1fr)]"
      >
        <aside className="flex min-h-0 flex-col border-b border-hairline bg-surfaceMuted/25 lg:border-b-0 lg:border-r" aria-label="Documentation index">
          <div className="border-b border-hairline px-2.5 py-2">
            <p className="text-[9px] font-medium text-ink">
              {view === "product" ? "Product areas" : view === "features" ? "Feature index" : "Page index"}
            </p>
            <p className="mt-0.5 text-[8px] leading-3 text-tertiary">
              {view === "product"
                ? "The stable areas that make up the estimating product."
                : view === "features"
                  ? "Choose one user goal to see its flow."
                  : "Choose one page to see its purpose and connections."}
            </p>
            {view !== "product" ? (
              <SearchInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onClear={() => setQuery("")}
                placeholder={view === "features" ? "Find a feature" : "Find a page or route"}
                aria-label={view === "features" ? "Search features" : "Search pages"}
                wrapperClassName="mt-2"
              />
            ) : null}
          </div>

          <ScrollArea className="max-h-64 flex-1 px-2 py-2 lg:max-h-none" scrollShadows>
            {view === "product" ? (
              <ProductIndex documentation={documentation} onOpenPage={openPage} />
            ) : view === "features" ? (
              <div className="space-y-0.5">
                {filteredFeatures.map((feature) => (
                  <NavigationButton
                    key={feature.id}
                    active={feature.id === selectedFeatureId}
                    title={feature.title}
                    description={feature.summary}
                    onClick={() => setSelectedFeatureId(feature.id)}
                  />
                ))}
                {!filteredFeatures.length ? <p className="px-2 py-3 text-[9px] text-tertiary">No matching features.</p> : null}
              </div>
            ) : (
              <div className="space-y-3">
                {documentation.areas.map((area) => {
                  const pages = filteredPages.filter((page) => page.ownerAreaId === area.id);
                  if (!pages.length) return null;
                  return (
                    <section key={area.id}>
                      <h2 className="px-2 pb-1 text-[8px] font-medium uppercase text-tertiary">{area.title}</h2>
                      <div className="space-y-0.5">
                        {pages.map((page) => (
                          <NavigationButton
                            key={page.id}
                            active={page.id === selectedPageId}
                            title={page.title}
                            description={page.route}
                            onClick={() => setSelectedPageId(page.id)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
                {!filteredPages.length ? <p className="px-2 py-3 text-[9px] text-tertiary">No matching pages.</p> : null}
              </div>
            )}
          </ScrollArea>
        </aside>

        <ScrollArea className="min-h-0" scrollShadows>
          <main className="space-y-4 p-3 lg:p-4" aria-live="polite">
            <header className="flex flex-col gap-2 border-b border-hairline pb-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <p className="text-[8px] font-medium uppercase text-tertiary">
                  {view === "product" ? "Product journey" : view === "features" ? "Feature flow" : "Page record"}
                </p>
                <h2 className="mt-0.5 text-[12px] font-medium leading-5 text-ink">{heading}</h2>
                <p className="mt-0.5 text-[9px] leading-4 text-secondary">{summary}</p>
              </div>
              {view === "pages" && selectedPage ? (
                <code className="max-w-full shrink-0 break-all rounded-xs bg-surfaceMuted px-2 py-1 text-[8px] leading-3 text-ink">
                  {selectedPage.route}
                </code>
              ) : null}
            </header>

            <EstimateSystemGraph
              documentation={documentation}
              view={view}
              feature={selectedFeature}
              page={selectedPage}
              onOpenFeature={openFeature}
              onOpenPage={openPage}
            />

            {view === "product" ? (
              <section className="grid divide-y divide-hairline border-y border-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="py-2 sm:pr-3">
                  <h3 className="text-[9px] font-medium text-ink">Product</h3>
                  <p className="mt-0.5 text-[8px] leading-3 text-tertiary">Use this view to understand the main journey and product areas.</p>
                </div>
                <div className="py-2 sm:px-3">
                  <h3 className="text-[9px] font-medium text-ink">Features</h3>
                  <p className="mt-0.5 text-[8px] leading-3 text-tertiary">Use feature flows to understand how one user goal works.</p>
                </div>
                <div className="py-2 sm:pl-3">
                  <h3 className="text-[9px] font-medium text-ink">Pages</h3>
                  <p className="mt-0.5 text-[8px] leading-3 text-tertiary">Use page records to understand where work lives and what connects next.</p>
                </div>
              </section>
            ) : view === "features" && selectedFeature ? (
              <FeatureDetails
                documentation={documentation}
                feature={selectedFeature}
                onOpenFeature={openFeature}
                onOpenPage={openPage}
              />
            ) : view === "pages" && selectedPage ? (
              <PageDetails documentation={documentation} page={selectedPage} />
            ) : null}
          </main>
        </ScrollArea>
      </div>
    </div>
  );
}
