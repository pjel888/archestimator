import type { UploadOperationsDashboardSnapshot } from "@/lib/uploads/operations-dashboard";

const numberFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatBytes(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} GB`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} MB`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} KB`;
  return `${value} B`;
}

function formatDate(value: string | null) {
  if (!value) return "None";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown";
  return dateFormatter.format(date);
}

function MetricTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="min-h-20 border border-hairline bg-white p-2">
      <p className="text-[9px] font-medium uppercase leading-3 tracking-normal text-tertiary">{label}</p>
      <p className="mt-1 font-numeric text-[12px] leading-4 text-ink">{value}</p>
      {detail ? <p className="mt-1 text-[10px] leading-4 text-tertiary">{detail}</p> : null}
    </div>
  );
}

type UploadOperationsDashboardPanelProps = {
  snapshot: UploadOperationsDashboardSnapshot;
};

export function UploadOperationsDashboardPanel({
  snapshot,
}: UploadOperationsDashboardPanelProps) {
  const surfaceRows = Object.entries(snapshot.bySurface);

  return (
    <div className="space-y-3" aria-label="Upload operations dashboard">
      <section className="border border-hairline bg-white p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[12px] font-medium leading-4 text-ink">Operations window</h2>
            <p className="text-[10px] leading-4 text-tertiary">
              {snapshot.windowHours} hours from {formatDate(snapshot.windowStart)} to {formatDate(snapshot.generatedAt)}
            </p>
          </div>
          <p className="text-[10px] leading-4 text-tertiary">
            Generated {formatDate(snapshot.generatedAt)}
          </p>
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Upload operations summary">
        <MetricTile
          label="Scan queue"
          value={formatNumber(snapshot.scanQueue.queuedCount)}
          detail={`${formatBytes(snapshot.scanQueue.queuedBytes)} queued; oldest ${formatDate(snapshot.scanQueue.oldestQueuedAt)}`}
        />
        <MetricTile
          label="Blocked scans"
          value={formatNumber(snapshot.scanQueue.blockedCount)}
          detail={`${formatNumber(snapshot.scanQueue.infectedCount)} infected, ${formatNumber(snapshot.scanQueue.unsupportedCount)} unsupported, ${formatNumber(snapshot.scanQueue.failedPermanentCount)} failed`}
        />
        <MetricTile
          label="Cleanup backlog"
          value={formatNumber(snapshot.cleanupBacklog.removedAssetCount + snapshot.cleanupBacklog.expiredSessionCount)}
          detail={`${formatNumber(snapshot.cleanupBacklog.cleanupFailedEvents)} failed cleanup events`}
        />
        <MetricTile
          label="Backpressure denials"
          value={formatNumber(snapshot.operationsEvents.backpressureDenied)}
          detail={`${formatNumber(snapshot.operationsEvents.scanFailures)} scan failures in window`}
        />
      </section>

      <section className="border border-hairline bg-white" aria-label="Upload outcomes by surface">
        <div className="border-b border-hairline p-2">
          <h2 className="text-[11px] font-medium leading-4 text-ink">Upload outcomes by surface</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-[10px] leading-4">
            <thead className="bg-surfaceMuted text-secondary">
              <tr>
                <th className="border-b border-hairline px-2 py-1 font-medium">Surface</th>
                <th className="border-b border-hairline px-2 py-1 font-medium">Finalized</th>
                <th className="border-b border-hairline px-2 py-1 font-medium">Removed</th>
                <th className="border-b border-hairline px-2 py-1 font-medium">Failed sessions</th>
                <th className="border-b border-hairline px-2 py-1 font-medium">Active/reserved</th>
                <th className="border-b border-hairline px-2 py-1 font-medium">Bytes</th>
              </tr>
            </thead>
            <tbody>
              {surfaceRows.map(([surface, metrics]) => (
                <tr key={surface} className="align-top">
                  <td className="border-b border-hairline px-2 py-2 text-ink">{surface}</td>
                  <td className="border-b border-hairline px-2 py-2 font-numeric text-secondary">{formatNumber(metrics.finalizedAssets)}</td>
                  <td className="border-b border-hairline px-2 py-2 font-numeric text-secondary">{formatNumber(metrics.removedAssets)}</td>
                  <td className="border-b border-hairline px-2 py-2 font-numeric text-secondary">{formatNumber(metrics.failedSessions)}</td>
                  <td className="border-b border-hairline px-2 py-2 font-numeric text-secondary">{formatNumber(metrics.activeOrReservedSessions)}</td>
                  <td className="border-b border-hairline px-2 py-2 font-numeric text-secondary">{formatBytes(metrics.totalBytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-2 lg:grid-cols-2">
        <div className="border border-hairline bg-white p-2" aria-label="Scan providers">
          <h2 className="text-[11px] font-medium leading-4 text-ink">Scan providers</h2>
          <dl className="mt-2 grid gap-1 text-[10px] leading-4">
            {Object.entries(snapshot.scanQueue.providerCounts).length === 0 ? (
              <div className="text-tertiary">No scan providers recorded in this window.</div>
            ) : (
              Object.entries(snapshot.scanQueue.providerCounts).map(([provider, count]) => (
                <div key={provider} className="flex items-center justify-between gap-3 border-b border-hairline py-1 last:border-b-0">
                  <dt className="truncate text-secondary">{provider}</dt>
                  <dd className="font-numeric text-ink">{formatNumber(count)}</dd>
                </div>
              ))
            )}
          </dl>
        </div>

        <div className="border border-hairline bg-white p-2" aria-label="Operations events">
          <h2 className="text-[11px] font-medium leading-4 text-ink">Operations events</h2>
          <dl className="mt-2 grid gap-1 text-[10px] leading-4">
            <div className="flex items-center justify-between gap-3 border-b border-hairline py-1">
              <dt className="text-secondary">Download URLs issued</dt>
              <dd className="font-numeric text-ink">{formatNumber(snapshot.operationsEvents.downloadUrlIssued)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-hairline py-1">
              <dt className="text-secondary">Scan overrides approved</dt>
              <dd className="font-numeric text-ink">{formatNumber(snapshot.operationsEvents.scanOverrideApproved)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-hairline py-1">
              <dt className="text-secondary">Cleanup queued / failed / succeeded</dt>
              <dd className="font-numeric text-ink">
                {formatNumber(snapshot.cleanupBacklog.cleanupQueuedEvents)} / {formatNumber(snapshot.cleanupBacklog.cleanupFailedEvents)} / {formatNumber(snapshot.cleanupBacklog.cleanupSucceededEvents)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-1">
              <dt className="text-secondary">Audit event retention</dt>
              <dd className="font-numeric text-ink">{formatNumber(snapshot.cleanupBacklog.auditEventRetentionDays)} days</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
