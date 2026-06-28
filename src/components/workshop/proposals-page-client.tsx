"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

import { ProposalsEmptyState } from "@/components/workshop/proposals-page/ProposalsEmptyState";
import { ProposalsErrorState } from "@/components/workshop/proposals-page/ProposalsErrorState";
import { ProposalsList } from "@/components/workshop/proposals-page/ProposalsList";
import { loadRecipientProposals } from "@/lib/recipient-proposals/actions";
import type { OpenRecipientProposalActionState } from "@/lib/publication/actions";
import type { RecipientProposalsResult } from "@/lib/repositories/recipient-proposals-repository";

type ProposalsPageClientProps = {
  initialResult: RecipientProposalsResult;
  userEmail: string;
};

function readRefreshErrorLabel(error: "unauthorized" | "unknown") {
  if (error === "unauthorized") return "This signed-in email cannot access the proposals inbox.";
  return "Proposals could not be refreshed.";
}

export function ProposalsPageClient({ initialResult, userEmail }: ProposalsPageClientProps) {
  const queryKey = useMemo(() => ["recipient-proposals", userEmail] as const, [userEmail]);
  const retryButtonRef = useRef<HTMLButtonElement | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshInFlightRef = useRef(false);
  const [lastOkResult, setLastOkResult] = useState<Extract<RecipientProposalsResult, { ok: true }> | null>(
    initialResult.ok ? initialResult : null,
  );

  const query = useQuery({
    queryKey,
    queryFn: loadRecipientProposals,
    initialData: initialResult,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (query.data?.ok) setLastOkResult(query.data);
  }, [query.data]);

  const refresh = useCallback(
    async (options: { focusOnFailure?: boolean } = {}) => {
      if (refreshInFlightRef.current) return;
      refreshInFlightRef.current = true;
      try {
        const result = await query.refetch();
        const failed = Boolean(result.error) || result.data?.ok === false;
        if (options.focusOnFailure && failed) retryButtonRef.current?.focus();
      } finally {
        refreshInFlightRef.current = false;
      }
    },
    [query],
  );

  useEffect(() => {
    const scheduleFocusRefresh = () => {
      if (document.visibilityState === "hidden") return;
      if (!query.isStale || query.isFetching) return;
      if (focusTimerRef.current) return;

      focusTimerRef.current = setTimeout(() => {
        focusTimerRef.current = null;
        void refresh();
      }, 150);
    };

    window.addEventListener("focus", scheduleFocusRefresh);
    document.addEventListener("visibilitychange", scheduleFocusRefresh);

    return () => {
      window.removeEventListener("focus", scheduleFocusRefresh);
      document.removeEventListener("visibilitychange", scheduleFocusRefresh);
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, [query.isFetching, query.isStale, refresh]);

  const currentResult = query.data ?? initialResult;
  const currentError = currentResult.ok ? null : currentResult.error;

  const handleRetry = () => {
    void refresh({ focusOnFailure: true });
  };

  const handleActionError = useCallback(
    (_error: Exclude<OpenRecipientProposalActionState, null>["error"]) => {
      void refresh();
    },
    [refresh],
  );

  if (!lastOkResult && currentError) {
    return (
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <ProposalsErrorState
          error={currentError}
          isRetrying={query.isFetching}
          onRetry={handleRetry}
          retryButtonRef={retryButtonRef}
        />
      </div>
    );
  }

  const rows = lastOkResult?.rows ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <div className="min-w-0">
          <h1 className="text-sm font-medium text-ink">Proposals</h1>
          <p className="mt-1 truncate text-[10px] text-secondary">{userEmail}</p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-8 min-w-[96px] items-center justify-center rounded-xs border border-hairline bg-white px-2 py-1.5 !text-[10px] font-medium leading-none text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          onClick={handleRetry}
          disabled={query.isFetching}
        >
          {query.isFetching ? "Refreshing" : "Refresh"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {currentError ? (
          <div role="status" className="mb-3 flex items-center justify-between gap-3 rounded-xs border border-warning/25 bg-warning/10 px-3 py-2 text-[10px] text-warning">
            <span className="inline-flex min-w-0 items-center gap-2">
              <WarningCircle size={14} weight="regular" aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 truncate">{readRefreshErrorLabel(currentError)}</span>
            </span>
            <button
              ref={retryButtonRef}
              type="button"
              className="shrink-0 rounded-xs border border-warning/25 bg-white/75 px-2 py-1 font-medium text-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning"
              onClick={handleRetry}
              disabled={query.isFetching}
            >
              Retry
            </button>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <ProposalsList rows={rows} onActionError={handleActionError} />
        ) : (
          <ProposalsEmptyState />
        )}
      </div>
    </div>
  );
}
