"use client";

import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type CSSProperties, type ReactNode } from "react";

import { ProjectAddressAutocomplete, type ProjectGooglePlaceSelection } from "@/components/workshop/ProjectAddressAutocomplete";
import { ProjectLocationMap, type ProjectLocationPin } from "@/components/workshop/ProjectLocationMap";
import { ControlInput } from "@/components/ui/control-input";
import { cn } from "@/lib/ui/cn";
import { updateProjectDetails } from "@/lib/projects/actions";
import { initialProjectLocationActionState } from "@/lib/projects/location-action-state";
import { saveProjectLocation } from "@/lib/projects/location-actions";
import { usePrefetchOnHover } from "@/hooks/use-prefetch-on-hover";
import { formatChartMoney } from "@/lib/project-charts/format";
import type { ProjectActivityItem, ProjectActivityPage } from "@/lib/repositories/project-activity-repository";
import type { ProjectRecentEstimateSheetSummary } from "@/lib/repositories/project-estimate-sheets-repository";
import type { ProjectLocationSummary } from "@/lib/repositories/project-location-repository";
import type { Json, Tables } from "@/lib/supabase/types";

type ProjectMetadata = {
  readonly projectImageUrl?: string;
};

const dashboardDateFormatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });
const dashboardCompactDateFormatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const dashboardActivityDayFormatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });
const dashboardActivityTimeFormatter = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });

type ProjectDashboardClientProps = {
  readonly project: Tables<"projects"> | null;
  readonly fallback: {
    readonly id: string;
    readonly name: string;
    readonly client: string;
    readonly location: string;
    readonly projectCode: string;
    readonly currencyCode: string;
  };
  readonly estimateCount: number;
  readonly recentEstimateSheets: readonly ProjectRecentEstimateSheetSummary[];
  readonly canEditProject: boolean;
  readonly projectLocation: ProjectLocationSummary | null;
  readonly projectActivityPage: ProjectActivityPage;
  readonly googleMapsApiKey: string;
  readonly googleMapsMapId?: string | null;
};

function readProjectMetadata(value: Json): ProjectMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, Json>;
  return {
    projectImageUrl: typeof record.projectImageUrl === "string" ? record.projectImageUrl : undefined,
  };
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return dashboardDateFormatter.format(date);
}

function formatCompactDate(value?: string | null) {
  if (!value) return "No edits yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No edits yet";
  return dashboardCompactDateFormatter.format(date);
}

function formatActivityDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Undated";
  return dashboardActivityDayFormatter.format(date);
}

function formatActivityTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return dashboardActivityTimeFormatter.format(date);
}

function createProjectEstimateHref(sheet: Pick<ProjectRecentEstimateSheetSummary, "projectId" | "firstNodeId">) {
  return sheet.firstNodeId
    ? `/workshop/projects/${sheet.projectId}/estimates/${sheet.firstNodeId}`
    : `/workshop/projects/${sheet.projectId}/estimates`;
}

function ProjectDataField({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-[9px] font-medium uppercase tracking-normal text-tertiary">{label}</span>
      {children}
    </label>
  );
}

function ProjectTimestampField({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="space-y-0.5 px-2 py-1.5">
      <span className="block text-[9px] font-medium uppercase tracking-normal text-gray-400">{label}</span>
      <p className="truncate text-[10px] font-medium leading-3 text-tertiary">{value}</p>
    </div>
  );
}

const PROJECT_METADATA_INPUT_CLASS =
  "h-7 border-transparent bg-transparent px-2 text-[10px] leading-4 shadow-none placeholder:text-tertiary hover:border-white/55 hover:bg-white/35 focus:bg-white/85";
const PROJECT_METADATA_READONLY_INPUT_CLASS =
  "cursor-default border-transparent bg-transparent shadow-none hover:border-transparent hover:bg-transparent focus:border-transparent focus:bg-transparent focus:ring-0";
const DASHBOARD_COUNT_COLUMN_WIDTH = "203px";
const PROJECT_ESTIMATE_SUMMARY_STYLE = {
  "--destination-inner-border": "rgba(38, 44, 58, 0.16)",
  "--destination-inner-list-border": "rgba(38, 44, 58, 0.10)",
  "--destination-inner-text": "var(--ink)",
  "--destination-inner-muted": "var(--secondary)",
  containerType: "inline-size",
} as CSSProperties;
const BUDGET_WARNING_THRESHOLD_PERCENT = 85;
const BUDGET_HEALTH_ACTUAL_FILL_CLASS = "bg-[color:var(--budget-meter-fill)]";
const BUDGET_HEALTH_OVERBUDGET_FILL_CLASS = "bg-[color:var(--budget-meter-overflow)]";
const BUDGET_HEALTH_BUDGET_TICK_CLASS = "bg-[rgba(17,17,17,0.56)]";

function RecentEstimateSheetLinks({ sheets }: { readonly sheets: readonly ProjectRecentEstimateSheetSummary[] }) {
  const recentSheets = useMemo(() => sheets.slice(0, 5), [sheets]);
  const prefetchRoutes = useMemo(
    () => recentSheets.map((sheet) => ({ pathname: createProjectEstimateHref(sheet) })),
    [recentSheets],
  );
  const { prefetch, cancel } = usePrefetchOnHover(prefetchRoutes);

  if (recentSheets.length === 0) {
    return (
      <p className="dashboard-published-empty">
        No estimate sheets yet
      </p>
    );
  }

  return (
    <ul className="dashboard-published-list" aria-label="Recent estimate sheets">
      {recentSheets.map((sheet) => {
        const href = createProjectEstimateHref(sheet);
        return (
          <li key={sheet.id} className="dashboard-published-list-item">
            <Link
              href={href}
              prefetch={false}
              className="dashboard-published-link"
              onBlur={() => cancel(href)}
              onFocus={() => prefetch(href)}
              onMouseEnter={() => prefetch(href)}
              onMouseLeave={() => cancel(href)}
            >
              <span className="min-w-0 flex-1 truncate" title={sheet.name}>
                {sheet.name}
              </span>
              <span className="shrink-0 font-numeric text-[9px] text-secondary">
                {formatCompactDate(sheet.updatedAt)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ProjectEstimateSummaryPanel({
  estimateCount,
  recentEstimateSheets,
}: {
  readonly estimateCount: number;
  readonly recentEstimateSheets: readonly ProjectRecentEstimateSheetSummary[];
}) {
  return (
    <section
      aria-label="Project estimates summary"
      className="h-full min-h-0"
      style={PROJECT_ESTIMATE_SUMMARY_STYLE}
    >
      <div
        className="dashboard-project-card-panel"
        style={{
          display: "grid",
          gridTemplateColumns: `var(--dashboard-count-col, ${DASHBOARD_COUNT_COLUMN_WIDTH}) minmax(0, 1fr)`,
          alignItems: "stretch",
          minHeight: 0,
          paddingBlock: 8,
          paddingRight: 0,
          borderBottom: "1px solid var(--destination-inner-border, var(--glass-border))",
        }}
      >
        <div
          className="dashboard-project-count-panel"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            alignItems: "start",
            height: "100%",
            minHeight: 0,
            padding: 8,
            borderRight: "1px solid var(--destination-inner-border, var(--glass-border))",
          }}
        >
          <span className="font-numeric text-[9px] font-medium uppercase tracking-normal text-secondary">
            Estimate Count
          </span>
          <span className="dashboard-bignum-value">{estimateCount}</span>
        </div>

        <div
          className="dashboard-published-panel"
          style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, minWidth: 0 }}
        >
          <div className="dashboard-published-header">
            <span className="text-[12px] font-medium text-ink">Recent Estimate Sheets</span>
          </div>
          <RecentEstimateSheetLinks sheets={recentEstimateSheets} />
        </div>
      </div>
    </section>
  );
}

function ProjectEstimateCostStrip({
  sheets,
  currencyCode,
}: {
  readonly sheets: readonly ProjectRecentEstimateSheetSummary[];
  readonly currencyCode: string;
}) {
  const cells = Array.from({ length: 3 }, (_, index) => sheets[index] ?? null);

  return (
    <section aria-label="Recent estimate running costs" className="grid h-full min-h-0 grid-cols-3">
      {cells.map((sheet, index) => (
        <div
          key={sheet?.id ?? `empty-${index}`}
          data-testid="project-location-estimate-cost-cell"
          className={cn(
            "flex min-w-0 flex-col justify-between p-1",
            index < 2 && "border-r border-[color:var(--glass-border)]",
          )}
        >
          <span
            className="-mx-1 block truncate border-b border-[color:var(--glass-border)] px-1 pb-1 text-left text-[8px] font-medium leading-3 text-secondary"
            title={sheet?.name ?? "No estimate sheet"}
          >
            {sheet?.name ?? "No estimate sheet"}
          </span>
          <span className="mt-1 self-end whitespace-nowrap font-numeric text-[11px] font-medium leading-3 text-ink">
            {sheet ? formatChartMoney(sheet.totalCost, currencyCode) : "—"}
          </span>
        </div>
      ))}
    </section>
  );
}

type BudgetHealthState = "missing" | "empty" | "success" | "warning" | "danger";

function formatBudgetPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatTrackPercent(value: number) {
  return `${Math.max(0, Math.min(100, value)).toFixed(2)}%`;
}

function getBudgetHealthState(usagePercent: number, hasBudget: boolean, total: number): BudgetHealthState {
  if (!hasBudget) return "missing";
  if (total <= 0) return "empty";
  if (usagePercent > 100) return "danger";
  if (usagePercent >= BUDGET_WARNING_THRESHOLD_PERCENT) return "warning";
  return "success";
}

function budgetHealthTextClass(state: BudgetHealthState) {
  if (state === "danger" || state === "warning" || state === "success") return "text-secondary";
  return "text-tertiary";
}

function budgetHealthFillClass(state: BudgetHealthState) {
  if (state === "success" || state === "warning" || state === "danger") return BUDGET_HEALTH_ACTUAL_FILL_CLASS;
  return "bg-divider";
}

type ProjectEstimateBudgetHealthCell = {
  readonly key: string;
  readonly sheet: ProjectRecentEstimateSheetSummary | null;
  readonly budget: number;
  readonly hasBudget: boolean;
  readonly usagePercent: number;
  readonly state: BudgetHealthState;
  readonly budgetTickPercent: number;
  readonly inBudgetFillPercent: number;
  readonly overBudgetFillPercent: number;
  readonly statusLabel: string;
  readonly meterLabel: string;
};

type ProjectActivityGroup = {
  readonly label: string;
  readonly items: ProjectActivityItem[];
};

function formatProjectActivitySheetLabel(item: ProjectActivityItem) {
  return item.sheetCode ? `${item.estimateName} - ${item.sheetCode}` : item.estimateName;
}

function summarizeProjectActivityItem(item: ProjectActivityItem) {
  return item.summary ?? item.targetLabel;
}

function groupProjectActivityItems(items: readonly ProjectActivityItem[]): ProjectActivityGroup[] {
  const groups: ProjectActivityGroup[] = [];
  const groupsByLabel = new Map<string, ProjectActivityGroup>();

  for (const item of items) {
    const label = formatActivityDay(item.createdAt);
    const existingGroup = groupsByLabel.get(label);
    if (existingGroup) {
      existingGroup.items.push(item);
      continue;
    }
    const group = { label, items: [item] };
    groupsByLabel.set(label, group);
    groups.push(group);
  }

  return groups;
}

function createProjectEstimateBudgetHealthCell(
  sheet: ProjectRecentEstimateSheetSummary | null,
  index: number,
  currencyCode: string,
): ProjectEstimateBudgetHealthCell {
  if (!sheet) {
    return {
      key: `empty-budget-${index}`,
      sheet: null,
      budget: 0,
      hasBudget: false,
      usagePercent: 0,
      state: "missing",
      budgetTickPercent: 0,
      inBudgetFillPercent: 0,
      overBudgetFillPercent: 0,
      statusLabel: "No sheet",
      meterLabel: "No estimate sheet",
    };
  }

  const budget = Math.max(0, sheet.projectBudget ?? 0);
  const total = Math.max(0, sheet.totalCost);
  const hasBudget = budget > 0;
  const usagePercent = hasBudget ? (total / budget) * 100 : 0;
  const state = getBudgetHealthState(usagePercent, hasBudget, total);
  const scaleMax = hasBudget ? Math.max(budget, total, 1) : Math.max(total, 1);
  const statusLabel = !hasBudget
    ? "No budget"
    : total <= 0
      ? "No cost"
      : total > budget
        ? `${formatBudgetPercent(usagePercent)} overbudget`
        : `${formatBudgetPercent(usagePercent)} used`;
  const meterLabel = !hasBudget
    ? `${sheet.name} has no planned budget`
    : total <= 0
      ? `${sheet.name} has no estimate cost yet`
      : total > budget
        ? `${sheet.name} is ${formatChartMoney(total - budget, currencyCode)} over budget`
        : `${sheet.name} has ${formatChartMoney(budget - total, currencyCode)} remaining`;

  return {
    key: sheet.id,
    sheet,
    budget,
    hasBudget,
    usagePercent,
    state,
    budgetTickPercent: hasBudget ? (budget / scaleMax) * 100 : 0,
    inBudgetFillPercent: hasBudget ? (Math.min(total, budget) / scaleMax) * 100 : 0,
    overBudgetFillPercent: hasBudget && total > budget ? ((total - budget) / scaleMax) * 100 : 0,
    statusLabel,
    meterLabel,
  };
}

function ProjectEstimateBudgetHealthPanel({
  sheets,
  currencyCode,
}: {
  readonly sheets: readonly ProjectRecentEstimateSheetSummary[];
  readonly currencyCode: string;
}) {
  const cells = Array.from({ length: 3 }, (_, index) => (
    createProjectEstimateBudgetHealthCell(sheets[index] ?? null, index, currencyCode)
  ));

  return (
    <section aria-label="Recent estimate budget health" className="flex h-full min-h-0 flex-col">
      <div
        className="grid h-7 shrink-0 grid-cols-3 border-b border-[color:var(--glass-border)]"
        data-project-location-budget-health-header
      >
        {cells.map((cell, index) => (
          <div
            key={`${cell.key}-header`}
            data-testid="project-location-budget-health-header-cell"
            className={cn(
              "flex min-w-0 items-center justify-between gap-1 px-2",
              index < 2 && "border-r border-[color:var(--glass-border)]",
              index === 0 && "pl-0",
              index === 2 && "pr-0",
            )}
          >
            <span className="truncate text-[8px] font-medium leading-3 text-tertiary">
              {cell.state === "danger" ? "" : "Budget"}
            </span>
            <span className={cn("shrink-0 text-right font-numeric text-[8px] font-medium leading-3", budgetHealthTextClass(cell.state))}>
              {cell.statusLabel}
            </span>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-3">
        {cells.map((cell, index) => (
          <div
            key={`${cell.key}-body`}
            data-testid="project-location-budget-health-cell"
            className={cn(
              "flex min-h-0 min-w-0 flex-col items-center justify-center px-2 py-2",
              index < 2 && "border-r border-[color:var(--glass-border)]",
              index === 0 && "pl-0",
              index === 2 && "pr-0",
            )}
          >
            {!cell.sheet ? (
              <span className="text-[8px] leading-3 text-tertiary">No estimate sheet</span>
            ) : (
              <>
                <meter
                  className="sr-only"
                  min={0}
                  max={Math.max(100, Math.round(cell.usagePercent))}
                  value={cell.hasBudget ? Math.round(cell.usagePercent) : 0}
                  aria-label={`${cell.sheet.name} budget health`}
                  aria-valuemin={0}
                  aria-valuemax={Math.max(100, Math.round(cell.usagePercent))}
                  aria-valuenow={cell.hasBudget ? Math.round(cell.usagePercent) : 0}
                  aria-valuetext={cell.meterLabel}
                />
                <div
                  className="relative h-full min-h-[48px] w-2 overflow-hidden rounded-xs bg-white/45"
                  aria-hidden="true"
                  data-project-location-budget-meter
                  data-budget-health-state={cell.state}
                >
                  <span
                    className={cn("absolute inset-x-0 bottom-0 rounded-xs", budgetHealthFillClass(cell.state))}
                    style={{ height: formatTrackPercent(cell.inBudgetFillPercent) }}
                    data-project-location-budget-fill
                  />
                  {cell.overBudgetFillPercent > 0 ? (
                    <span
                      className={`absolute inset-x-0 rounded-xs ${BUDGET_HEALTH_OVERBUDGET_FILL_CLASS}`}
                      style={{
                        bottom: formatTrackPercent(cell.budgetTickPercent),
                        height: formatTrackPercent(cell.overBudgetFillPercent),
                      }}
                      data-project-location-budget-overflow
                    />
                  ) : null}
                  {cell.hasBudget ? (
                    <span
                      className={`absolute -left-0.5 h-px w-3 ${BUDGET_HEALTH_BUDGET_TICK_CLASS} shadow-[0_0_0_1px_rgba(255,255,255,0.8)]`}
                      style={{ bottom: formatTrackPercent(cell.budgetTickPercent) }}
                      data-project-location-budget-tick
                    />
                  ) : null}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div
        className="grid h-8 shrink-0 grid-cols-3 border-t border-[color:var(--glass-border)] bg-white/10"
        data-project-location-budget-health-footer
      >
        {cells.map((cell, index) => (
          <div
            key={`${cell.key}-footer`}
            data-testid="project-location-budget-health-footer-cell"
            className={cn(
              "flex min-w-0 items-center justify-between gap-1 px-2",
              index < 2 && "border-r border-[color:var(--glass-border)]",
              index === 0 && "pl-0",
              index === 2 && "pr-0",
            )}
          >
            <span className="text-[8px] font-medium leading-3 text-tertiary">Budget</span>
            <span className={cn("min-w-0 truncate text-right font-numeric text-[8px] leading-3", budgetHealthTextClass(cell.state))}>
              {cell.sheet ? (cell.hasBudget ? formatChartMoney(cell.budget, currencyCode) : "No budget") : "—"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProjectActivityFeedPanel({ page }: { readonly page: ProjectActivityPage }) {
  const groups = groupProjectActivityItems(page.items);
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(() => new Set());

  const toggleProjectActivityGroup = useCallback((label: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  return (
    <section aria-label="Project activity feed" className="flex h-full min-h-0 flex-col">
      <header className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-[color:var(--glass-border)] pb-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium leading-3 text-ink">Activity</p>
          <p className="truncate text-[8px] leading-3 text-tertiary">All estimate sheets</p>
        </div>
      </header>

      {groups.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-2 text-center">
          <div className="max-w-[160px]">
            <p className="text-[10px] font-medium leading-4 text-secondary">No sheet changes yet</p>
            <p className="mt-1 text-[9px] leading-4 text-tertiary">Estimate edits across this project will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto pr-1">
          {groups.map((group) => {
            const collapsed = collapsedGroups.has(group.label);
            const groupId = `project-activity-group-${group.label.replace(/\W+/g, "-").toLowerCase()}`;

            return (
              <div key={group.label} className="min-w-0">
                <button
                  type="button"
                  aria-expanded={!collapsed}
                  aria-controls={groupId}
                  data-testid="project-activity-date-toggle"
                  className="sticky top-0 z-10 flex h-[60px] w-full items-center gap-2 border-b border-[color:var(--glass-border)] bg-transparent text-left text-[8px] font-medium uppercase leading-3 tracking-normal text-tertiary transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  onClick={() => toggleProjectActivityGroup(group.label)}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center text-secondary" aria-hidden="true">
                    <CaretDown size={11} weight="regular" className={collapsed ? "-rotate-90" : ""} />
                  </span>
                  <span className="min-w-0 truncate">{group.label}</span>
                </button>
                <ol
                  id={groupId}
                  hidden={collapsed}
                  className="ml-3 border-l border-[color:var(--glass-border)] pl-3"
                >
                  {group.items.map((item) => {
                    const sheetLabel = formatProjectActivitySheetLabel(item);
                    return (
                      <li key={item.id} className="border-b border-[color:var(--glass-border)] last:border-b-0">
                        <Link
                          href={item.href}
                          aria-label={`${item.title} in ${sheetLabel}`}
                          className="group block min-w-0 px-1.5 py-2 transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        >
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <span className="min-w-0 truncate text-[10px] font-medium leading-4 text-ink">
                              {item.title}
                            </span>
                            <time
                              dateTime={item.createdAt}
                              className="shrink-0 whitespace-nowrap font-numeric text-[8px] leading-4 text-tertiary"
                            >
                              {formatActivityTime(item.createdAt)}
                            </time>
                          </div>
                          <p className="mt-0.5 max-h-8 overflow-hidden text-[9px] leading-4 text-secondary">
                            {summarizeProjectActivityItem(item)}
                          </p>
                          <div className="mt-1 flex min-w-0 items-center justify-between gap-2 text-[8px] leading-3 text-tertiary">
                            <span className="min-w-0 truncate" title={sheetLabel}>
                              {sheetLabel}
                            </span>
                            <span className="shrink-0 max-w-[72px] truncate text-right" title={item.actorLabel}>
                              {item.actorLabel}
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      )}

      {page.nextCursor ? (
        <p className="shrink-0 border-t border-[color:var(--glass-border)] pt-2 text-[8px] leading-3 text-tertiary">
          Showing latest changes
        </p>
      ) : null}
    </section>
  );
}

function ProjectIdentityFields({
  name,
  client,
  location,
  googleMapsApiKey,
  locationSaveStatus,
  readOnly,
  onLocationChange,
  onPlaceSelect,
}: {
  readonly name: string;
  readonly client: string;
  readonly location: string;
  readonly googleMapsApiKey: string;
  readonly locationSaveStatus: string;
  readonly readOnly: boolean;
  readonly onLocationChange: (value: string) => void;
  readonly onPlaceSelect: (selection: ProjectGooglePlaceSelection) => Promise<void>;
}) {
  const metadataInputClassName = cn(PROJECT_METADATA_INPUT_CLASS, readOnly && PROJECT_METADATA_READONLY_INPUT_CLASS);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-auto p-2">
      <ProjectDataField label="Project name">
        <ControlInput
          name={readOnly ? undefined : "name"}
          value={readOnly ? name : undefined}
          defaultValue={readOnly ? undefined : name}
          required={!readOnly}
          readOnly={readOnly}
          aria-readonly={readOnly ? "true" : undefined}
          className={cn(metadataInputClassName, "text-ink")}
        />
      </ProjectDataField>

      <ProjectDataField label="Client">
        <ControlInput
          name={readOnly ? undefined : "clientName"}
          value={readOnly ? client : undefined}
          defaultValue={readOnly ? undefined : client}
          placeholder="Client name"
          readOnly={readOnly}
          aria-readonly={readOnly ? "true" : undefined}
          className={cn(metadataInputClassName, "text-secondary")}
        />
      </ProjectDataField>

      <ProjectDataField label="Project address">
        <ProjectAddressAutocomplete
          apiKey={googleMapsApiKey}
          name={readOnly ? undefined : "location"}
          value={location}
          onValueChange={onLocationChange}
          onPlaceSelect={onPlaceSelect}
          readOnly={readOnly}
          inputClassName={metadataInputClassName}
        />
        {locationSaveStatus ? (
          <output className="text-[9px] leading-3 text-tertiary" aria-live="polite">
            {locationSaveStatus}
          </output>
        ) : null}
      </ProjectDataField>
    </div>
  );
}

function ProjectIdentityFrame({
  children,
  createdLabel,
  updatedLabel,
}: {
  readonly children: ReactNode;
  readonly createdLabel: string;
  readonly updatedLabel: string;
}) {
  return (
    <div className="dashboard-glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-xs">
      {children}
      <div className="grid grid-cols-2 divide-x divide-[color:var(--glass-border)] border-t border-[color:var(--glass-border)] bg-white/25">
        <ProjectTimestampField label="Created" value={createdLabel} />
        <ProjectTimestampField label="Updated" value={updatedLabel} />
      </div>
    </div>
  );
}

function AutoSubmitForm({
  projectId,
  projectImageUrl,
  children,
}: {
  readonly projectId: string;
  readonly projectImageUrl?: string;
  readonly children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  const handleBlur = () => {
    if (formRef.current) {
      startTransition(() => {
        formRef.current?.requestSubmit();
      });
    }
  };

  return (
    <form
      ref={formRef}
      action={updateProjectDetails}
      className={["flex min-h-0 flex-1 flex-col", isPending ? "opacity-60" : ""].filter(Boolean).join(" ")}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          handleBlur();
        }
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      {projectImageUrl ? <input type="hidden" name="projectImageUrl" value={projectImageUrl} /> : null}
      {children}
      <output className="sr-only" aria-live="polite">
        {isPending ? "Saving project details" : ""}
      </output>
    </form>
  );
}

export function ProjectDashboardClient({
  project,
  fallback,
  estimateCount,
  recentEstimateSheets,
  canEditProject,
  projectLocation,
  projectActivityPage,
  googleMapsApiKey,
  googleMapsMapId,
}: ProjectDashboardClientProps) {
  const metadata = useMemo(() => readProjectMetadata(project?.metadata ?? null), [project?.metadata]);
  const name = project?.name ?? fallback.name;
  const client = project?.client_name ?? fallback.client;
  const location = project?.location ?? fallback.location;
  const projectCode = project?.project_code ?? fallback.projectCode;
  const currencyCode = project?.currency_code ?? fallback.currencyCode;
  const projectId = project?.id ?? fallback.id;
  const updatedLabel = formatDate(project?.updated_at);
  const createdLabel = formatDate(project?.created_at);
  const canEditProjectDetails = Boolean(project && canEditProject);
  const initialPin = useMemo<ProjectLocationPin | null>(() => (
    projectLocation ? { latitude: projectLocation.latitude, longitude: projectLocation.longitude } : null
  ), [projectLocation]);
  const [addressValue, setAddressValue] = useState(location);
  const [locationPin, setLocationPin] = useState<ProjectLocationPin | null>(initialPin);
  const [locationSaveStatus, setLocationSaveStatus] = useState("");

  useEffect(() => {
    queueMicrotask(() => setAddressValue(location));
  }, [location]);

  useEffect(() => {
    queueMicrotask(() => setLocationPin(initialPin));
  }, [initialPin]);

  const handleGooglePlaceSelect = useCallback(async (selection: ProjectGooglePlaceSelection) => {
    setLocationPin({ latitude: selection.latitude, longitude: selection.longitude });
    if (!canEditProjectDetails) return;

    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("latitude", String(selection.latitude));
    formData.set("longitude", String(selection.longitude));
    formData.set("addressText", selection.addressText);
    formData.set("displayLabel", selection.displayLabel ?? "");
    formData.set("source", "geocoded");
    formData.set("geocoderName", "google");
    formData.set("providerPlaceId", selection.providerPlaceId ?? "");
    formData.set("syncProjectAddress", "1");

    const result = await saveProjectLocation(initialProjectLocationActionState, formData);
    setLocationSaveStatus(result.message);
  }, [canEditProjectDetails, projectId]);
  const mapOverlaySummary = useMemo(() => (
    <ProjectEstimateSummaryPanel
      estimateCount={estimateCount}
      recentEstimateSheets={recentEstimateSheets}
    />
  ), [estimateCount, recentEstimateSheets]);
  const mapRightRail = useMemo(() => <ProjectActivityFeedPanel page={projectActivityPage} />, [projectActivityPage]);
  const mapLowerLeftSummary = useMemo(() => (
    <ProjectEstimateCostStrip
      sheets={recentEstimateSheets}
      currencyCode={currencyCode}
    />
  ), [currencyCode, recentEstimateSheets]);
  const mapLowerLeftDetail = useMemo(() => (
    <ProjectEstimateBudgetHealthPanel
      sheets={recentEstimateSheets}
      currencyCode={currencyCode}
    />
  ), [currencyCode, recentEstimateSheets]);

  return (
    <section className="flex h-full min-h-0 flex-col justify-start md:flex-row" aria-label={`${name} project information`}>
      <aside className="flex h-auto w-full shrink-0 flex-col p-2 md:h-full md:w-[274px]" aria-label="Project identity">
        {canEditProjectDetails ? (
          <AutoSubmitForm projectId={projectId} projectImageUrl={metadata.projectImageUrl}>
            <input type="hidden" name="projectCode" value={projectCode} />
            <input type="hidden" name="currencyCode" value={currencyCode} />
            <ProjectIdentityFrame createdLabel={createdLabel} updatedLabel={updatedLabel}>
              <ProjectIdentityFields
                name={name}
                client={client}
                location={addressValue}
                googleMapsApiKey={googleMapsApiKey}
                locationSaveStatus={locationSaveStatus}
                readOnly={false}
                onLocationChange={setAddressValue}
                onPlaceSelect={handleGooglePlaceSelect}
              />
            </ProjectIdentityFrame>
          </AutoSubmitForm>
        ) : (
          <ProjectIdentityFrame createdLabel={createdLabel} updatedLabel={updatedLabel}>
            <ProjectIdentityFields
              name={name}
              client={client}
              location={addressValue}
              googleMapsApiKey={googleMapsApiKey}
              locationSaveStatus=""
              readOnly
              onLocationChange={setAddressValue}
              onPlaceSelect={handleGooglePlaceSelect}
            />
          </ProjectIdentityFrame>
        )}
      </aside>
      <main className="flex min-h-0 flex-1 overflow-auto p-2" aria-label="Project dashboard">
        <section
          className="dashboard-glass flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xs p-2"
          aria-label="Project command surface"
        >
          <ProjectLocationMap
            apiKey={googleMapsApiKey}
            mapId={googleMapsMapId}
            pin={locationPin}
            addressLabel={addressValue}
            overlaySummary={mapOverlaySummary}
            rightRail={mapRightRail}
            lowerLeftSummary={mapLowerLeftSummary}
            lowerLeftDetail={mapLowerLeftDetail}
          />
        </section>
      </main>
    </section>
  );
}
