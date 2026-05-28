"use client";

import { useMemo, useRef, useState } from "react";
import { useNavigationRouter } from "@/hooks/use-navigation-router";

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
        <ProjectEstimatesTable
          projectId={projectId}
          estimates={filteredEstimates}
          emptyMessage={emptyMessage}
        />
      </div>
    </section>
  );
}
