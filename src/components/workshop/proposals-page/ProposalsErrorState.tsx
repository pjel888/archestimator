import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

type ProposalsErrorStateProps = {
  error: "unauthorized" | "unknown";
  isRetrying?: boolean;
  onRetry: () => void;
};

function readErrorMessage(error: ProposalsErrorStateProps["error"]) {
  if (error === "unauthorized") return "Sign in with the email address that received the proposal.";
  return "The proposals inbox could not be loaded.";
}

export function ProposalsErrorState({ error, isRetrying = false, onRetry }: ProposalsErrorStateProps) {
  return (
    // role="alert" announces the list → full-page-error swap to assistive tech. The inline refresh
    // banner uses role="status"; this blocking error is assertive (#7).
    <div
      role="alert"
      className="flex min-h-[280px] flex-col items-center justify-center rounded-xs border border-dangerSoft bg-white px-6 py-10 text-center"
    >
      <span className="mb-3 grid size-10 place-items-center rounded-xs bg-dangerSoft text-danger" aria-hidden="true">
        <WarningCircle size={18} weight="regular" />
      </span>
      <h2 className="text-[12px] font-medium text-ink">Unable to load proposals</h2>
      <p className="mt-2 max-w-[34rem] text-[10px] leading-5 text-secondary">{readErrorMessage(error)}</p>
      <button
        type="button"
        className="mt-4 inline-flex min-h-8 min-w-[96px] items-center justify-center rounded-xs border border-hairline bg-transparent px-2 py-1.5 !text-[10px] font-medium leading-none text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        onClick={onRetry}
      >
        {isRetrying ? "Retrying" : "Retry"}
      </button>
    </div>
  );
}
