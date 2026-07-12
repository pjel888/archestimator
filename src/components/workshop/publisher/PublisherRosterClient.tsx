"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, ShareNetwork, X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
import { SearchInput } from "@/components/ui/search-input";
import { PublisherDrawer, type PublisherDrawerTabId } from "@/components/workshop/publisher/PublisherDrawer";
import { PublisherNoRowsEmptyState } from "@/components/workshop/publisher/PublisherEmptyState";
import { PublisherPagination } from "@/components/workshop/publisher/PublisherPagination";
import { PublisherProjectPicker } from "@/components/workshop/publisher/PublisherProjectPicker";
import { PublisherRosterCard } from "@/components/workshop/publisher/PublisherRosterCard";
import { ShareWizard } from "@/components/workshop/publisher/ShareWizard";
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
  ProjectPublicationRosterShareOption,
} from "@/lib/publisher/roster-repository";
import { cn } from "@/lib/ui/cn";

type PublisherRosterClientProps = {
  filters: PublisherRosterFilters;
  roster: ProjectPublicationRosterResult;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Live" },
  { value: "stale", label: "Needs update" },
  { value: "expired", label: "Expired" },
  { value: "revoked", label: "Off" },
  { value: "drafts", label: "Not shared" },
] satisfies Array<{ value: PublisherRosterStatusFilter; label: string }>;

const DRAWER_TAB_IDS = new Set<PublisherDrawerTabId>([
  "overview",
  "recipients",
  "activity",
]);

const LEGACY_DRAWER_TABS = new Set(["access", "sheets", "settings"]);

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
  if (value && LEGACY_DRAWER_TABS.has(value)) return "overview";
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
  const drawerProjectId = useMemo(
    () => new URLSearchParams(searchParamString).get("drawer"),
    [searchParamString],
  );
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(filters.search);
  const [copyStateByPublicationId, setCopyStateByPublicationId] = useState<Record<string, "idle" | "copied" | "failed">>({});
  const drawerIntent = useMemo(
    () => readDrawerIntent(new URLSearchParams(searchParamString), roster.rows),
    [roster.rows, searchParamString],
  );
  const wizardIntent = useMemo(
    () => readWizardIntent(new URLSearchParams(searchParamString), roster.rows),
    [roster.rows, searchParamString],
  );
  const [selectedProjectIdPreference, setSelectedProjectIdPreference] = useState<string | null>(
    () => drawerIntent?.row.projectId ?? roster.rows[0]?.projectId ?? null,
  );
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [manualWizardRow, setManualWizardRow] = useState<ProjectPublicationRosterRowData | null>(null);
  const manualWizardTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileDetailOpen = Boolean(drawerIntent);
  const selectedProjectId = drawerIntent?.row.projectId
    ?? (roster.rows.some((row) => row.projectId === selectedProjectIdPreference)
      ? selectedProjectIdPreference
      : roster.rows[0]?.projectId ?? null);
  const selectedRow = roster.rows.find(
    (row) => row.projectId === selectedProjectId,
  ) ?? null;
  const detailInitialTab = drawerIntent && drawerIntent.row.projectId === selectedRow?.projectId
    ? drawerIntent.tab
    : "overview";
  const wizardRow = manualWizardRow ?? wizardIntent?.row ?? null;
  const wizardStep = wizardIntent?.step ?? 1;

  const projectOptions = useMemo(
    () => buildProjectOptions(roster.projectOptions, filters.projectId),
    [filters.projectId, roster.projectOptions],
  );
  const shareProjectOptions = useMemo<ProjectPublicationRosterShareOption[]>(() => {
    if (roster.shareProjectOptions) return roster.shareProjectOptions;
    return roster.projectOptions.flatMap((project) => {
      const row = roster.rows.find((candidate) => candidate.projectId === project.id);
      if (row && !row.canManagePublication) return [];
      return [{
        ...project,
        canManagePublication: row?.canManagePublication ?? true,
        clientName: row?.clientName ?? null,
        estimateCount: null,
        status: row?.status ?? "unknown",
      }];
    });
  }, [roster.projectOptions, roster.rows, roster.shareProjectOptions]);

  const replaceQuery = useCallback((patch: PublisherRosterQueryPatch, resetPage = true) => {
    const params = writePublisherRosterSearchParams(new URLSearchParams(searchParamString), {
      ...patch,
      page: resetPage ? 1 : patch.page,
    });
    params.delete("drawer");
    params.delete("tab");
    const query = params.toString();
    startTransition(() => {
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    });
  }, [pathname, router, searchParamString]);

  const clearDrawerQuery = useCallback(() => {
    const params = new URLSearchParams(searchParamString);
    params.delete("drawer");
    params.delete("tab");
    const query = params.toString();
    startTransition(() => {
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    });
  }, [pathname, router, searchParamString]);

  function selectRow(row: ProjectPublicationRosterRowData) {
    setSelectedProjectIdPreference(row.projectId);
    if (drawerProjectId === row.projectId) return;
    const params = new URLSearchParams(searchParamString);
    params.set("drawer", row.projectId);
    params.delete("tab");
    const query = params.toString();
    startTransition(() => router.push(`${pathname}?${query}`, { scroll: false }));
  }

  function closeMobileDetail() {
    clearDrawerQuery();
  }

  function closeWizard() {
    const trigger = manualWizardTriggerRef.current;
    manualWizardTriggerRef.current = null;
    setManualWizardRow(null);
    const params = new URLSearchParams(searchParamString);
    const hadWizardQuery = params.has("wizard") || params.has("step");
    params.delete("wizard");
    params.delete("step");
    if (hadWizardQuery) {
      params.delete("project");
      params.delete("page");
      const query = params.toString();
      startTransition(() => router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false }));
    }
    if (trigger?.isConnected) {
      window.requestAnimationFrame(() => trigger.focus({ preventScroll: true }));
    }
  }

  function openProjectWizard(projectId: string) {
    const params = new URLSearchParams(searchParamString);
    params.set("project", projectId);
    params.set("wizard", projectId);
    params.delete("drawer");
    params.delete("page");
    params.delete("q");
    params.delete("status");
    params.delete("step");
    params.delete("tab");
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  function openManualWizard(row: ProjectPublicationRosterRowData, trigger: HTMLButtonElement) {
    manualWizardTriggerRef.current = trigger;
    setManualWizardRow(row);
  }

  function clearFilters() {
    setSearchValue("");
    replaceQuery({ projectId: null, search: "", status: "all" });
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

  const startRow = roster.totalRows === 0 ? 0 : (roster.page - 1) * roster.pageSize + 1;
  const endRow = startRow === 0 ? 0 : startRow + roster.rows.length - 1;
  const hasRows = roster.rows.length > 0;
  const hasFilters = hasActiveFilters(filters);
  const resultLabel = roster.totalRows === 1 ? "1 project" : `${roster.totalRows} projects`;

  return (
    <section
      aria-label="Client link workspace"
      aria-busy={isPending}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xs border border-hairline bg-white shadow-xs"
      data-publisher-roster="true"
    >
      <div className={cn(
        "shrink-0 grid-cols-2 gap-1.5 border-b border-hairline bg-white p-2 xl:grid-cols-[minmax(14rem,1fr)_9rem_12rem_auto] xl:items-center",
        mobileDetailOpen && selectedRow ? "hidden lg:grid" : "grid",
      )}>
        <SearchInput
          aria-label="Search projects or clients"
          placeholder="Search projects or clients"
          value={searchValue}
          onChange={(event) => setSearchValue(event.currentTarget.value)}
          onClear={() => setSearchValue("")}
          className="!text-[10px]"
          wrapperClassName="col-span-2 !h-8 !min-h-8 border border-divider bg-surface xl:col-span-1"
        />
        <DropdownSelect
          aria-label="Filter by link status"
          options={STATUS_OPTIONS}
          value={filters.status}
          onValueChange={(value) => replaceQuery({ status: value as PublisherRosterStatusFilter })}
          variant="boxed"
          className="!h-8 w-full !text-[10px]"
          panelClassName="[&_[role=option]]:min-h-8 [&_[role=option]]:!text-[10px]"
        />
        <DropdownSelect
          aria-label="Filter by project"
          options={projectOptions}
          value={filters.projectId ?? ""}
          onValueChange={(value) => replaceQuery({ projectId: value || null })}
          variant="boxed"
          className="!h-8 w-full !text-[10px]"
          panelClassName="[&_[role=option]]:min-h-8 [&_[role=option]]:!text-[10px]"
        />
        <div className="col-span-2 xl:col-span-1">
          <Button
            type="button"
            variant="brand"
            size="sm"
            className="min-h-8 w-full min-w-0 px-2.5 !text-[10px] xl:w-auto"
            disabled={shareProjectOptions.length === 0}
            onClick={() => setProjectPickerOpen(true)}
          >
            <Plus size={14} aria-hidden="true" /> Create client link
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(18rem,23rem)_minmax(0,1fr)]">
        <aside
          aria-label="Projects and client links"
          className={cn(
            "min-h-0 flex-col border-r border-hairline bg-surface",
            mobileDetailOpen && selectedRow ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="flex min-h-10 shrink-0 items-center justify-between gap-2 border-b border-hairline px-2.5">
            <div className="min-w-0">
              <h2 className="text-[11px] font-medium leading-4 text-ink">Client links</h2>
              <p className="text-[9px] leading-3 text-tertiary">{resultLabel}</p>
            </div>
            {hasFilters ? (
              <Button type="button" variant="plain" size="sm" className="min-h-8 min-w-0 px-2 !text-[9px]" onClick={clearFilters}>
                <X size={12} aria-hidden="true" /> Clear
              </Button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {hasRows ? roster.rows.map((row) => (
              <PublisherRosterCard
                key={row.publicationId ?? `draft:${row.projectId}`}
                row={row}
                selected={selectedRow?.projectId === row.projectId}
                copyState={row.publicationId ? copyStateByPublicationId[row.publicationId] ?? "idle" : "idle"}
                onCopyLink={handleCopyLink}
                onSelect={selectRow}
              />
            )) : (
              <PublisherNoRowsEmptyState
                variant={hasFilters ? "filtered" : "no-publications"}
                action={hasFilters ? <Button type="button" variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button> : undefined}
              />
            )}
          </div>

          <div className="flex min-h-10 shrink-0 flex-wrap items-center justify-between gap-2 border-t border-hairline bg-white px-2.5 py-1">
            <p className="text-[9px] leading-3 text-tertiary">
              {roster.totalRows === 0 ? "No results" : `${startRow}-${endRow} of ${roster.totalRows}`}
              {roster.truncated ? " (capped)" : ""}
            </p>
            <PublisherPagination
              hasNextPage={roster.hasNextPage}
              page={roster.page}
              onPageChange={(page) => replaceQuery({ page }, false)}
            />
          </div>
        </aside>

        <div className={cn("min-h-0 flex-col bg-white", mobileDetailOpen ? "flex" : "hidden lg:flex")}>
          {selectedRow ? (
            <>
              <div className="flex min-h-9 shrink-0 items-center border-b border-hairline px-1.5 lg:hidden">
                <Button type="button" variant="plain" size="sm" className="min-h-8 min-w-0 px-2 !text-[10px]" onClick={closeMobileDetail}>
                  <ArrowLeft size={14} aria-hidden="true" /> Client links
                </Button>
              </div>
              <div className="min-h-0 flex-1">
                <PublisherDrawer
                  key={`${selectedRow.projectId}:${detailInitialTab}`}
                  embedded
                  initialTab={detailInitialTab}
                  open
                  row={selectedRow}
                  onOpenChange={() => undefined}
                  onEditLink={openManualWizard}
                />
              </div>
            </>
          ) : (
            <div className="grid h-full place-items-center p-6 text-center">
              <div className="max-w-xs">
                <ShareNetwork size={18} className="mx-auto text-tertiary" aria-hidden="true" />
                <h2 className="mt-2 text-[12px] font-medium text-ink">Choose a project</h2>
                <p className="mt-1 text-[10px] leading-4 text-secondary">Select a project to review its client link and sharing settings.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <output aria-live="polite" aria-atomic="true" className="sr-only">
        {Object.entries(copyStateByPublicationId).find(([, state]) => state !== "idle")?.join(": ") ?? ""}
      </output>
      <PublisherProjectPicker
        open={projectPickerOpen}
        onOpenChange={setProjectPickerOpen}
        projects={shareProjectOptions}
        onSelect={openProjectWizard}
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
