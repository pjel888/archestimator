"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { WorkshopCollectionLayout } from "@/components/workshop/WorkshopCollectionLayout";
import { PublisherNoRowsEmptyState } from "@/components/workshop/publisher/PublisherEmptyState";
import { PublisherDrawer, type PublisherDrawerTabId } from "@/components/workshop/publisher/PublisherDrawer";
import { PublisherPagination } from "@/components/workshop/publisher/PublisherPagination";
import { PublisherRosterCard } from "@/components/workshop/publisher/PublisherRosterCard";
import { ShareWizard } from "@/components/workshop/publisher/ShareWizard";
import {
  PublisherRosterRow,
  type PublisherRosterCopyState,
} from "@/components/workshop/publisher/PublisherRosterRow";
import {
  writePublisherRosterSearchParams,
  type PublisherRosterQueryPatch,
} from "@/components/workshop/publisher/publisher-queries";
import type {
  PublisherRosterFilters,
  PublisherRosterStatusFilter,
} from "@/lib/publisher/roster-filter";
import type {
  ProjectPublicationRosterProjectOption,
  ProjectPublicationRosterResult,
  ProjectPublicationRosterRow as ProjectPublicationRosterRowData,
} from "@/lib/publisher/roster-repository";

type PublisherRosterClientProps = {
  filters: PublisherRosterFilters;
  roster: ProjectPublicationRosterResult;
};

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "stale", label: "Stale" },
  { id: "expired", label: "Expired" },
  { id: "revoked", label: "Revoked" },
  { id: "drafts", label: "Drafts" },
] satisfies Array<{ id: PublisherRosterStatusFilter; label: string }>;

const DRAWER_TAB_IDS = new Set<PublisherDrawerTabId>([
  "overview",
  "recipients",
  "sheets",
  "access",
  "settings",
  "activity",
]);

function readAbsoluteClientLink(clientLinkPath: string) {
  if (/^https?:\/\//i.test(clientLinkPath)) return clientLinkPath;
  if (typeof window === "undefined") return clientLinkPath;
  return new URL(clientLinkPath, window.location.origin).toString();
}

function buildProjectOptions(
  projects: ProjectPublicationRosterProjectOption[],
  selectedProjectId: string | null,
): DropdownSelectOption[] {
  const seen = new Set<string>();
  const options: DropdownSelectOption[] = [{ value: "", label: "All projects" }];
  for (const project of projects) {
    if (seen.has(project.id)) continue;
    seen.add(project.id);
    options.push({
      value: project.id,
      label: project.projectCode ? `${project.name} (${project.projectCode})` : project.name,
    });
  }
  if (selectedProjectId && !seen.has(selectedProjectId)) {
    options.push({ value: selectedProjectId, label: "Selected project" });
  }
  return options;
}

function hasActiveFilters(filters: PublisherRosterFilters) {
  return filters.status !== "all" || Boolean(filters.projectId) || Boolean(filters.search);
}

function readDrawerTab(value: string | null): PublisherDrawerTabId {
  return value && DRAWER_TAB_IDS.has(value as PublisherDrawerTabId)
    ? (value as PublisherDrawerTabId)
    : "overview";
}

function readDrawerIntent(
  params: URLSearchParams,
  rows: ProjectPublicationRosterRowData[],
): { key: string; row: ProjectPublicationRosterRowData; tab: PublisherDrawerTabId } | null {
  const drawerProjectId = params.get("drawer");
  if (!drawerProjectId) return null;
  const row = rows.find((item) => item.projectId === drawerProjectId);
  const tab = readDrawerTab(params.get("tab"));
  return row ? { key: `${drawerProjectId}:${tab}`, row, tab } : null;
}

function readWizardIntent(params: URLSearchParams, rows: ProjectPublicationRosterRowData[]) {
  const projectId = params.get("wizard");
  if (!projectId) return null;
  const row = rows.find((item) => item.projectId === projectId);
  const step = Number.parseInt(params.get("step") ?? "1", 10);
  return row ? { row, step: Number.isFinite(step) ? step : 1 } : null;
}

export function PublisherRosterClient({ filters, roster }: PublisherRosterClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamString = searchParams.toString();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(filters.search);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [copyStateByPublicationId, setCopyStateByPublicationId] = useState<Record<string, PublisherRosterCopyState>>({});
  const drawerIntent = useMemo(
    () => readDrawerIntent(new URLSearchParams(searchParamString), roster.rows),
    [roster.rows, searchParamString],
  );
  const wizardIntent = useMemo(
    () => readWizardIntent(new URLSearchParams(searchParamString), roster.rows),
    [roster.rows, searchParamString],
  );
  const [manualDrawerRow, setManualDrawerRow] = useState<ProjectPublicationRosterRowData | null>(null);
  const [manualDrawerInitialTab, setManualDrawerInitialTab] = useState<PublisherDrawerTabId>("overview");
  const [dismissedDrawerIntentKey, setDismissedDrawerIntentKey] = useState<string | null>(null);
  const [manualWizardRow, setManualWizardRow] = useState<ProjectPublicationRosterRowData | null>(null);
  const manualDrawerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const activeDrawerIntent = drawerIntent?.key === dismissedDrawerIntentKey ? null : drawerIntent;
  const drawerRow = manualDrawerRow ?? activeDrawerIntent?.row ?? null;
  const drawerInitialTab = manualDrawerRow ? manualDrawerInitialTab : activeDrawerIntent?.tab ?? "overview";
  const wizardRow = manualWizardRow ?? wizardIntent?.row ?? null;
  const wizardStep = wizardIntent?.step ?? 1;

  const tabs = useMemo<readonly TabItem[]>(
    () => STATUS_TABS.map((tab) => ({ id: tab.id, label: tab.label })),
    [],
  );
  const projectOptions = useMemo(
    () => buildProjectOptions(roster.projectOptions, filters.projectId),
    [filters.projectId, roster.projectOptions],
  );

  const replaceQuery = useCallback((patch: PublisherRosterQueryPatch, resetPage = true) => {
    const params = writePublisherRosterSearchParams(new URLSearchParams(searchParamString), {
      ...patch,
      page: resetPage ? 1 : patch.page,
    });
    const query = params.toString();
    startTransition(() => {
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    });
  }, [pathname, router, searchParamString, startTransition]);

  function clearDrawerQuery() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("drawer");
    params.delete("tab");
    const query = params.toString();
    startTransition(() => {
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    });
  }

  function closeWizard() {
    setManualWizardRow(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("wizard");
    params.delete("step");
    const query = params.toString();
    startTransition(() => router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false }));
  }

  function handleSearchChange(nextValue: string) {
    setSearchValue(nextValue);
  }

  useEffect(() => {
    if (searchValue === filters.search) return;
    const timeout = window.setTimeout(() => replaceQuery({ search: searchValue }), 300);
    return () => window.clearTimeout(timeout);
  }, [filters.search, replaceQuery, searchValue]);

  async function handleCopyLink(row: ProjectPublicationRosterRowData) {
    if (!row.publicationId || !row.clientLinkPath) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable.");
      await navigator.clipboard.writeText(readAbsoluteClientLink(row.clientLinkPath));
      setCopyStateByPublicationId((current) => ({ ...current, [row.publicationId!]: "copied" }));
    } catch {
      setCopyStateByPublicationId((current) => ({ ...current, [row.publicationId!]: "failed" }));
    }
  }

  function restoreManualDrawerFocus() {
    const trigger = manualDrawerTriggerRef.current;
    manualDrawerTriggerRef.current = null;
    if (!trigger?.isConnected) return;
    window.requestAnimationFrame(() => {
      trigger.focus({ preventScroll: true });
    });
  }

  const startRow = roster.totalRows === 0 ? 0 : (roster.page - 1) * roster.pageSize + 1;
  const endRow = startRow === 0 ? 0 : startRow + roster.rows.length - 1;
  const hasRows = roster.rows.length > 0;

  return (
    <section
      aria-label="Shared link roster"
      aria-busy={isPending}
      className="flex h-full min-h-0 flex-col bg-transparent"
      data-publisher-roster="true"
    >
      <WorkshopCollectionLayout
        searchLabel="Search publications"
        searchPlaceholder="Search publications"
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        toolbarLabel="Shared link roster tools"
        toolbarPrefix="shared link roster"
        filterSlot={
          <DropdownSelect
            aria-label="Filter by project"
            options={projectOptions}
            value={filters.projectId ?? ""}
            onValueChange={(value) => replaceQuery({ projectId: value || null })}
            variant="boxed"
            className="w-48 max-w-[44vw]"
          />
        }
        toolbarPanel={
          <Tabs
            tabs={tabs}
            activeId={filters.status}
            onChange={(id) => replaceQuery({ status: id as PublisherRosterStatusFilter })}
            ariaLabel="Shared link status filters"
            controlsPanels={false}
            variant="pills"
            className="px-2 py-1 [&_[role=tablist]]:border-0"
          />
        }
        contentScroll={false}
      >
        <div className="flex h-full min-h-0 flex-col gap-2">
          <div className="flex min-h-6 items-center justify-between gap-2 text-[9px] leading-3 text-tertiary">
            <p aria-live="polite">
              Showing {startRow}-{endRow} of {roster.totalRows}
              {roster.truncated ? " (capped)" : ""}
            </p>
            <div className="flex items-center gap-3">
              <PublisherPagination hasNextPage={roster.hasNextPage} page={roster.page} onPageChange={(page) => replaceQuery({ page }, false)} />
              <div className="hidden gap-2 min-[768px]:flex" role="group" aria-label="Roster view">
                <button type="button" aria-pressed={view === "cards"} onClick={() => setView("cards")}>Cards</button>
                <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>Table</button>
              </div>
            </div>
          </div>

          <div className="grid gap-2 min-[768px]:hidden">
            {hasRows ? roster.rows.map((row) => (
              <PublisherRosterCard
                key={row.publicationId ?? `draft:${row.projectId}`}
                row={row}
                copyLabel={row.publicationId && copyStateByPublicationId[row.publicationId] === "copied" ? "Copied" : "Copy link"}
                onCopyLink={handleCopyLink}
                onSharePublication={(nextRow) => setManualWizardRow(nextRow)}
                onManagePublication={(nextRow, trigger) => {
                  manualDrawerTriggerRef.current = trigger;
                  setManualDrawerInitialTab("overview");
                  setManualDrawerRow(nextRow);
                }}
              />
            )) : <PublisherNoRowsEmptyState variant={hasActiveFilters(filters) ? "filtered" : "no-publications"} />}
          </div>

          <div className={view === "cards"
            ? "hidden grid-cols-2 gap-3 min-[768px]:grid xl:grid-cols-3"
            : "hidden grid-cols-2 gap-3 min-[768px]:hidden xl:grid-cols-3"}>
            {hasRows ? roster.rows.map((row) => (
              <PublisherRosterCard
                key={row.publicationId ?? `draft:${row.projectId}`}
                row={row}
                copyLabel={row.publicationId && copyStateByPublicationId[row.publicationId] === "copied" ? "Copied" : "Copy link"}
                onCopyLink={handleCopyLink}
                onSharePublication={(nextRow) => setManualWizardRow(nextRow)}
                onManagePublication={(nextRow, trigger) => {
                  manualDrawerTriggerRef.current = trigger;
                  setManualDrawerInitialTab("overview");
                  setManualDrawerRow(nextRow);
                }}
              />
            )) : <PublisherNoRowsEmptyState variant={hasActiveFilters(filters) ? "filtered" : "no-publications"} />}
          </div>

          <div className={view === "table"
            ? "hidden min-h-0 flex-1 overflow-hidden rounded-xs border border-hairline bg-surface/55 shadow-[0_1px_0_rgba(17,24,39,0.03)] min-[768px]:flex"
            : "hidden min-h-0 flex-1 overflow-hidden rounded-xs border border-hairline bg-surface/55 shadow-[0_1px_0_rgba(17,24,39,0.03)] min-[768px]:hidden"}>
            {hasRows ? (
              <div className="min-h-0 w-full overflow-auto">
                <table className="min-w-[920px] w-full border-collapse text-left">
                  <caption className="sr-only">Shared link manager roster</caption>
                  <thead className="sticky top-0 z-10 border-b border-hairline bg-surface/95 text-[9px] uppercase leading-3 text-tertiary">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">Shared link</th>
                      <th scope="col" className="px-3 py-2 font-medium">Status</th>
                      <th scope="col" className="hidden px-3 py-2 font-medium lg:table-cell">Recipients</th>
                      <th scope="col" className="px-3 py-2 font-medium">Latest activity</th>
                      <th scope="col" className="hidden px-3 py-2 font-medium lg:table-cell">Estimates</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.rows.map((row) => (
                      <PublisherRosterRow
                        key={row.publicationId ?? `draft:${row.projectId}`}
                        row={row}
                        copyState={row.publicationId ? copyStateByPublicationId[row.publicationId] : "idle"}
                        onCopyLink={handleCopyLink}
                        onManagePublication={(nextRow, trigger) => {
                          manualDrawerTriggerRef.current = trigger;
                          setManualDrawerInitialTab("overview");
                          setManualDrawerRow(nextRow);
                        }}
                        onSharePublication={(nextRow) => setManualWizardRow(nextRow)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex h-full w-full p-2">
                <PublisherNoRowsEmptyState variant={hasActiveFilters(filters) ? "filtered" : "no-publications"} />
              </div>
            )}
          </div>
        </div>
      </WorkshopCollectionLayout>

      <output aria-live="polite" aria-atomic="true" className="sr-only">
        {Object.entries(copyStateByPublicationId).find(([, state]) => state !== "idle")?.join(": ") ?? ""}
      </output>
      <PublisherDrawer
        key={drawerRow ? `${drawerRow.projectId}:${drawerInitialTab}` : "publisher-drawer-closed"}
        initialTab={drawerInitialTab}
        open={drawerRow !== null}
        row={drawerRow}
        onOpenChange={(nextOpen) => {
          if (nextOpen) return;
          if (manualDrawerRow) {
            setManualDrawerRow(null);
            restoreManualDrawerFocus();
            return;
          }
          if (activeDrawerIntent) {
            setDismissedDrawerIntentKey(activeDrawerIntent.key);
            clearDrawerQuery();
          }
        }}
      />
      <ShareWizard
        key={wizardRow ? `${wizardRow.projectId}:${wizardStep}` : "share-wizard-closed"}
        initialStep={wizardStep}
        open={wizardRow !== null}
        row={wizardRow}
        onOpenChange={(nextOpen) => { if (!nextOpen) closeWizard(); }}
      />
    </section>
  );
}
