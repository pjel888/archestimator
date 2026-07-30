export type BaselineSummaryRow = {
  baseline_number: number;
  currency_code: string;
  established_at: string;
  issue_number: number;
  total_minor_units: number;
  version_label: string;
};

export function mapBaselineSummary(baseline: BaselineSummaryRow | null) {
  if (!baseline) return null;
  return {
    baselineNumber: Number(baseline.baseline_number),
    currencyCode: baseline.currency_code,
    establishedAt: baseline.established_at,
    issueNumber: Number(baseline.issue_number),
    totalMinorUnits: Number(baseline.total_minor_units),
    versionLabel: baseline.version_label,
  };
}
