import type { ProjectPublicationSnapshot } from "@/lib/publication/types";

type SharePageSummaryCardProps = {
  snapshot: ProjectPublicationSnapshot;
};

function formatMoney(value: number, currencyCode: string) {
  return `${currencyCode} ${new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function formatPreparedOn(generatedAt: string) {
  const date = new Date(generatedAt);
  if (Number.isNaN(date.getTime())) return generatedAt;
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * T1-C (Shared Link Improvement — MVP): the inline trust Summary card (AC-UX-12).
 *
 * A "financial total" card with strong numeric hierarchy that anchors the public
 * proposal page on the grand total (24px tabular-nums) rather than hand-rolled
 * decision-button styling. All data is sourced directly from the existing snapshot —
 * NO new snapshot fields, NO data change. Rendered inline (kept visible in print).
 *
 * Design-system compliant: rounded-xs, hairline borders, surface tokens, SF Pro
 * regular/medium weights, zero tracking. Label floor 12px / body 13px per the
 * Client-Portal scale (the /share px-cap exemption permits the larger sizes; this
 * file keeps every client-facing string at or above 11px).
 */
export function SharePageSummaryCard({ snapshot }: SharePageSummaryCardProps) {
  const { project } = snapshot;
  const currencyCode = project.currencyCode;

  const stats: { label: string; value: string }[] = [
    {
      label: snapshot.estimateCount === 1 ? "Sheet" : "Sheets",
      value: String(snapshot.estimateCount),
    },
    {
      label: snapshot.rowCount === 1 ? "Line item" : "Line items",
      value: String(snapshot.rowCount),
    },
    { label: "Currency", value: currencyCode },
    ...(project.clientName ? [{ label: "Prepared for", value: project.clientName }] : []),
    { label: "Prepared on", value: formatPreparedOn(snapshot.generatedAt) },
  ];

  return (
    <section
      aria-label="Proposal summary"
      className="rounded-xs border border-hairline bg-white p-4 text-ink"
    >
      <p className="text-[12px] font-medium uppercase leading-[16px] tracking-normal text-secondary">
        Proposal total
      </p>
      <p className="mt-1.5 text-[24px] font-medium leading-[30px] tracking-normal tabular-nums text-ink">
        {formatMoney(snapshot.totalCost, currencyCode)}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-hairline pt-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <dt className="text-[12px] font-medium uppercase leading-[16px] tracking-normal text-secondary">
              {stat.label}
            </dt>
            <dd className="mt-0.5 truncate text-[13px] leading-[18px] tracking-normal text-ink" title={stat.value}>
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
