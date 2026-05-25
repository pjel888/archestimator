import type { ProjectChartSeries } from "@/lib/project-charts/types";

type ProjectChartBucketTableProps = {
  series: ProjectChartSeries;
  currencyCode: string;
  groupingLabel: string;
};

export function ProjectChartBucketTable({ series, currencyCode, groupingLabel }: ProjectChartBucketTableProps) {
  return (
    <div className="overflow-hidden border-t border-hairline">
      <table aria-label={`${series.estimateName} bucket table`} className="w-full border-collapse text-[10px]">
        <thead className="bg-muted/30 text-[9px] uppercase tracking-normal text-muted-foreground">
          <tr>
            <th className="px-2 py-2 text-left font-medium">{groupingLabel}</th>
            <th className="px-2 py-2 text-right font-medium">Cost</th>
            <th className="px-2 py-2 text-right font-medium">Share</th>
          </tr>
        </thead>
        <tbody>
          {series.tableRows.map((row) => (
            <tr key={row.id} className={row.kind === "group" ? "border-t border-hairline bg-muted/20" : "border-t border-hairline"}>
              <td className="max-w-36 truncate py-2 pr-2 font-medium text-foreground" style={{ paddingLeft: `${8 + row.depth * 12}px` }}>
                {row.color ? (
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-xs" style={{ backgroundColor: row.color }} />
                ) : (
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-xs border border-hairline bg-white" />
                )}
                <span className={row.kind === "group" ? "font-medium" : undefined}>{row.label}</span>
              </td>
              <td className="px-2 py-2 text-right tabular-nums">{formatMoney(row.total, currencyCode)}</td>
              <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{formatPercent(row.share)}</td>
            </tr>
          ))}
          {series.tableRows.length === 0 ? (
            <tr>
              <td className="px-2 py-5 text-center text-[10px] text-muted-foreground" colSpan={3}>
                No cost rows.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function formatMoney(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}
