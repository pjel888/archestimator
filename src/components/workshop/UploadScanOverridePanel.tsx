"use client";

import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import type { UploadScanOverrideReviewRow } from "@/lib/uploads/scan-override-review";

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "approved"; message: string }
  | { status: "failed"; message: string };

type UploadScanOverridePanelProps = {
  rows: readonly UploadScanOverrideReviewRow[];
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return dateFormatter.format(new Date(value));
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "Unknown size";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getDefaultExpiryValue() {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 7);
  return expiresAt.toISOString().slice(0, 16);
}

function stateMessageId(assetId: string) {
  return `scan-override-state-${assetId}`;
}

export function UploadScanOverridePanel({ rows }: UploadScanOverridePanelProps) {
  const [submissionState, setSubmissionState] = useState<Record<string, SubmissionState>>({});
  const defaultExpiry = useMemo(() => getDefaultExpiryValue(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const assetId = String(formData.get("assetId") ?? "");
    const expectedChecksumSha256 = String(formData.get("expectedChecksumSha256") ?? "");
    const reason = String(formData.get("reason") ?? "");
    const rawExpiresAt = String(formData.get("expiresAt") ?? "");
    const parsedExpiresAt = new Date(rawExpiresAt);
    if (!Number.isFinite(parsedExpiresAt.getTime())) {
      setSubmissionState((current) => ({
        ...current,
        [assetId]: {
          status: "failed",
          message: "Scan override could not be approved. Recheck status, checksum, and expiry.",
        },
      }));
      return;
    }
    const expiresAt = parsedExpiresAt.toISOString();

    setSubmissionState((current) => ({ ...current, [assetId]: { status: "submitting" } }));

    try {
      const response = await fetch("/api/component-library/attachments/scan-override", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetId,
          expectedChecksumSha256,
          reason,
          expiresAt,
        }),
      });

      if (!response.ok) {
        throw new Error("Scan override could not be approved.");
      }

      const body = await response.json() as { overrideExpiresAt?: string };
      setSubmissionState((current) => ({
        ...current,
        [assetId]: {
          status: "approved",
          message: `Override approved until ${formatDate(body.overrideExpiresAt ?? expiresAt)}.`,
        },
      }));
      form.reset();
    } catch {
      setSubmissionState((current) => ({
        ...current,
        [assetId]: {
          status: "failed",
          message: "Scan override could not be approved. Recheck status, checksum, and expiry.",
        },
      }));
    }
  }

  if (rows.length === 0) {
    return (
      <section className="border border-hairline bg-white p-2">
        <p className="text-[10px] leading-4 text-tertiary">
          No failed or unsupported attachment scans are waiting for override review.
        </p>
      </section>
    );
  }

  return (
    <section className="border border-hairline bg-white">
      <div className="border-b border-hairline p-2 text-[10px] leading-4 text-tertiary">
        Showing {rows.length} latest failed or unsupported component attachment scans.
      </div>
      <div className="divide-y divide-hairline">
        {rows.map((row) => {
          const currentState = submissionState[row.id] ?? { status: "idle" };
          const disabled = currentState.status === "submitting" || !row.checksumSha256;

          return (
            <article key={row.id} className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
              <div className="min-w-0 space-y-2">
                <div className="min-w-0">
                  <h2 className="truncate text-[11px] font-medium leading-4 text-ink">{row.fileName}</h2>
                  <p className="text-[10px] leading-4 text-tertiary">
                    {row.contentType} - {formatBytes(row.sizeBytes)}
                  </p>
                </div>
                <dl className="grid gap-1 text-[10px] leading-4 text-secondary sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-tertiary">Scan status</dt>
                    <dd>{row.scanStatus}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-tertiary">Scanner</dt>
                    <dd>{row.scanProvider ?? "Not recorded"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-tertiary">Scanned</dt>
                    <dd>{formatDate(row.scannedAt)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-tertiary">Created</dt>
                    <dd>{formatDate(row.createdAt)}</dd>
                  </div>
                </dl>
              </div>

              <form action="/api/component-library/attachments/scan-override" method="post" onSubmit={handleSubmit} className="grid gap-2">
                <input type="hidden" name="assetId" value={row.id} />
                <label htmlFor={`scan-override-checksum-${row.id}`} className="grid gap-1 text-[10px] font-medium leading-none text-secondary">
                  Expected SHA-256
                  <input
                    id={`scan-override-checksum-${row.id}`}
                    name="expectedChecksumSha256"
                    readOnly
                    required
                    value={row.checksumSha256 ?? ""}
                    className="h-7 min-w-0 rounded-xs border border-hairline bg-surfaceMuted px-2 font-numeric text-[10px] font-normal text-ink outline-none"
                  />
                </label>
                <label htmlFor={`scan-override-reason-${row.id}`} className="grid gap-1 text-[10px] font-medium leading-none text-secondary">
                  Override reason
                  <textarea
                    id={`scan-override-reason-${row.id}`}
                    name="reason"
                    required
                    minLength={8}
                    rows={3}
                    className="min-h-16 rounded-xs border border-hairline bg-white px-2 py-1 text-[10px] font-normal leading-4 text-ink outline-none focus:bg-accentSoft"
                    placeholder="Supplier evidence reviewed; file required for estimate validation."
                  />
                </label>
                <label htmlFor={`scan-override-expiry-${row.id}`} className="grid gap-1 text-[10px] font-medium leading-none text-secondary">
                  Expiry
                  <input
                    id={`scan-override-expiry-${row.id}`}
                    name="expiresAt"
                    type="datetime-local"
                    required
                    defaultValue={defaultExpiry}
                    className="h-7 rounded-xs border border-hairline bg-white px-2 text-[10px] font-normal text-ink outline-none focus:bg-accentSoft"
                  />
                </label>
                {!row.checksumSha256 ? (
                  <p className="rounded-xs border border-dangerSoft bg-dangerSoft/40 p-2 text-[10px] leading-4 text-danger">
                    This asset is missing a checksum and cannot be override-approved.
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" size="sm" variant="secondary" disabled={disabled}>
                    {currentState.status === "submitting" ? "Approving" : "Approve override"}
                  </Button>
                  <output
                    id={stateMessageId(row.id)}
                    aria-live="polite"
                    className={[
                      "text-[10px] leading-4",
                      currentState.status === "failed" ? "text-danger" : "text-tertiary",
                    ].join(" ")}
                  >
                    {currentState.status === "idle" || currentState.status === "submitting" ? "" : currentState.message}
                  </output>
                </div>
              </form>
            </article>
          );
        })}
      </div>
    </section>
  );
}
