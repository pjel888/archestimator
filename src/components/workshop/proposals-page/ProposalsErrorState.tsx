import type { RefObject } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

type ProposalsErrorStateProps = {
  error: "unauthorized" | "unknown";
  isRetrying?: boolean;
  onRetry: () => void;
  retryButtonRef?: RefObject<HTMLButtonElement | null>;
};

function readErrorMessage(error: ProposalsErrorStateProps["error"]) {
  if (error === "unauthorized") return "Sign in with the email address that received the proposal.";
  return "The proposals inbox could not be loaded.";
}

export function ProposalsErrorState({ error, isRetrying = false, onRetry, retryButtonRef }: ProposalsErrorStateProps) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xs border border-dangerSoft bg-white px-6 py-10 text-center">
      <span className="mb-3 grid size-10 place-items-center rounded-xs bg-dangerSoft text-danger" aria-hidden="true">
        <WarningCircle size={18} weight="regular" />
      </span>
      <h2 className="text-sm font-medium text-ink">Unable to load proposals</h2>
      <p className="mt-2 max-w-[34rem] text-xs leading-5 text-secondary">{readErrorMessage(error)}</p>
      <button
        ref={retryButtonRef}
        type="button"
        className="mt-4 inline-flex min-h-8 min-w-[96px] items-center justify-center rounded-xs border border-hairline bg-transparent px-2 py-1.5 !text-[10px] font-medium leading-none text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        onClick={onRetry}
        disabled={isRetrying}
      >
        {isRetrying ? "Retrying" : "Retry"}
      </button>
    </div>
  );
}
