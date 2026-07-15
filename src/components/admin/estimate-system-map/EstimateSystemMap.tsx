"use client";

/* Hallmark · pre-emit critique: P5 H4 E4 S5 R5 V4 */

import { useEffect, useMemo, useRef, useState } from "react";

import { EstimateSystemGraph } from "./EstimateSystemGraph";
import { EstimateSystemKnowledgeGraph } from "./EstimateSystemKnowledgeGraph";
import { EstimateSystemUx, type EstimateSystemUxMode } from "./EstimateSystemUx";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs } from "@/components/ui/tabs";
import {
  ESTIMATE_SYSTEM_VIEWS,
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
  { id: "ux", label: "UX" },
  { id: "knowledge", label: "Knowledge" },
] as const;

function SourceNotes({ sources }: { sources: readonly EstimateSystemSource[] }) {
  return (
    <details className="border-t border-hairline pt-2">
      <summary className="cursor-pointer text-[9px] font-medium text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
        Source notes
      </summary>
      <ul className="mt-2 space-y-1.5">
        {sources.map((item) => (
          <li key={`${item.file}:${item.note}`} className="grid gap-0.5 text-[9px] leading-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:gap-3">
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
      className="h-auto min-h-0 w-full min-w-0 flex-col items-start gap-0.5 whitespace-normal rounded-xs px-2 py-1.5 text-left aria-pressed:bg-white aria-pressed:font-medium"
      onClick={onClick}
    >
      <span className="text-[10px] leading-3 text-ink">{title}</span>
      {description ? <span className="line-clamp-2 text-[10px] font-normal leading-4 text-tertiary">{description}</span> : null}
    </Button>
  );
}

function ProductIndex({ documentation, onOpenPage }: { documentation: EstimateSystemDocumentation; onOpenPage: (pageId: string) => void }) {
  return (
    <div className="divide-y divide-hairline">
      {documentation.areas.map((area) => (
        <div key={area.id} className="px-2 py-2 lg:px-0 lg:first:pt-0">
          <p className="text-[10px] font-medium leading-3 text-ink">{area.title}</p>
          <p className="mt-0.5 text-[10px] leading-4 text-tertiary">{area.userOutcome}</p>
          {area.pageIds[0] ? (
            <Button
              variant="plain"
              size="xs"
              className="mt-1 h-auto min-h-6 min-w-0 px-0 py-1 !text-[10px] underline decoration-divider underline-offset-2"
              onClick={() => onOpenPage(area.pageIds[0])}
            >
              <span className="lg:hidden">Open page</span>
              <span className="hidden lg:inline">Open page map</span>
            </Button>
          ) : null}
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
        <section>
          <h3 className="text-[9px] font-medium text-ink">User need</h3>
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
        <p className="mt-1 text-[10px] leading-4 text-secondary">{page.purpose}</p>
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
  const [uxQuery, setUxQuery] = useState("");
  const [uxMode, setUxMode] = useState<EstimateSystemUxMode>("journey");
  const [selectedPersonaId, setSelectedPersonaId] = useState(
    documentation.personas.find((persona) => persona.id === "estimator")?.id ?? documentation.personas[0]?.id ?? "",
  );
  const [selectedExperiencePathId, setSelectedExperiencePathId] = useState(
    documentation.experiencePaths.find((path) => path.id === "build-and-price-estimate")?.id
      ?? documentation.experiencePaths[0]?.id
      ?? "",
  );
  const [selectedFeatureId, setSelectedFeatureId] = useState(documentation.features[0]?.id ?? "");
  const [selectedPageId, setSelectedPageId] = useState(
    documentation.pages.find((page) => page.id === "estimate-workspace")?.id ?? documentation.pages[0]?.id ?? "",
  );
  const [mobileIndexOpen, setMobileIndexOpen] = useState(false);
  const contentHeadingRef = useRef<HTMLHeadingElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const focusDestinationRef = useRef(false);
  const [navigationStatus, setNavigationStatus] = useState("");
  const [navigationEpoch, setNavigationEpoch] = useState(0);

  const selectedFeatureCandidate = findEstimateSystemFeature(documentation, selectedFeatureId);
  const selectedPageCandidate = findEstimateSystemPage(documentation, selectedPageId);
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
  const selectedFeature = (!normalizedQuery || filteredFeatures.some((feature) => feature.id === selectedFeatureCandidate?.id)
    ? selectedFeatureCandidate
    : filteredFeatures[0]) ?? null;
  const selectedPage = (!normalizedQuery || filteredPages.some((page) => page.id === selectedPageCandidate?.id)
    ? selectedPageCandidate
    : filteredPages[0]) ?? null;

  function changeView(nextView: string) {
    if (!ESTIMATE_SYSTEM_VIEWS.includes(nextView as EstimateSystemView)) return;
    rootRef.current?.scrollIntoView({ block: "start", inline: "nearest" });
    setNavigationEpoch((current) => current + 1);
    setView(nextView as EstimateSystemView);
    setQuery("");
    setMobileIndexOpen(false);
  }

  function clearIndexQueryAndFocus() {
    setQuery("");
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function openFeature(featureId: string) {
    const feature = findEstimateSystemFeature(documentation, featureId);
    rootRef.current?.scrollIntoView({ block: "start", inline: "nearest" });
    setNavigationEpoch((current) => current + 1);
    focusDestinationRef.current = true;
    setSelectedFeatureId(featureId);
    setView("features");
    setQuery("");
    setMobileIndexOpen(false);
    setNavigationStatus(`Opened feature documentation: ${feature?.title ?? featureId}.`);
  }

  function openPage(pageId: string) {
    const page = findEstimateSystemPage(documentation, pageId);
    rootRef.current?.scrollIntoView({ block: "start", inline: "nearest" });
    setNavigationEpoch((current) => current + 1);
    focusDestinationRef.current = true;
    setSelectedPageId(pageId);
    setView("pages");
    setQuery("");
    setMobileIndexOpen(false);
    setNavigationStatus(`Opened page documentation: ${page?.title ?? pageId}.`);
  }

  useEffect(() => {
    if (!focusDestinationRef.current) return;
    focusDestinationRef.current = false;
    contentHeadingRef.current?.focus();
  }, [navigationEpoch, selectedFeatureId, selectedPageId, view]);

  const heading = view === "product"
    ? documentation.journey.title
    : view === "features"
      ? selectedFeature?.title ?? (normalizedQuery ? "No matching features" : "Feature")
      : view === "pages"
        ? selectedPage?.title ?? (normalizedQuery ? "No matching pages" : "Page")
        : view === "ux"
          ? "Users, paths, and intersections"
          : documentation.knowledgeGraph.title;
  const summary = view === "product"
    ? documentation.journey.summary
    : view === "features"
      ? selectedFeature?.summary ?? (normalizedQuery ? `No feature matches “${query.trim()}”.` : "")
      : view === "pages"
        ? selectedPage?.summary ?? (normalizedQuery ? `No page matches “${query.trim()}”.` : "")
        : view === "ux"
          ? "Understand who uses the product, the ordered path they follow, and where work changes hands."
          : documentation.knowledgeGraph.summary;
  const mobileIndexLabel = view === "product"
    ? "product areas"
    : view === "features"
      ? "features"
      : "pages";
  return (
    <div ref={rootRef} className="estimate-system-guide flex min-h-0 min-w-0 flex-col">
      <header className="px-1 pb-2">
        <div className="max-w-4xl">
          <h1 className="text-[12px] font-medium leading-4 text-ink">{documentation.title}</h1>
          <p className="mt-0.5 text-[10px] leading-4 text-secondary">{documentation.summary}</p>
        </div>
      </header>

      <Tabs
        tabs={VIEW_TABS}
        activeId={view}
        onChange={changeView}
        ariaLabel="Estimate system documentation views"
        idBase="estimate-system-view"
        className="sticky top-0 z-20 border-x border-t border-hairline bg-white/95 backdrop-blur-sm"
        getTabButtonProps={() => ({
          className: "text-secondary aria-selected:text-ink focus-visible:bg-surfaceMuted",
        })}
      />

      {VIEW_TABS.filter((tab) => tab.id !== view).map((tab) => (
        <div
          key={tab.id}
          id={`estimate-system-view-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`estimate-system-view-tab-${tab.id}`}
          hidden
        />
      ))}

      <p className="sr-only" role="status" aria-live="polite">{navigationStatus}</p>

      <div
        id={`estimate-system-view-panel-${view}`}
        role="tabpanel"
        aria-labelledby={`estimate-system-view-tab-${view}`}
        tabIndex={0}
        className="grid min-w-0 rounded-b-xs border-x border-b border-hairline bg-surface lg:grid-cols-[230px_minmax(0,1fr)]"
      >
        {view === "ux" ? (
          <EstimateSystemUx
            documentation={documentation}
            mode={uxMode}
            query={uxQuery}
            selectedPathId={selectedExperiencePathId}
            selectedPersonaId={selectedPersonaId}
            onModeChange={setUxMode}
            onQueryChange={setUxQuery}
            onSelectPath={setSelectedExperiencePathId}
            onSelectPersona={setSelectedPersonaId}
            onOpenFeature={openFeature}
            onOpenPage={openPage}
          />
        ) : view === "knowledge" ? (
          <EstimateSystemKnowledgeGraph
            graph={documentation.knowledgeGraph}
            onOpenFeature={openFeature}
            onOpenPage={openPage}
          />
        ) : (
          <>
            <aside className="min-h-0 border-b border-hairline bg-surfaceMuted/20 lg:border-b-0 lg:border-r" aria-label="Documentation index">
          <div className="p-2 lg:hidden">
            <Button
              variant="outline"
              size="xs"
              className="w-full min-w-0 justify-between"
              aria-expanded={mobileIndexOpen}
              aria-controls="estimate-system-guide-index-content"
              onClick={() => {
                const nextOpen = !mobileIndexOpen;
                setMobileIndexOpen(nextOpen);
                if (nextOpen && view !== "product") {
                  window.requestAnimationFrame(() => searchInputRef.current?.focus());
                }
              }}
            >
              {mobileIndexOpen ? `Hide ${mobileIndexLabel}` : `Browse ${mobileIndexLabel}`}
            </Button>
          </div>
          <div id="estimate-system-guide-index-content" className={`${mobileIndexOpen ? "block" : "hidden"} lg:block`}>
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
                ref={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onClear={clearIndexQueryAndFocus}
                placeholder={view === "features" ? "Find a feature" : "Find a page or route"}
                aria-label={view === "features" ? "Search features" : "Search pages"}
                wrapperClassName="mt-2 border border-hairline bg-white"
              />
            ) : null}
            </div>

            <div key={`guide-index-${view}-${navigationEpoch}`} className="px-2 py-2">
            {view === "product" ? (
              <ProductIndex documentation={documentation} onOpenPage={openPage} />
            ) : view === "features" ? (
              <div className="space-y-0.5">
                {filteredFeatures.map((feature) => (
                  <NavigationButton
                    key={feature.id}
                    active={feature.id === selectedFeature?.id}
                    title={feature.title}
                    description={feature.summary}
                    onClick={() => openFeature(feature.id)}
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
                      <p className="px-2 pb-1 text-[9px] font-medium text-secondary">{area.title}</p>
                      <div className="space-y-0.5">
                        {pages.map((page) => (
                          <NavigationButton
                            key={page.id}
                            active={page.id === selectedPage?.id}
                            title={page.title}
                            description={page.route}
                            onClick={() => openPage(page.id)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
                {!filteredPages.length ? <p className="px-2 py-3 text-[9px] text-tertiary">No matching pages.</p> : null}
              </div>
            )}
            </div>
          </div>
            </aside>

            <section key={`guide-record-${view}-${navigationEpoch}`} className="min-w-0 space-y-4 p-3 lg:p-4" aria-label="Selected estimate system guide record">
            <header className="flex flex-col gap-2 border-b border-hairline pb-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <h2
                  ref={contentHeadingRef}
                  tabIndex={-1}
                  className="text-[12px] font-medium leading-5 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {heading}
                </h2>
                <p className="mt-0.5 text-[10px] leading-4 text-secondary">{summary}</p>
              </div>
              {view === "pages" && selectedPage ? (
                <code className="max-w-full shrink-0 break-all rounded-xs bg-surfaceMuted px-2 py-1 text-[8px] leading-3 text-ink">
                  {selectedPage.route}
                </code>
              ) : null}
            </header>

            {(view === "features" && normalizedQuery && !selectedFeature) || (view === "pages" && normalizedQuery && !selectedPage) ? (
              <section className="rounded-xs border border-dashed border-hairline bg-surfaceMuted/25 p-3" role="status">
                <p className="text-[10px] font-medium text-ink">Nothing matches “{query.trim()}”.</p>
                <p className="mt-1 text-[9px] leading-4 text-secondary">Clear the search to restore the complete documentation index.</p>
                <Button variant="outline" size="xs" className="mt-2 min-w-0" onClick={clearIndexQueryAndFocus}>Clear search</Button>
              </section>
            ) : (
              <EstimateSystemGraph
                documentation={documentation}
                view={view}
                feature={selectedFeature}
                page={selectedPage}
                onOpenFeature={openFeature}
                onOpenPage={openPage}
              />
            )}

            {view === "features" && selectedFeature ? (
              <FeatureDetails
                documentation={documentation}
                feature={selectedFeature}
                onOpenFeature={openFeature}
                onOpenPage={openPage}
              />
            ) : view === "pages" && selectedPage ? (
              <PageDetails documentation={documentation} page={selectedPage} />
            ) : null}
              </section>
          </>
        )}
      </div>
    </div>
  );
}
