import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  canTransitionUploadScanStatus,
  decideUploadScanGate,
  evaluateUploadScanBackpressure,
  getUploadScanPolicy,
  scanStatusFromProviderOutcome,
} from "@/lib/uploads/scanning";
import { createUploadPolicyScannerProvider } from "@/lib/uploads/policy-scanner";

const scanLifecycleMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260626200000_upload_scan_lifecycle_contracts.sql"),
  "utf8",
);

describe("upload scanner lifecycle contracts", () => {
  it("requires scanning only for component attachments", () => {
    expect(getUploadScanPolicy("project-image")).toEqual({ surface: "project-image", required: false });
    expect(getUploadScanPolicy("component-image")).toEqual({ surface: "component-image", required: false });
    expect(getUploadScanPolicy("component-attachment")).toEqual({ surface: "component-attachment", required: true });
  });

  it("fails attachment download/use closed unless the scan is clean or an override is still active", () => {
    const now = new Date("2026-06-26T20:00:00Z");

    expect(decideUploadScanGate({ surface: "component-attachment", scanStatus: "clean" }, now))
      .toEqual({ allowed: true, reason: "scan_clean" });
    expect(decideUploadScanGate({ surface: "component-attachment", scanStatus: "pending" }, now))
      .toEqual({ allowed: false, reason: "scan_pending" });
    expect(decideUploadScanGate({ surface: "component-attachment", scanStatus: "failed_transient" }, now))
      .toEqual({ allowed: false, reason: "scan_pending" });
    expect(decideUploadScanGate({ surface: "component-attachment", scanStatus: "infected" }, now))
      .toEqual({ allowed: false, reason: "scan_infected" });
    expect(decideUploadScanGate({ surface: "component-attachment", scanStatus: "unsupported" }, now))
      .toEqual({ allowed: false, reason: "scan_unsupported" });
    expect(decideUploadScanGate({ surface: "component-attachment", scanStatus: "failed_permanent" }, now))
      .toEqual({ allowed: false, reason: "scan_failed" });
    expect(decideUploadScanGate({
      surface: "component-attachment",
      scanStatus: "override_approved",
      overrideExpiresAt: "2026-06-26T20:10:00Z",
    }, now)).toEqual({ allowed: true, reason: "override_active" });
    expect(decideUploadScanGate({
      surface: "component-attachment",
      scanStatus: "override_approved",
      overrideExpiresAt: "2026-06-26T19:59:00Z",
    }, now)).toEqual({ allowed: false, reason: "override_expired" });
  });

  it("maps scanner outcomes and permits only bounded state transitions", () => {
    expect(scanStatusFromProviderOutcome({ outcome: "clean", provider: "clamav" })).toBe("clean");
    expect(scanStatusFromProviderOutcome({ outcome: "infected", provider: "clamav", signature: "Eicar-Test-Signature" })).toBe("infected");
    expect(canTransitionUploadScanStatus("pending", "clean")).toBe(true);
    expect(canTransitionUploadScanStatus("pending", "failed_transient")).toBe(true);
    expect(canTransitionUploadScanStatus("failed_transient", "pending")).toBe(true);
    expect(canTransitionUploadScanStatus("failed_permanent", "override_approved")).toBe(true);
    expect(canTransitionUploadScanStatus("unsupported", "override_approved")).toBe(true);
    expect(canTransitionUploadScanStatus("infected", "override_approved")).toBe(false);
    expect(canTransitionUploadScanStatus("clean", "infected")).toBe(false);
    expect(canTransitionUploadScanStatus("not_required", "pending")).toBe(false);
  });

  it("classifies scanner queue backpressure before more storage or scan work is accepted", () => {
    expect(evaluateUploadScanBackpressure({
      queuedCount: 20,
      maxQueuedCount: 20,
      queuedBytes: 10,
      maxQueuedBytes: 100,
      maxQueueAgeMs: 60_000,
    })).toEqual({ allowed: false, reason: "queue_count", retryAfterSeconds: 60 });

    expect(evaluateUploadScanBackpressure({
      queuedCount: 1,
      maxQueuedCount: 20,
      queuedBytes: 100,
      maxQueuedBytes: 100,
      maxQueueAgeMs: 60_000,
    })).toEqual({ allowed: false, reason: "queued_bytes", retryAfterSeconds: 60 });

    expect(evaluateUploadScanBackpressure({
      queuedCount: 1,
      maxQueuedCount: 20,
      queuedBytes: 10,
      maxQueuedBytes: 100,
      oldestQueuedAt: "2026-06-26T19:58:00Z",
      now: new Date("2026-06-26T20:00:00Z"),
      maxQueueAgeMs: 60_000,
    })).toEqual({ allowed: false, reason: "queue_age", retryAfterSeconds: 60 });
  });

  it("runs the local policy scanner without exposing file paths", async () => {
    const scanner = createUploadPolicyScannerProvider();

    await expect(scanner.scan({
      assetId: "11111111-1111-4111-8111-111111111111",
      fileName: "clean.pdf",
      contentType: "application/pdf",
      sizeBytes: 8,
      bytes: new TextEncoder().encode("%PDF-1.7"),
    })).resolves.toEqual(expect.objectContaining({
      outcome: "clean",
      provider: "archestimator-policy-scanner",
    }));

    const infected = await scanner.scan({
      assetId: "22222222-2222-4222-8222-222222222222",
      fileName: "eicar.pdf",
      contentType: "application/pdf",
      sizeBytes: 68,
      bytes: new TextEncoder().encode("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"),
    });
    expect(infected).toEqual(expect.objectContaining({
      outcome: "infected",
      provider: "archestimator-policy-scanner",
      signature: "Eicar-Test-Signature",
    }));

    const unsupported = await scanner.scan({
      assetId: "33333333-3333-4333-8333-333333333333",
      fileName: "macro.xlsm",
      contentType: "application/vnd.ms-excel.sheet.macroenabled.12",
      sizeBytes: 4,
      bytes: new Uint8Array([1, 2, 3, 4]),
    });
    expect(unsupported).toEqual(expect.objectContaining({
      outcome: "unsupported",
      provider: "archestimator-policy-scanner",
      reason: "active_content_unsupported",
    }));
    expect(JSON.stringify([infected, unsupported])).not.toContain("/storage/");
  });

  it("adds service-role-only scanner result and audited override RPC contracts", () => {
    expect(scanLifecycleMigration).toContain("add column if not exists scan_provider text");
    expect(scanLifecycleMigration).toContain("add column if not exists scan_result jsonb not null default '{}'::jsonb");
    expect(scanLifecycleMigration).toContain("scan_override_actor_user_id uuid references auth.users");
    expect(scanLifecycleMigration).toContain("scan_override_reason text");
    expect(scanLifecycleMigration).toContain("scan_override_expires_at timestamptz");
    expect(scanLifecycleMigration).toContain("scan_override_checksum_sha256 text");
    expect(scanLifecycleMigration).toContain("upload_assets_scan_override_requires_audit_fields");
    expect(scanLifecycleMigration).toContain("create or replace function public.record_upload_scan_result");
    expect(scanLifecycleMigration).toContain("record_upload_scan_result requires service_role");
    expect(scanLifecycleMigration).toContain("asset_row.surface <> 'component-attachment'");
    expect(scanLifecycleMigration).toContain("grant execute on function public.record_upload_scan_result");
    expect(scanLifecycleMigration).toContain("to service_role");
    expect(scanLifecycleMigration).toContain("create or replace function public.approve_upload_scan_override");
    expect(scanLifecycleMigration).toContain("Only permanent scanner failures or unsupported files can be override-approved.");
    expect(scanLifecycleMigration).toContain("Scan override checksum does not match the uploaded asset.");
    expect(scanLifecycleMigration).toContain("'scan_override_approved'::public.upload_event_type");
    expect(scanLifecycleMigration).toContain("grant execute on function public.approve_upload_scan_override");
  });
});
