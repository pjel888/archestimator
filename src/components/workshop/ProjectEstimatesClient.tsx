"use client";

import { useMemo, useRef, useState } from "react";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import { FileText, Plus } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { ProjectEstimatesTable, type ProjectEstimateTableRow } from "@/components/workshop/ProjectEstimatesTable";
import { createEstimateSheetDraft } from "@/lib/estimates/actions";

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
  const filteredEstimates = useMemo(() => filterEstimateSheets(estimates, searchQuery), [estimates, searchQuery]);
  const emptyMessage = searchQuery.trim() ? "No matching estimate sheets" : "No estimate sheets yet";
  const hasEstimates = estimates.length > 0;
  const hasFilteredEstimates = filteredEstimates.length > 0;

  function handleCreateEstimateSheet() {
    if (createInFlightRef.current) return;

    createInFlightRef.current = true;
    setIsCreating(true);
    setCreateError(null);

    void createEstimateSheetDraft(projectId)
      .then(() => router.refresh())
      .catch((error: unknown) => setCreateError(error instanceof Error ? error.message : "Could not create estimate sheet."))
      .finally(() => {
        createInFlightRef.current = false;
        setIsCreating(false);
      });
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-white" aria-label={`${projectName} estimates`}>
      <div className="flex shrink-0 items-center gap-2 bg-white">
        <SearchInput
          placeholder="Search Estimate Sheets"
          aria-label="Search Estimate Sheets"
          wrapperClassName="w-full"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
          onClear={() => setSearchQuery("")}
        />
      </div>

      <HeaderIconToolbar
        ariaLabel="Project estimate sheet tools"
        labelPrefix="estimate sheets"
        addActions={[
          {
            label: isCreating ? "Creating estimate sheet" : "Create Estimate Sheet",
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
          />
        ) : (
          <EmptyState
            icon={<FileText size={18} weight="regular" aria-hidden="true" />}
            title={hasEstimates ? "No matching estimate sheets" : "Create the first estimate sheet"}
            description={
              hasEstimates
                ? "Try a sheet code, estimate name, or clear search to return to all sheets."
                : "Start an estimate sheet before adding groups, inserting components, or exporting a bid workbook."
            }
            action={
              hasEstimates ? null : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCreateEstimateSheet}
                  disabled={isCreating}
                  aria-label={isCreating ? "Creating first estimate sheet" : "Create first estimate sheet"}
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
