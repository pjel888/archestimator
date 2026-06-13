"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { FileText, Plus } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { ProjectEstimatesTable, type ProjectEstimateTableRow } from "@/components/workshop/ProjectEstimatesTable";
import { createEstimateSheetDraft } from "@/lib/estimates/actions";
import type { ProjectEstimateListRow } from "@/lib/estimates/project-estimate-list-row";
import { createProjectEstimatesStore } from "@/stores/project-estimates-store";

// P0 cutover gate (D10). true = optimistic store path (no overlay, instant CRUD).
// Flip to false — or revert the P0 commits — to restore the legacy server-prop +
// router.refresh path without touching the P1/P2 database work. Temporary backout
// aid, removed after P0 browser QA; not a permanent product feature flag.
const OPTIMISTIC_ESTIMATE_LIST_ENABLED = true;

type ProjectEstimatesClientProps = {
  estimates: ProjectEstimateTableRow[];
  projectId: string;
  projectName: string;
};

function filterEstimateSheets(estimates: ProjectEstimateTableRow[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return estimates;

  return estimates.filter((estimate) => {
    const searchable = [estimate.sheet_code, estimate.name].join(" ").toLocaleLowerCase();
    return searchable.includes(normalizedQuery);
  });
}

export function ProjectEstimatesClient({ estimates, projectId, projectName }: ProjectEstimatesClientProps) {
  const router = useNavigationRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const createInFlightRef = useRef(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Per-mount client store seeded from the server prop. Created once via the
  // lazy initializer so it resets on project change but survives re-renders.
  const [store] = useState(() => createProjectEstimatesStore(estimates));

  // Reseed settled rows when the server prop changes (external refresh, cross-tab
  // update, navigation). Pending optimistic rows are preserved by the store.
  useEffect(() => {
    if (!OPTIMISTIC_ESTIMATE_LIST_ENABLED) return;
    store.getState().reseed(estimates);
  }, [estimates, store]);

  const liveEstimates = useStore(store, (state) => state.estimates);
  const sourceEstimates = OPTIMISTIC_ESTIMATE_LIST_ENABLED ? liveEstimates : estimates;
  const filteredEstimates = useMemo(() => filterEstimateSheets(sourceEstimates, searchQuery), [sourceEstimates, searchQuery]);
  const emptyMessage = searchQuery.trim() ? "No matching estimates" : "No estimates yet";
  const hasEstimates = sourceEstimates.length > 0;
  const hasFilteredEstimates = filteredEstimates.length > 0;

  function handleCreateEstimateSheet() {
    if (createInFlightRef.current) return;

    createInFlightRef.current = true;
    setIsCreating(true);
    setCreateError(null);

    if (!OPTIMISTIC_ESTIMATE_LIST_ENABLED) {
      void createEstimateSheetDraft(projectId)
        .then(() => router.refresh())
        .catch((error: unknown) => setCreateError(error instanceof Error ? error.message : "Could not create estimate."))
        .finally(() => {
          createInFlightRef.current = false;
          setIsCreating(false);
        });
      return;
    }

    // Optimistic create: a "Creating…" placeholder appears synchronously, then
    // reconciles to the server-canonical row. No overlay, no full re-render (P0-3).
    const now = new Date().toISOString();
    const tempId = `temp-${crypto.randomUUID()}`;
    const placeholder: ProjectEstimateListRow = {
      id: tempId,
      project_id: projectId,
      name: "Creating…",
      sheet_code: "…",
      currency_code: "PHP",
      notes: null,
      project_budget: null,
      created_at: now,
      updated_at: now,
      firstNodeId: null,
      nodeCount: 0,
      rowItemCount: 0,
      totalProjectCost: 0,
      pendingStatus: "creating",
      pendingError: null,
    };
    store.getState().insertOptimistic(placeholder);

    void createEstimateSheetDraft(projectId)
      .then((result) => store.getState().reconcileInsert(tempId, result.row))
      .catch((error: unknown) => {
        store.getState().rollbackInsert(tempId);
        setCreateError(error instanceof Error ? error.message : "Could not create estimate.");
      })
      .finally(() => {
        createInFlightRef.current = false;
        setIsCreating(false);
      });
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-white" aria-label={`${projectName} estimates`}>
      <div className="flex shrink-0 items-center gap-2 bg-white">
        <SearchInput
          placeholder="Search Estimates"
          aria-label="Search Estimates"
          wrapperClassName="w-full"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
          onClear={() => setSearchQuery("")}
        />
      </div>

      <HeaderIconToolbar
        ariaLabel="Project estimate tools"
        labelPrefix="estimates"
        addActions={[
          {
            label: isCreating ? "Creating estimate" : "Create Estimate",
            disabled: isCreating,
            onClick: handleCreateEstimateSheet,
          },
        ]}
      />
      {createError ? (
        <p className="border-y border-dangerSoft bg-dangerSoft/40 px-2 py-1 text-[10px] font-medium text-danger" role="alert">
          {createError}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 bg-white">
        {hasFilteredEstimates ? (
          <ProjectEstimatesTable
            projectId={projectId}
            estimates={filteredEstimates}
            emptyMessage={emptyMessage}
            store={OPTIMISTIC_ESTIMATE_LIST_ENABLED ? store : undefined}
            optimistic={OPTIMISTIC_ESTIMATE_LIST_ENABLED}
          />
        ) : (
          <EmptyState
            icon={<FileText size={18} weight="regular" aria-hidden="true" />}
            title={hasEstimates ? "No matching estimates" : "Create the first estimate"}
            description={
              hasEstimates
                ? "Try an estimate code, estimate name, or clear search to return to all estimates."
                : "Start an estimate before adding groups, inserting components, or exporting a bid workbook."
            }
            action={
              hasEstimates ? null : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCreateEstimateSheet}
                  disabled={isCreating}
                  aria-label={isCreating ? "Creating first estimate" : "Create first estimate"}
                >
                  <Plus size={12} weight="regular" aria-hidden="true" />
                  {isCreating ? "Creating" : "Create estimate"}
                </Button>
              )
            }
            className="h-full border-0 bg-white"
          />
        )}
      </div>
    </section>
  );
}
