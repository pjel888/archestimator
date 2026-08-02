"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  loadEstimateTemplateLinkedInstanceStatus,
  retryEstimateTemplateLinkedInstances,
} from "@/lib/component-library/template-editor-actions";

const VirtualizedLinkedInstanceList = dynamic(
  () => import("./VirtualizedLinkedInstanceList").then((module) => module.VirtualizedLinkedInstanceList),
  {
    ssr: false,
    loading: () => <Skeleton className="mt-1 h-16 w-full" aria-label="Loading linked instances" />,
  },
);

export function TemplateLinkedInstancesStatus({ templateId, canEdit }: { templateId: string; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const queryKey = ["estimate-template-linked-instances", templateId] as const;
  const statusQuery = useQuery({
    queryKey,
    queryFn: () => loadEstimateTemplateLinkedInstanceStatus({ templateId }),
    refetchInterval: (query) => query.state.data?.updatingCount ? 4_000 : false,
  });
  const [retrying, setRetrying] = useState(false);
  const [listExpanded, setListExpanded] = useState(false);
  const status = statusQuery.data;

  if (statusQuery.isPending && !status) {
    return <Skeleton className="mx-2 mt-2 h-9 shrink-0" aria-label="Loading linked instance status" />;
  }
  if (!status) {
    return (
      <section className="mx-2 mt-2 shrink-0 rounded-xs border border-dangerSoft p-2 text-[9px] text-danger">
        <p>Couldn&apos;t load linked-instance status.</p>
        <Button type="button" variant="secondary" size="xs" className="mt-1" onClick={() => void statusQuery.refetch()}>
          Retry
        </Button>
      </section>
    );
  }
  if (status.activeCount === 0) return null;

  const stale = statusQuery.isError;
  return (
    <section className="mx-2 mt-2 shrink-0 rounded-xs border border-hairline bg-surfaceMuted/35 px-2 py-1.5" aria-label="Linked instances">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[9px] font-medium text-ink">Linked instances · v{status.currentVersionNumber}</p>
          <p className="truncate text-[8px] text-tertiary">
            {status.failedCount > 0
              ? `${status.failedCount} of ${status.activeCount} need attention`
              : status.updatingCount > 0
                ? `${status.updatingCount} updating · ${status.currentCount} current`
                : `All ${status.activeCount} linked instances updated`}
            {stale ? " · Status may be outdated" : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {status.retryableCount > 0 && canEdit ? (
            <Button
              type="button"
              variant="secondary"
              size="xs"
              disabled={retrying}
              onClick={() => {
                setRetrying(true);
                void retryEstimateTemplateLinkedInstances({ templateId })
                  .then(() => queryClient.invalidateQueries({ queryKey }))
                  .finally(() => setRetrying(false));
              }}
            >
              {retrying ? "Retrying…" : `Retry ${status.retryableCount}`}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="xs" onClick={() => void statusQuery.refetch()}>
            Refresh
          </Button>
        </div>
      </div>
      <details
        className="mt-1 text-[8px] text-secondary"
        onToggle={(event) => setListExpanded(event.currentTarget.open)}
      >
        <summary className="cursor-pointer select-none">View affected Estimates</summary>
        {listExpanded ? <VirtualizedLinkedInstanceList items={status.items} /> : null}
      </details>
    </section>
  );
}
