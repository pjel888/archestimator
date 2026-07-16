"use client";

import { useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

import { ProposalsEmptyState } from "@/components/workshop/proposals-page/ProposalsEmptyState";
import { ProposalsErrorState } from "@/components/workshop/proposals-page/ProposalsErrorState";
import { ProposalsList } from "@/components/workshop/proposals-page/ProposalsList";
import { loadRecipientProposals } from "@/lib/recipient-proposals/actions";
import type { RecipientProposalsResult } from "@/lib/repositories/recipient-proposals-repository";

type ProposalsPageClientProps = {
  initialResult: RecipientProposalsResult;
  userEmail: string;
};

type RecipientProposalsSuccessResult = Extract<RecipientProposalsResult, { ok: true }>;
type RecipientProposalsErrorCode = Exclude<RecipientProposalsResult, { ok: true }>["error"];

class RecipientProposalsQueryError extends Error {
  code: RecipientProposalsErrorCode;

  constructor(code: RecipientProposalsErrorCode) {
    super(code);
    this.name = "RecipientProposalsQueryError";
    this.code = code;
  }
}

async function fetchRecipientProposals(): Promise<RecipientProposalsSuccessResult> {
  const result = await loadRecipientProposals();
  if (result.ok) return result;
  throw new RecipientProposalsQueryError(result.error);
}

function readQueryErrorCode(error: Error | null): RecipientProposalsErrorCode | null {
  if (error instanceof RecipientProposalsQueryError) return error.code;
  return error ? "unknown" : null;
}

function readRefreshErrorLabel(error: "unauthorized" | "unknown") {
  if (error === "unauthorized") return "This signed-in email cannot access the proposals inbox.";
  return "Proposals could not be refreshed.";
}

export function ProposalsPageClient({ initialResult, userEmail }: ProposalsPageClientProps) {
  const queryKey = useMemo(() => ["recipient-proposals", userEmail] as const, [userEmail]);
  const refreshInFlightRef = useRef(false);

  const query = useQuery({
    queryKey,
    queryFn: fetchRecipientProposals,
    initialData: initialResult.ok ? initialResult : undefined,
    enabled: initialResult.ok,
    // Recipient inbox mutates slowly (sender publish/revoke on a minutes/hours scale);
    // 2-min staleness keeps focus-refetch from hammering the auth+query chain on every tab switch.
    staleTime: 120_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      await query.refetch();
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [query]);

  const currentError = readQueryErrorCode(query.error) ?? (!query.data && !initialResult.ok ? initialResult.error : null);

  // Focus stays on whatever the user clicked (header Refresh or error Retry). No programmatic
  // focus stealing — a background window-focus refetch failing must not yank focus (a11y).
  const handleRetry = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleActionError = useCallback(() => {
    void refresh();
  }, [refresh]);

  if (!query.data && currentError) {
    return (
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <ProposalsErrorState error={currentError} isRetrying={query.isFetching} onRetry={handleRetry} />
      </div>
    );
  }

  const rows = query.data?.rows ?? [];
  const hasMore = query.data?.hasMore ?? false;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        {/* The route header already renders the page <h1>Proposals</h1>; this toolbar only shows
            the inbox email + the single recovery control, to avoid a duplicate <h1> in the outline. */}
        <p className="min-w-0 truncate text-[12px] font-medium text-ink">{userEmail}</p>
        <button
          type="button"
          className="inline-flex min-h-8 min-w-[96px] items-center justify-center rounded-xs border border-hairline bg-white px-2 py-1.5 !text-[10px] font-medium leading-none text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          onClick={handleRetry}
        >
          {query.isFetching ? "Refreshing" : "Refresh"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {currentError ? (
          // Informative status only; recovery is the header Refresh above (one control, no
          // redundant Retry, no focus management). text-secondary passes AA on the warning tint.
          <div role="status" className="mb-3 flex items-center gap-3 rounded-xs border border-warning/40 bg-warning/10 px-3 py-2 text-[10px] text-secondary">
            <WarningCircle size={14} weight="regular" aria-hidden="true" className="shrink-0 text-warning" />
            <span className="min-w-0 truncate">{readRefreshErrorLabel(currentError)}</span>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <ProposalsList rows={rows} hasMore={hasMore} onActionError={handleActionError} />
        ) : (
          <ProposalsEmptyState />
        )}
      </div>
    </div>
  );
}
