"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  findEstimateSystemExperiencePath,
  findEstimateSystemFeature,
  findEstimateSystemPage,
  findEstimateSystemPersona,
  resolveEstimateSystemExperienceStep,
  type EstimateSystemDocumentation,
  type EstimateSystemExperiencePath,
  type EstimateSystemIntersection,
  type EstimateSystemPersona,
  type EstimateSystemSource,
} from "@/lib/admin/estimate-system-map";
import { cn } from "@/lib/ui/cn";

export type EstimateSystemUxMode = "journey" | "intersections";

type EstimateSystemUxProps = Readonly<{
  documentation: EstimateSystemDocumentation;
  mode: EstimateSystemUxMode;
  query: string;
  selectedPathId: string;
  selectedPersonaId: string;
  onModeChange: (mode: EstimateSystemUxMode) => void;
  onQueryChange: (query: string) => void;
  onSelectPath: (pathId: string) => void;
  onSelectPersona: (personaId: string) => void;
  onOpenFeature: (featureId: string) => void;
  onOpenPage: (pageId: string) => void;
}>;

const PERSONA_GROUPS = [
  { id: "internal", label: "Internal users" },
  { id: "external", label: "External users" },
  { id: "operational", label: "Operational" },
] as const;

function SourceNotes({ sources }: { sources: readonly EstimateSystemSource[] }) {
  return (
    <details className="border-t border-hairline pt-2">
      <summary className="cursor-pointer text-[9px] font-medium text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
        Source notes
      </summary>
      <ul className="mt-2 space-y-1.5">
        {sources.map((source) => (
          <li key={`${source.file}:${source.note}`} className="grid gap-0.5 text-[8px] leading-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:gap-3">
            <code className="break-all text-ink">{source.file}</code>
            <span className="text-secondary">{source.note}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function PersonaDetailList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <section>
      <h3 className="text-[9px] font-medium text-ink">{title}</h3>
      {items.length ? (
        <ul className="mt-1.5 space-y-1">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-[9px] leading-4 text-secondary">
              <span className="mt-[6px] size-1 shrink-0 rounded-xs bg-tertiary" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[9px] leading-4 text-secondary">No unresolved assumptions recorded.</p>
      )}
    </section>
  );
}

function PersonaProfile({ persona }: { persona: EstimateSystemPersona }) {
  return (
    <section className="space-y-3 border-t border-hairline pt-3" aria-labelledby="ux-persona-profile-heading">
      <div>
        <h3 id="ux-persona-profile-heading" className="text-[10px] font-medium text-ink">{persona.title} context</h3>
        <p className="mt-0.5 text-[8px] text-tertiary">{persona.group.replace("-", " ")}</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
        <PersonaDetailList title="Observed contexts" items={persona.contexts} />
        <PersonaDetailList title="Jobs and behaviors" items={[...persona.jobs, ...persona.behaviors]} />
        <PersonaDetailList title="Needs and constraints" items={[...persona.needs, ...persona.constraints]} />
        <PersonaDetailList title="Open assumptions" items={persona.unresolvedAssumptions} />
      </div>
      <div className="grid divide-y divide-hairline border-y border-hairline sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="py-2 sm:pr-3">
          <p className="text-[8px] font-medium text-secondary">Access path</p>
          <p className="mt-0.5 text-[9px] leading-4 text-ink">{persona.accessPath}</p>
        </div>
        <div className="py-2 sm:pl-3">
          <p className="text-[8px] font-medium text-secondary">Success signal</p>
          <p className="mt-0.5 text-[9px] leading-4 text-ink">{persona.successSignal}</p>
        </div>
      </div>
      <SourceNotes sources={persona.sources} />
    </section>
  );
}

function JourneyFlow({
  documentation,
  path,
  onOpenFeature,
  onOpenPage,
}: {
  documentation: EstimateSystemDocumentation;
  path: EstimateSystemExperiencePath;
  onOpenFeature: (featureId: string) => void;
  onOpenPage: (pageId: string) => void;
}) {
  return (
    <section aria-labelledby="ux-happy-path-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="ux-happy-path-heading" className="text-[9px] font-medium text-ink">Ordered path</h3>
      </div>
      <ol className="mt-2 divide-y divide-hairline border-y border-hairline" aria-label={`${path.title} ordered steps`}>
        {path.steps.map((step, index) => {
          const resolved = resolveEstimateSystemExperienceStep(documentation, step);
          if (!resolved) return null;
          const actor = findEstimateSystemPersona(documentation, resolved.actorPersonaId);
          const page = resolved.pageId ? findEstimateSystemPage(documentation, resolved.pageId) : null;
          return (
            <li key={step.id} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 py-2.5">
              <span className={cn("pt-0.5 text-[8px] font-medium tabular-nums", resolved.state === "partial" ? "text-warning" : "text-tertiary")} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <article
                aria-label={`Step ${index + 1} of ${path.steps.length}: ${resolved.title}`}
                className="min-w-0"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  {actor ? <span className="text-[8px] text-tertiary">{actor.title}</span> : null}
                  {resolved.state === "partial" ? <span className="text-[9px] font-medium text-warning">Coverage gap</span> : null}
                </div>
                <h4 className="mt-1 text-[10px] font-medium leading-4 text-ink">{resolved.title}</h4>
                <p className="mt-0.5 text-[9px] leading-4 text-secondary">{resolved.description}</p>
                {resolved.result ? (
                  <p className="mt-1 text-[9px] leading-4 text-ink"><span className="text-tertiary">Result: </span>{resolved.result}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1">
                  {page ? (
                    <Button variant="outline" size="xs" className="min-w-0" onClick={() => onOpenPage(page.id)}>
                      Page · {page.title}
                    </Button>
                  ) : null}
                  {resolved.featureIds.map((featureId) => {
                    const feature = findEstimateSystemFeature(documentation, featureId);
                    if (!feature) return null;
                    return (
                      <Button key={feature.id} variant="ghost" size="xs" className="min-w-0" onClick={() => onOpenFeature(feature.id)}>
                        Feature · {feature.title}
                      </Button>
                    );
                  })}
                </div>
              </article>
            </li>
          );
        })}
      </ol>
      <dl className="grid gap-1 border-b border-hairline py-2.5 sm:grid-cols-[90px_minmax(0,1fr)]">
        <dt className="text-[8px] font-medium text-tertiary">Path outcome</dt>
        <dd className="text-[9px] leading-4 text-ink">{path.outcome}</dd>
      </dl>
    </section>
  );
}

function IntersectionList({
  documentation,
  intersections,
  onOpenFeature,
  onOpenPage,
  onSelectRelatedPath,
}: {
  documentation: EstimateSystemDocumentation;
  intersections: readonly EstimateSystemIntersection[];
  onOpenFeature: (featureId: string) => void;
  onOpenPage: (pageId: string) => void;
  onSelectRelatedPath: (pathId: string) => void;
}) {
  return (
    <ol className="divide-y divide-hairline border-y border-hairline bg-white" aria-label="Experience path intersections">
      {intersections.map((intersection) => {
        const fromPath = findEstimateSystemExperiencePath(documentation, intersection.fromPathId);
        const toPath = findEstimateSystemExperiencePath(documentation, intersection.toPathId);
        const owner = findEstimateSystemPersona(documentation, intersection.responsiblePersonaId);
        const page = intersection.pageId ? findEstimateSystemPage(documentation, intersection.pageId) : null;
        return (
          <li key={intersection.id} className="grid gap-2 px-2.5 py-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                {intersection.status === "partial" ? <span className="text-[9px] font-medium text-warning">Coverage gap</span> : null}
                <span className="text-[8px] text-tertiary">{intersection.kind}</span>
                {owner ? <span className="text-[8px] text-secondary">Owner · {owner.title}</span> : null}
              </div>
              <h4 className="mt-1 text-[10px] font-medium leading-4 text-ink">{intersection.title}</h4>
              <p className="mt-0.5 text-[9px] leading-4 text-secondary">{intersection.summary}</p>
              <p className="mt-1.5 text-[8px] leading-3 text-secondary">When: {intersection.condition}</p>
              <p className="mt-0.5 text-[9px] leading-4 text-ink">Result: {intersection.result}</p>
            </div>
            <div className="flex flex-col justify-between gap-2 border-t border-hairline pt-2 lg:border-l lg:border-t-0 lg:pl-2 lg:pt-0">
              <div className="flex flex-wrap items-center gap-1">
                {fromPath ? (
                  <Button aria-label={`From path: ${fromPath.title}`} variant="plain" size="xs" className="h-auto min-h-6 min-w-0 px-0 py-1 !text-[9px] underline" onClick={() => onSelectRelatedPath(fromPath.id)}>
                    {fromPath.title}
                  </Button>
                ) : null}
                <ArrowRight size={16} className="text-tertiary" aria-hidden="true" />
                {toPath ? (
                  <Button aria-label={`To path: ${toPath.title}`} variant="plain" size="xs" className="h-auto min-h-6 min-w-0 px-0 py-1 !text-[9px] underline" onClick={() => onSelectRelatedPath(toPath.id)}>
                    {toPath.title}
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1">
                {page ? <Button variant="outline" size="xs" className="min-w-0" onClick={() => onOpenPage(page.id)}>Page · {page.title}</Button> : null}
                {intersection.featureIds.map((featureId) => {
                  const feature = findEstimateSystemFeature(documentation, featureId);
                  if (!feature) return null;
                  return <Button key={feature.id} variant="ghost" size="xs" className="min-w-0" onClick={() => onOpenFeature(feature.id)}>Feature · {feature.title}</Button>;
                })}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PathNetworkCard({
  active,
  path,
  persona,
  onClick,
}: {
  active: boolean;
  path: EstimateSystemExperiencePath;
  persona: EstimateSystemPersona | null;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="xs"
      aria-pressed={active}
      className="h-auto min-h-0 w-full min-w-0 flex-col items-start justify-start gap-0.5 whitespace-normal rounded-xs px-2.5 py-2 text-left aria-pressed:bg-surfaceMuted aria-pressed:font-medium"
      onClick={onClick}
    >
      <span className="text-[8px] font-medium text-secondary">{persona?.title ?? "User"}</span>
      <span className="text-[10px] font-medium leading-4 text-ink">{path.title}</span>
      <span className="line-clamp-2 text-[10px] font-normal leading-4 text-secondary">{path.outcome}</span>
    </Button>
  );
}

function IntersectionNetwork({
  documentation,
  selectedPathId,
  onOpenFeature,
  onOpenPage,
  onSelectRelatedPath,
}: {
  documentation: EstimateSystemDocumentation;
  selectedPathId: string;
  onOpenFeature: (featureId: string) => void;
  onOpenPage: (pageId: string) => void;
  onSelectRelatedPath: (pathId: string) => void;
}) {
  const corePaths = documentation.experienceMap.corePathIds.flatMap((pathId) => {
    const path = findEstimateSystemExperiencePath(documentation, pathId);
    return path ? [path] : [];
  });
  const supportPaths = documentation.experienceMap.supportPathIds.flatMap((pathId) => {
    const path = findEstimateSystemExperiencePath(documentation, pathId);
    return path ? [path] : [];
  });
  const partialPath = findEstimateSystemExperiencePath(documentation, documentation.experienceMap.partialReturnPathId);

  return (
    <section className="space-y-3" aria-labelledby="ux-intersection-network-heading">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 id="ux-intersection-network-heading" className="text-[9px] font-medium text-ink">Core handoff chain</h3>
            <p className="mt-0.5 text-[8px] leading-3 text-secondary">Authoring moves to publication, external review, and internal response triage.</p>
          </div>
        </div>
        <ol className="mt-2 flex flex-col gap-1 border-y border-hairline py-1 2xl:flex-row 2xl:items-stretch" aria-label="Core experience handoff chain">
          {corePaths.map((path, index) => (
            <li key={path.id} className="contents">
              <div className="min-w-0 flex-1">
                <PathNetworkCard
                  active={path.id === selectedPathId}
                  path={path}
                  persona={findEstimateSystemPersona(documentation, path.primaryPersonaId)}
                  onClick={() => onSelectRelatedPath(path.id)}
                />
              </div>
              {index < corePaths.length - 1 ? (
                <div className="flex shrink-0 items-center justify-center text-tertiary" aria-hidden="true">
                  <ArrowRight size={14} className="hidden 2xl:block" />
                  <ArrowDown size={14} className="2xl:hidden" />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
        <section className="border-t border-hairline pt-3" aria-labelledby="ux-support-paths-heading">
          <h3 id="ux-support-paths-heading" className="text-[9px] font-medium text-ink">Paths that feed or follow authoring</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {supportPaths.map((path) => (
              <PathNetworkCard
                key={path.id}
                active={path.id === selectedPathId}
                path={path}
                persona={findEstimateSystemPersona(documentation, path.primaryPersonaId)}
                onClick={() => onSelectRelatedPath(path.id)}
              />
            ))}
          </div>
        </section>
        {partialPath ? (
          <section className="rounded-xs border border-warning/30 bg-warning/5 p-3" aria-labelledby="ux-partial-return-heading">
            <h3 id="ux-partial-return-heading" className="text-[9px] font-medium text-ink">Changes-requested return gap</h3>
            <p className="mt-1 text-[9px] leading-4 text-secondary">Approval and decline end in monitoring. A change request begins a manual continuity gap back to the source estimate.</p>
            <Button variant="outline" size="xs" className="mt-2 min-w-0" onClick={() => onSelectRelatedPath(partialPath.id)}>
              Open partial path
            </Button>
          </section>
        ) : null}
      </div>

      <section aria-labelledby="ux-all-intersections-heading">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 id="ux-all-intersections-heading" className="text-[9px] font-medium text-ink">All documented intersections</h3>
            <p className="mt-0.5 text-[8px] leading-3 text-secondary">This list is the complete non-spatial equivalent of the connected lanes.</p>
          </div>
        </div>
        <IntersectionList
          documentation={documentation}
          intersections={documentation.intersections}
          onOpenFeature={onOpenFeature}
          onOpenPage={onOpenPage}
          onSelectRelatedPath={onSelectRelatedPath}
        />
      </section>
    </section>
  );
}

function pathMatchLabel(
  documentation: EstimateSystemDocumentation,
  path: EstimateSystemExperiencePath,
  normalizedQuery: string,
) {
  if (!normalizedQuery) return path.summary;
  if (`${path.title} ${path.summary} ${path.trigger} ${path.outcome}`.toLowerCase().includes(normalizedQuery)) {
    return "Matches journey details";
  }

  for (const step of path.steps) {
    const resolved = resolveEstimateSystemExperienceStep(documentation, step);
    if (!resolved) continue;
    if (`${resolved.title} ${resolved.description} ${resolved.result ?? ""}`.toLowerCase().includes(normalizedQuery)) {
      return `Matches step · ${resolved.title}`;
    }
    if (resolved.pageId) {
      const page = findEstimateSystemPage(documentation, resolved.pageId);
      if (page && `${page.title} ${page.route}`.toLowerCase().includes(normalizedQuery)) {
        return `Matches page · ${page.title}`;
      }
    }
    for (const featureId of resolved.featureIds) {
      const feature = findEstimateSystemFeature(documentation, featureId);
      if (feature && `${feature.title} ${feature.summary}`.toLowerCase().includes(normalizedQuery)) {
        return `Matches feature · ${feature.title}`;
      }
    }
  }

  const personaIds = [path.primaryPersonaId, ...path.supportingPersonaIds];
  for (const personaId of personaIds) {
    const persona = findEstimateSystemPersona(documentation, personaId);
    const personaSearchText = persona ? [
      persona.title,
      persona.group,
      persona.evidenceConfidence,
      persona.accessPath,
      persona.summary,
      ...persona.contexts,
      ...persona.jobs,
      ...persona.behaviors,
      ...persona.needs,
      ...persona.constraints,
      persona.successSignal,
      ...persona.unresolvedAssumptions,
    ].join(" ") : "";
    if (persona && personaSearchText.toLowerCase().includes(normalizedQuery)) {
      return `Matches user · ${persona.title}`;
    }
  }
  return null;
}

function findMatchingPaths(
  documentation: EstimateSystemDocumentation,
  personaId: string,
  normalizedQuery: string,
) {
  return documentation.experiencePaths
    .flatMap((path) => {
      const belongsToPersona = path.primaryPersonaId === personaId || path.supportingPersonaIds.includes(personaId);
      if (!belongsToPersona) return [];
      const matchLabel = pathMatchLabel(documentation, path, normalizedQuery);
      return matchLabel ? [{ path, matchLabel }] : [];
    })
    .sort((left, right) =>
      Number(right.path.primaryPersonaId === personaId) - Number(left.path.primaryPersonaId === personaId),
    );
}

export function EstimateSystemUx({
  documentation,
  mode,
  query,
  selectedPathId,
  selectedPersonaId,
  onModeChange,
  onQueryChange,
  onSelectPath,
  onSelectPersona,
  onOpenFeature,
  onOpenPage,
}: EstimateSystemUxProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const [mobileIndexOpen, setMobileIndexOpen] = useState(false);
  const selectedPersona = findEstimateSystemPersona(documentation, selectedPersonaId) ?? documentation.personas[0] ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const matchingPaths = useMemo(() => {
    if (!selectedPersona) return [];
    return findMatchingPaths(documentation, selectedPersona.id, normalizedQuery);
  }, [documentation, normalizedQuery, selectedPersona]);
  const hasAssignedPaths = useMemo(() => {
    if (!selectedPersona) return false;
    return documentation.experiencePaths.some(
      (path) => path.primaryPersonaId === selectedPersona.id || path.supportingPersonaIds.includes(selectedPersona.id),
    );
  }, [documentation.experiencePaths, selectedPersona]);

  const selectedPath = matchingPaths.find(({ path }) => path.id === selectedPathId)?.path
    ?? matchingPaths[0]?.path
    ?? null;
  const nextSelectedPathId = selectedPath?.id ?? "";

  useEffect(() => {
    if (nextSelectedPathId === selectedPathId) return;
    onSelectPath(nextSelectedPathId);
  }, [nextSelectedPathId, onSelectPath, selectedPathId]);

  const selectedPathIntersections = selectedPath
    ? documentation.intersections.filter(
      (intersection) => intersection.fromPathId === selectedPath.id || intersection.toPathId === selectedPath.id,
    )
    : [];

  function focusSelectedContent() {
    window.requestAnimationFrame(() => {
      contentRef.current?.scrollIntoView({ block: "start", inline: "nearest" });
      contentRef.current?.focus({ preventScroll: true });
    });
  }

  function selectPersona(personaId: string) {
    if (personaId !== selectedPersona?.id) {
      const nextPath = findMatchingPaths(documentation, personaId, normalizedQuery)[0]?.path;
      onSelectPersona(personaId);
      onSelectPath(nextPath?.id ?? "");
    }
    setMobileIndexOpen(false);
    focusSelectedContent();
  }

  function selectPath(pathId: string) {
    onSelectPath(pathId);
    setMobileIndexOpen(false);
    focusSelectedContent();
  }

  function selectRelatedPath(pathId: string) {
    const path = findEstimateSystemExperiencePath(documentation, pathId);
    if (!path) return;
    const currentPersonaId = selectedPersona?.id ?? selectedPersonaId;
    const currentPersonaCanUsePath = path.primaryPersonaId === currentPersonaId
      || path.supportingPersonaIds.includes(currentPersonaId);
    onSelectPersona(currentPersonaCanUsePath ? currentPersonaId : path.primaryPersonaId);
    onSelectPath(path.id);
    onQueryChange("");
    setMobileIndexOpen(false);
    focusSelectedContent();
  }

  function clearQueryAndFocus() {
    onQueryChange("");
    searchInputRef.current?.focus();
  }

  return (
    <div className="grid min-h-0 lg:col-span-2 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="min-h-0 border-b border-hairline bg-surfaceMuted/20 lg:border-b-0 lg:border-r" aria-label="UX documentation index">
        <div className="p-2 lg:hidden">
          <Button
            variant="outline"
            size="xs"
            className="w-full min-w-0 justify-between"
            aria-expanded={mobileIndexOpen}
            aria-controls="estimate-system-ux-index-content"
            onClick={() => {
              const nextOpen = !mobileIndexOpen;
              setMobileIndexOpen(nextOpen);
              if (nextOpen) window.requestAnimationFrame(() => searchInputRef.current?.focus());
            }}
          >
            {mobileIndexOpen ? "Hide users and paths" : "Browse users and paths"}
          </Button>
        </div>
        <div id="estimate-system-ux-index-content" className={`${mobileIndexOpen ? "block" : "hidden"} lg:block`}>
          <div className="border-b border-hairline px-2.5 py-2">
            <p className="text-[9px] font-medium text-ink">Users and MVP paths</p>
            <p className="mt-0.5 text-[8px] leading-3 text-secondary">Choose one user context, then one journey.</p>
          </div>
          <div className="px-2 py-2">
          <div className="space-y-3">
            {PERSONA_GROUPS.map((group) => {
              const personas = documentation.personas.filter((persona) => persona.group === group.id);
              return (
                <section key={group.id}>
                  <p className="px-1 pb-1 text-[9px] font-medium text-secondary">{group.label}</p>
                  <div className="grid grid-cols-1 gap-1">
                    {personas.map((persona) => (
                      <Button
                        key={persona.id}
                        variant="ghost"
                        size="xs"
                        aria-pressed={persona.id === selectedPersona?.id}
                        className="h-auto min-h-8 min-w-0 justify-start whitespace-normal rounded-xs px-2 py-1 text-left aria-pressed:bg-white aria-pressed:font-medium"
                        onClick={() => selectPersona(persona.id)}
                      >
                        <span className="text-[9px] leading-3 text-ink">{persona.title}</span>
                      </Button>
                    ))}
                  </div>
                </section>
              );
            })}

            <section className="border-t border-hairline pt-3">
              <p className="px-1 text-[9px] font-medium text-secondary">Relevant paths</p>
              <SearchInput
                ref={searchInputRef}
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                onClear={clearQueryAndFocus}
                placeholder="Find a path, step, page, or feature"
                aria-label="Search UX paths"
                wrapperClassName="mt-2 border border-hairline bg-white"
              />
              <p className="sr-only" role="status">
                {matchingPaths.length} matching path{matchingPaths.length === 1 ? "" : "s"}
              </p>
              <div className="mt-2 space-y-0.5">
                {matchingPaths.map(({ path, matchLabel }) => (
                  <Button
                    key={path.id}
                    variant="ghost"
                    size="xs"
                    aria-pressed={path.id === selectedPath?.id}
                    className="h-auto min-h-0 w-full min-w-0 flex-col items-start gap-0.5 whitespace-normal rounded-xs px-2 py-1.5 text-left aria-pressed:bg-white aria-pressed:font-medium"
                    onClick={() => selectPath(path.id)}
                  >
                    <span className="flex w-full items-center justify-between gap-2 text-[9px] leading-3 text-ink">
                      <span>{path.title}</span>
                      {path.status === "partial" ? <span className="text-[8px] text-warning">Partial</span> : null}
                    </span>
                    <span className="line-clamp-2 text-[10px] font-normal leading-4 text-secondary">{matchLabel}</span>
                  </Button>
                ))}
                {!matchingPaths.length ? (
                  <div className="px-2 py-3" role="status">
                    <p className="text-[9px] font-medium text-ink">{hasAssignedPaths ? "No matching UX paths." : "No assigned UX paths."}</p>
                    <p className="mt-1 text-[10px] leading-4 text-secondary">
                      {hasAssignedPaths
                        ? "Search checks journey, step, page, feature, and user text."
                        : "This context is documented without forcing it into an end-user journey."}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
          </div>
        </div>
      </aside>

      <section
        ref={contentRef}
        tabIndex={-1}
        className="scroll-mt-12 min-w-0 space-y-4 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 lg:p-4"
        aria-label="Selected UX documentation"
      >
          {normalizedQuery && hasAssignedPaths && !selectedPath && selectedPersona ? (
            <>
              <header className="border-b border-hairline pb-3">
                <p className="text-[8px] font-medium text-secondary">UX search</p>
                <h2 className="mt-0.5 text-[12px] font-medium leading-5 text-ink">No matching UX paths</h2>
                <p className="mt-0.5 text-[10px] leading-4 text-secondary">Your search filtered every path available to {selectedPersona.title}.</p>
              </header>
              <div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted/25 p-3" role="status">
                <p className="text-[10px] leading-4 text-secondary">Try another term or reset the search to restore this persona&apos;s full path list.</p>
                <Button variant="outline" size="xs" className="mt-2 min-w-0" onClick={clearQueryAndFocus}>Reset UX search</Button>
              </div>
            </>
          ) : selectedPath && selectedPersona ? (
            <>
              <header className="flex flex-col gap-2 border-b border-hairline pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[8px] font-medium text-secondary">{selectedPersona.title} · UX path</p>
                    {selectedPath.status === "partial" ? <span className="text-[9px] font-medium text-warning">Coverage gap</span> : null}
                  </div>
                  <h2 className="mt-0.5 text-[12px] font-medium leading-5 text-ink">{selectedPath.title}</h2>
                  <p className="mt-0.5 text-[10px] leading-4 text-secondary">{selectedPath.summary}</p>
                  <p className="mt-1 text-[9px] leading-4 text-secondary">Trigger: {selectedPath.trigger}</p>
                </div>
                <SegmentedControl
                  ariaLabel="UX documentation mode"
                  options={[
                    { value: "journey", label: "Happy path" },
                    { value: "intersections", label: "Intersections" },
                  ]}
                  value={mode}
                  onValueChange={onModeChange}
                />
              </header>

              {mode === "journey" ? (
                <>
                  <JourneyFlow documentation={documentation} path={selectedPath} onOpenFeature={onOpenFeature} onOpenPage={onOpenPage} />
                  <section aria-labelledby="ux-related-intersections-heading">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 id="ux-related-intersections-heading" className="text-[9px] font-medium text-ink">Where this path connects</h3>
                    </div>
                    <IntersectionList
                      documentation={documentation}
                      intersections={selectedPathIntersections}
                      onOpenFeature={onOpenFeature}
                      onOpenPage={onOpenPage}
                      onSelectRelatedPath={selectRelatedPath}
                    />
                  </section>
                  <PersonaProfile persona={selectedPersona} />
                  <SourceNotes sources={selectedPath.sources} />
                </>
              ) : (
                <IntersectionNetwork
                  documentation={documentation}
                  selectedPathId={selectedPath.id}
                  onOpenFeature={onOpenFeature}
                  onOpenPage={onOpenPage}
                  onSelectRelatedPath={selectRelatedPath}
                />
              )}
            </>
          ) : selectedPersona ? (
            <>
              <header className="border-b border-hairline pb-3">
                <p className="text-[8px] font-medium text-secondary">Persona record</p>
                <h2 className="mt-0.5 text-[12px] font-medium leading-5 text-ink">{selectedPersona.title}</h2>
                <p className="mt-0.5 text-[9px] leading-4 text-secondary">{selectedPersona.summary}</p>
              </header>
              <div className="rounded-xs border border-dashed border-hairline bg-surfaceMuted/25 p-3" role="status">
                <p className="text-[9px] font-medium text-ink">No end-user MVP path is assigned to this context.</p>
                <p className="mt-1 text-[9px] leading-4 text-secondary">This boundary remains documented without forcing it into the estimate-to-client journey.</p>
              </div>
              <PersonaProfile persona={selectedPersona} />
            </>
          ) : null}
      </section>
    </div>
  );
}
