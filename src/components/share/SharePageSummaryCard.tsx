import type { ProjectPublicationSnapshot } from "@/lib/publication/types";

type SharePageSummaryCardProps = {
  expiresAt?: string | null;
  snapshot: ProjectPublicationSnapshot;
};
const shareSummaryMoneyFormatter = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(value: number, currencyCode: string) {
  return `${currencyCode} ${shareSummaryMoneyFormatter.format(value)}`;
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

function formatExpiry(expiresAt: string) {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return expiresAt;
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * T1-C (Shared Link Improvement — MVP): the inline trust Summary card (AC-UX-12).
 *
 * A "financial total" summary strip that anchors the public proposal page on the
 * grand total rather than hand-rolled
 * decision-button styling. All data is sourced directly from the existing snapshot —
 * NO new snapshot fields, NO data change. Rendered inline (kept visible in print).
 *
 * Design-system compliant: hairline borders, surface tokens, SF Pro regular/medium
 * weights, and compact client-review density.
 */
export function SharePageSummaryCard({ expiresAt, snapshot }: SharePageSummaryCardProps) {
  const { project } = snapshot;
  const currencyCode = project.currencyCode;
  const issuance = snapshot.issuance;
  const validThrough = issuance?.validThrough ?? expiresAt;

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
    ...(issuance
      ? [
          { label: "Issue", value: `#${issuance.issueNumber} · v${issuance.version}` },
          { label: "Issued on", value: formatPreparedOn(issuance.issuedAt) },
          { label: "Scope", value: `${issuance.selectedEstimateIds.length} ${issuance.selectedEstimateIds.length === 1 ? "sheet" : "sheets"}` },
        ]
      : []),
    ...(validThrough ? [{ label: "Available until", value: formatExpiry(validThrough) }] : []),
  ];

  return (
    <section
      aria-label="Proposal summary"
      className="border-y border-hairline py-3 text-ink"
    >
      <p className="text-[9px] font-medium leading-[12px] text-tertiary">
        Proposal total
      </p>
      <p className="mt-1 text-[18px] font-medium leading-[24px] tabular-nums text-ink">
        {formatMoney(snapshot.totalCost, currencyCode)}
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-hairline pt-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <dt className="text-[9px] font-medium leading-[12px] text-tertiary">
              {stat.label}
            </dt>
            <dd className="mt-0.5 truncate text-[11px] leading-[16px] text-ink" title={stat.value}>
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
