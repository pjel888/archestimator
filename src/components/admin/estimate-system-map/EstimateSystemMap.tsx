"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

import { EstimateSystemGraph } from "./EstimateSystemGraph";
import { EstimateSystemUx, type EstimateSystemUxMode } from "./EstimateSystemUx";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Tabs } from "@/components/ui/tabs";
import {
  ESTIMATE_SYSTEM_VIEWS,
  findEstimateSystemArea,
  findEstimateSystemFeature,
  findEstimateSystemPage,
  type EstimateSystemArea,
  type EstimateSystemDocumentation,
  type EstimateSystemFeature,
  type EstimateSystemPage,
  type EstimateSystemSource,
  type EstimateSystemView,
} from "@/lib/admin/estimate-system-map";

const EstimateSystemKnowledgeGraph = dynamic(
  () => import("./EstimateSystemKnowledgeGraph").then((module) => module.EstimateSystemKnowledgeGraph),
  { ssr: false, loading: () => <p className="p-4 text-[10px] text-secondary">Loading knowledge graph…</p> },
);

type EstimateSystemMapProps = Readonly<{ documentation: EstimateSystemDocumentation }>;
type BrowseKind = "areas" | "features" | "pages";

const VIEW_TABS = [
  { id: "overview", label: "Overview" },
  { id: "browse", label: "Browse" },
  { id: "journeys", label: "Journeys" },
  { id: "knowledge", label: "Knowledge" },
] as const;

const BROWSE_OPTIONS = [
  { value: "areas", label: "Areas" },
  { value: "features", label: "Features" },
  { value: "pages", label: "Pages" },
] as const;

function SourceNotes({ sources }: { sources: readonly EstimateSystemSource[] }) {
  return (
    <details className="border-t border-hairline pt-2">
      <summary className="cursor-pointer text-[10px] font-medium text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">Source notes</summary>
      <ul className="mt-2 space-y-1.5">
        {sources.map((item) => (
          <li key={`${item.file}:${item.note}`} className="grid gap-0.5 text-[10px] leading-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:gap-3">
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
      <h3 className="text-[10px] font-medium text-ink">{title}</h3>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[10px] leading-4 text-secondary">
            <span className="mt-[6px] size-1 shrink-0 rounded-xs bg-tertiary" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NavigationButton({ active, title, description, onClick }: { active: boolean; title: string; description?: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="xs" aria-pressed={active} className="h-auto min-h-0 w-full min-w-0 flex-col items-start gap-0.5 whitespace-normal rounded-xs px-2 py-1.5 text-left aria-pressed:bg-white aria-pressed:font-medium" onClick={onClick}>
      <span className="text-[10px] leading-3 text-ink">{title}</span>
      {description ? <span className="line-clamp-2 text-[10px] font-normal leading-4 text-tertiary">{description}</span> : null}
    </Button>
  );
}

function FeatureDetails({ documentation, feature, onOpenFeature, onOpenPage }: { documentation: EstimateSystemDocumentation; feature: EstimateSystemFeature; onOpenFeature: (featureId: string) => void; onOpenPage: (pageId: string) => void }) {
  const area = findEstimateSystemArea(documentation, feature.ownerAreaId);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="space-y-3">
        <section><h3 className="text-[10px] font-medium text-ink">User need</h3><p className="mt-0.5 text-[10px] leading-4 text-ink">{feature.userNeed}</p><p className="mt-2 text-[10px] leading-4 text-secondary">Product area · {area?.title ?? feature.ownerAreaId}</p></section>
        <DetailList title="Entry points" items={feature.entryPoints} />
      </div>
      <div className="space-y-3">
        <DetailList title="Behavior rules" items={feature.rules} />
        <section><h3 className="text-[10px] font-medium text-ink">Related documentation</h3><div className="mt-1.5 flex flex-wrap gap-1">
          {feature.pageIds.map((pageId) => { const page = findEstimateSystemPage(documentation, pageId); return page ? <Button key={page.id} variant="outline" size="xs" className="min-w-0" onClick={() => onOpenPage(page.id)}>Page · {page.title}</Button> : null; })}
          {feature.relatedFeatureIds.map((featureId) => { const related = findEstimateSystemFeature(documentation, featureId); return related ? <Button key={related.id} variant="ghost" size="xs" className="min-w-0" onClick={() => onOpenFeature(related.id)}>Feature · {related.title}</Button> : null; })}
        </div></section>
        <SourceNotes sources={feature.sources} />
      </div>
    </div>
  );
}

function PageDetails({ documentation, page }: { documentation: EstimateSystemDocumentation; page: EstimateSystemPage }) {
  const area = findEstimateSystemArea(documentation, page.ownerAreaId);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section><h3 className="text-[10px] font-medium text-ink">Purpose</h3><p className="mt-1 text-[10px] leading-4 text-secondary">{page.purpose}</p><dl className="mt-2 grid gap-1 text-[10px] leading-4 sm:grid-cols-2"><div><dt className="text-tertiary">Audience</dt><dd className="mt-0.5 text-ink">{page.audience}</dd></div><div><dt className="text-tertiary">Product area</dt><dd className="mt-0.5 text-ink">{area?.title ?? page.ownerAreaId}</dd></div></dl></section>
      <div className="space-y-3"><DetailList title="Primary actions" items={page.actions} /><SourceNotes sources={page.sources} /></div>
    </div>
  );
}

function AreaDetails({ documentation, area, onOpenFeature, onOpenPage }: { documentation: EstimateSystemDocumentation; area: EstimateSystemArea; onOpenFeature: (featureId: string) => void; onOpenPage: (pageId: string) => void }) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 border-y border-hairline py-3 sm:grid-cols-2"><div><h3 className="text-[10px] font-medium text-ink">Summary</h3><p className="mt-1 text-[10px] leading-4 text-secondary">{area.summary}</p></div><div><h3 className="text-[10px] font-medium text-ink">User outcome</h3><p className="mt-1 text-[10px] leading-4 text-secondary">{area.userOutcome}</p></div></section>
      <section><h3 className="text-[10px] font-medium text-ink">Linked pages · {area.pageIds.length}</h3><div className="mt-2 flex flex-wrap gap-1">{area.pageIds.map((pageId) => { const page = findEstimateSystemPage(documentation, pageId); return page ? <Button key={page.id} variant="outline" size="xs" onClick={() => onOpenPage(page.id)}>Page · {page.title}</Button> : null; })}</div></section>
      <section><h3 className="text-[10px] font-medium text-ink">Linked features · {area.featureIds.length}</h3><div className="mt-2 flex flex-wrap gap-1">{area.featureIds.map((featureId) => { const feature = findEstimateSystemFeature(documentation, featureId); return feature ? <Button key={feature.id} variant="ghost" size="xs" onClick={() => onOpenFeature(feature.id)}>Feature · {feature.title}</Button> : null; })}</div></section>
    </div>
  );
}

export function EstimateSystemMap({ documentation }: EstimateSystemMapProps) {
  const [view, setView] = useState<EstimateSystemView>("overview");
  const [browseKind, setBrowseKind] = useState<BrowseKind>("areas");
  const [query, setQuery] = useState("");
  const [uxQuery, setUxQuery] = useState("");
  const [uxMode, setUxMode] = useState<EstimateSystemUxMode>("journey");
  const [selectedPersonaId, setSelectedPersonaId] = useState(documentation.personas.find((persona) => persona.id === "estimator")?.id ?? documentation.personas[0]?.id ?? "");
  const [selectedExperiencePathId, setSelectedExperiencePathId] = useState(documentation.experiencePaths.find((path) => path.id === "build-and-price-estimate")?.id ?? documentation.experiencePaths[0]?.id ?? "");
  const [selectedAreaId, setSelectedAreaId] = useState(documentation.areas[0]?.id ?? "");
  const [selectedFeatureId, setSelectedFeatureId] = useState(documentation.features[0]?.id ?? "");
  const [selectedPageId, setSelectedPageId] = useState(documentation.pages.find((page) => page.id === "estimate-workspace")?.id ?? documentation.pages[0]?.id ?? "");
  const [mobileIndexOpen, setMobileIndexOpen] = useState(false);
  const [navigationStatus, setNavigationStatus] = useState("");
  const contentHeadingRef = useRef<HTMLHeadingElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const focusDestinationRef = useRef(false);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredAreas = useMemo(() => documentation.areas.filter((area) => `${area.title} ${area.summary} ${area.userOutcome}`.toLowerCase().includes(normalizedQuery)), [documentation.areas, normalizedQuery]);
  const filteredFeatures = useMemo(() => documentation.features.filter((feature) => `${feature.title} ${feature.summary} ${feature.userNeed}`.toLowerCase().includes(normalizedQuery)), [documentation.features, normalizedQuery]);
  const filteredPages = useMemo(() => documentation.pages.filter((page) => `${page.title} ${page.route} ${page.summary} ${page.purpose}`.toLowerCase().includes(normalizedQuery)), [documentation.pages, normalizedQuery]);
  const selectedArea = findEstimateSystemArea(documentation, selectedAreaId);
  const selectedFeature = findEstimateSystemFeature(documentation, selectedFeatureId);
  const selectedPage = findEstimateSystemPage(documentation, selectedPageId);
  const browseItems = browseKind === "areas" ? filteredAreas : browseKind === "features" ? filteredFeatures : filteredPages;
  const selectedRecord = browseKind === "areas" ? selectedArea : browseKind === "features" ? selectedFeature : selectedPage;

  function changeView(nextView: string) {
    if (!ESTIMATE_SYSTEM_VIEWS.includes(nextView as EstimateSystemView)) return;
    rootRef.current?.scrollIntoView({ block: "start", inline: "nearest" });
    setView(nextView as EstimateSystemView);
    setQuery("");
    setMobileIndexOpen(false);
  }

  function selectBrowseKind(nextKind: BrowseKind) {
    setBrowseKind(nextKind);
    setQuery("");
    setMobileIndexOpen(false);
  }

  function clearQueryAndFocus() {
    setQuery("");
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function openFeature(featureId: string) {
    const feature = findEstimateSystemFeature(documentation, featureId);
    focusDestinationRef.current = true;
    setSelectedFeatureId(featureId);
    setBrowseKind("features");
    setView("browse");
    setQuery("");
    setMobileIndexOpen(false);
    setNavigationStatus(`Opened feature documentation: ${feature?.title ?? featureId}.`);
  }

  function openPage(pageId: string) {
    const page = findEstimateSystemPage(documentation, pageId);
    focusDestinationRef.current = true;
    setSelectedPageId(pageId);
    setBrowseKind("pages");
    setView("browse");
    setQuery("");
    setMobileIndexOpen(false);
    setNavigationStatus(`Opened page documentation: ${page?.title ?? pageId}.`);
  }

  useEffect(() => {
    if (!focusDestinationRef.current) return;
    focusDestinationRef.current = false;
    contentHeadingRef.current?.focus();
  }, [browseKind, selectedFeatureId, selectedPageId, view]);

  return (
    <div ref={rootRef} className="estimate-system-guide flex min-h-0 min-w-0 flex-col">
      <header className="px-1 pb-2"><h1 className="text-[12px] font-medium leading-4 text-ink">{documentation.title}</h1><p className="mt-0.5 max-w-4xl text-[10px] leading-4 text-secondary">{documentation.summary}</p></header>
      <Tabs tabs={VIEW_TABS} activeId={view} onChange={changeView} ariaLabel="Estimate system documentation views" idBase="estimate-system-view" className="sticky top-0 z-20 border-x border-t border-hairline bg-white" getTabButtonProps={() => ({ className: "text-secondary aria-selected:text-ink focus-visible:bg-surfaceMuted" })} />
      <p className="sr-only" role="status" aria-live="polite">{navigationStatus}</p>
      <div id={`estimate-system-view-panel-${view}`} role="tabpanel" aria-labelledby={`estimate-system-view-tab-${view}`} tabIndex={0} className="min-w-0 rounded-b-xs border-x border-b border-hairline bg-surface">
        {view === "overview" ? (
          <section className="space-y-5 p-3 lg:p-4">
            <header className="grid gap-3 border-b border-hairline pb-3 sm:grid-cols-[minmax(0,1fr)_auto]"><div><h2 className="text-[12px] font-medium leading-5 text-ink">{documentation.journey.title}</h2><p className="mt-0.5 text-[10px] leading-4 text-secondary">{documentation.journey.summary}</p></div><dl className="grid grid-cols-2 gap-x-4 text-[10px] leading-4 sm:block"><div><dt className="text-tertiary">Version</dt><dd className="text-ink">{documentation.version}</dd></div><div><dt className="mt-1 text-tertiary">Last verified</dt><dd className="text-ink">{documentation.lastVerified}</dd></div></dl></header>
            <EstimateSystemGraph documentation={documentation} view="product" feature={null} page={null} onOpenFeature={openFeature} onOpenPage={openPage} />
            <section><h2 className="text-[11px] font-medium text-ink">Product areas</h2><div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{documentation.areas.map((area) => <button key={area.id} type="button" className="border border-hairline p-3 text-left hover:bg-surfaceMuted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" onClick={() => { setSelectedAreaId(area.id); setBrowseKind("areas"); setView("browse"); }}><h3 className="text-[10px] font-medium text-ink">{area.title}</h3><p className="mt-1 text-[10px] leading-4 text-secondary">{area.summary}</p><p className="mt-2 text-[10px] leading-4 text-ink">{area.userOutcome}</p><p className="mt-2 text-[10px] text-tertiary">{area.pageIds.length} pages · {area.featureIds.length} features</p></button>)}</div></section>
          </section>
        ) : view === "journeys" ? (
          <EstimateSystemUx documentation={documentation} mode={uxMode} query={uxQuery} selectedPathId={selectedExperiencePathId} selectedPersonaId={selectedPersonaId} onModeChange={setUxMode} onQueryChange={setUxQuery} onSelectPath={setSelectedExperiencePathId} onSelectPersona={setSelectedPersonaId} onOpenFeature={openFeature} onOpenPage={openPage} />
        ) : view === "knowledge" ? (
          <EstimateSystemKnowledgeGraph graph={documentation.knowledgeGraph} onOpenFeature={openFeature} onOpenPage={openPage} />
        ) : (
          <div className="grid lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="border-b border-hairline bg-surfaceMuted/20 lg:border-b-0 lg:border-r" aria-label="Documentation browser">
              <div className="p-2 lg:hidden"><Button variant="outline" size="xs" className="w-full justify-between" aria-expanded={mobileIndexOpen} onClick={() => { setMobileIndexOpen((open) => !open); window.requestAnimationFrame(() => searchInputRef.current?.focus()); }}>{mobileIndexOpen ? "Hide index" : "Browse index"}</Button></div>
              <div className={`${mobileIndexOpen ? "block" : "hidden"} lg:block`}><div className="space-y-2 border-b border-hairline p-3"><SegmentedControl ariaLabel="Browse documentation by" options={BROWSE_OPTIONS} value={browseKind} onValueChange={selectBrowseKind} className="w-full" /><p className="text-[10px] leading-4 text-tertiary">Search {browseKind} and select a record to inspect its connected documentation.</p><SearchInput ref={searchInputRef} value={query} onChange={(event) => setQuery(event.target.value)} onClear={clearQueryAndFocus} placeholder={`Find ${browseKind.slice(0, -1)}`} aria-label={`Search ${browseKind}`} wrapperClassName="border border-hairline bg-white" /></div>
                <div className="space-y-0.5 p-2">{browseItems.map((item) => <NavigationButton key={item.id} active={item.id === selectedRecord?.id} title={item.title} description={browseKind === "pages" ? (item as EstimateSystemPage).route : item.summary} onClick={() => { if (browseKind === "areas") setSelectedAreaId(item.id); if (browseKind === "features") setSelectedFeatureId(item.id); if (browseKind === "pages") setSelectedPageId(item.id); setMobileIndexOpen(false); }} />)}{!browseItems.length ? <p className="px-2 py-3 text-[10px] text-tertiary">No matching {browseKind}.</p> : null}</div>
              </div>
            </aside>
            <section className="min-w-0 space-y-4 p-3 lg:p-4" aria-label="Selected estimate system record">
              {selectedRecord ? <><header className="flex flex-col gap-2 border-b border-hairline pb-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 ref={contentHeadingRef} tabIndex={-1} className="text-[12px] font-medium leading-5 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">{selectedRecord.title}</h2><p className="mt-0.5 text-[10px] leading-4 text-secondary">{selectedRecord.summary}</p></div>{browseKind === "pages" ? <code className="break-all rounded-xs bg-surfaceMuted px-2 py-1 text-[10px] text-ink">{selectedPage?.route}</code> : null}</header>
                {browseKind === "areas" && selectedArea ? <AreaDetails documentation={documentation} area={selectedArea} onOpenFeature={openFeature} onOpenPage={openPage} /> : null}
                {browseKind === "features" && selectedFeature ? <><EstimateSystemGraph documentation={documentation} view="features" feature={selectedFeature} page={null} onOpenFeature={openFeature} onOpenPage={openPage} /><FeatureDetails documentation={documentation} feature={selectedFeature} onOpenFeature={openFeature} onOpenPage={openPage} /></> : null}
                {browseKind === "pages" && selectedPage ? <><EstimateSystemGraph documentation={documentation} view="pages" feature={null} page={selectedPage} onOpenFeature={openFeature} onOpenPage={openPage} /><PageDetails documentation={documentation} page={selectedPage} /></> : null}
              </> : <section className="border border-dashed border-hairline p-3"><p className="text-[10px] font-medium text-ink">Nothing matches “{query.trim()}”.</p><Button variant="outline" size="xs" className="mt-2" onClick={clearQueryAndFocus}>Clear search</Button></section>}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
