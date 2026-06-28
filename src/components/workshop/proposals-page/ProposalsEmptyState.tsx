import { EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";

export function ProposalsEmptyState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xs border border-dashed border-hairline bg-white/70 px-6 py-10 text-center">
      <span className="mb-3 grid size-10 place-items-center rounded-xs bg-accent-soft text-accent-dark" aria-hidden="true">
        <EnvelopeSimple size={18} weight="regular" />
      </span>
      <h2 className="text-[12px] font-medium text-ink">No proposals yet</h2>
      <p className="mt-2 max-w-[34rem] text-[10px] leading-5 text-secondary">
        Proposals sent to your signed-in email address will appear here.
      </p>
    </div>
  );
}
