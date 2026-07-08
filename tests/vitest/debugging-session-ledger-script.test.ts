import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  appendDebuggingSessionLedgerRecord,
  buildDebuggingRecurrenceKey,
  buildDebuggingSessionLedgerRecord,
  buildDebuggingSessionLedgerSnapshot,
} from "@/../scripts/record-debugging-session";

describe("debugging session ledger", () => {
  it("builds redacted records with stable recurrence keys", () => {
    const record = buildDebuggingSessionLedgerRecord({
      id: "debug-1",
      generatedAt: "2026-07-08T00:00:00.000Z",
      environment: "local",
      status: "fixed",
      severity: "sev3",
      source: "local-log",
      symptom: "Project page failed with missing menu content component",
      route: "/workshop/projects",
      event: "client_error",
      errorClass: "ReferenceError",
      errorCode: "CONTEXT_MENU_CONTENT",
      logRecordId: "rec_123",
      rootCause: "Dropdown primitive import was not present after the menu refactor.",
      fixSummary: "Added the existing dropdown-menu primitive import and covered the project page.",
      changedFiles: ["src/components/workshop/ProjectGroupFlag.tsx"],
      validation: ["bun run type-check", "bun run test:dom tests/vitest/projects-page-group-mode.test.tsx"],
    });

    expect(record.recurrenceKey).toBe(buildDebuggingRecurrenceKey({
      environment: "local",
      route: "/workshop/projects",
      event: "client_error",
      errorClass: "ReferenceError",
      errorCode: "CONTEXT_MENU_CONTENT",
    }));
    expect(JSON.stringify(record)).not.toMatch(/Bearer |token=|client@example\.com/i);
  });

  it("rejects raw sensitive material before writing ledger records", () => {
    expect(() => buildDebuggingSessionLedgerRecord({
      environment: "production",
      status: "observed",
      severity: "sev2",
      source: "workers-logs",
      symptom: "Request failed for client@example.com",
      route: "/workshop/projects",
    })).toThrow(/sensitive/i);

    expect(() => buildDebuggingSessionLedgerRecord({
      environment: "production",
      status: "observed",
      severity: "sev2",
      source: "workers-logs",
      symptom: "Request failed",
      route: "/workshop/projects?token=secret",
    })).toThrow(/query strings/i);
  });

  it("allows Next.js dynamic segment file paths without allowing query strings", () => {
    const record = buildDebuggingSessionLedgerRecord({
      environment: "local",
      status: "fixed",
      severity: "sev3",
      source: "manual",
      symptom: "Share route deferred telemetry bypassed structured logging",
      route: "/share/[token]",
      changedFiles: ["src/app/share/[token]/page.tsx"],
      validation: ["bun run validate:error-handling"],
    });

    expect(record.route).toBe("/share/[token]");
    expect(record.changedFiles).toEqual(["src/app/share/[token]/page.tsx"]);
    expect(() => buildDebuggingSessionLedgerRecord({
      environment: "local",
      status: "fixed",
      severity: "sev3",
      source: "manual",
      symptom: "unsafe route",
      route: "/share/[token]?token=secret",
    })).toThrow(/query strings/i);
  });

  it("appends and checks sanitized ledger snapshots", () => {
    const dir = mkdtempSync(join(tmpdir(), "debugging-ledger-"));
    const ledger = join(dir, "ledger.ndjson");
    try {
      const record = buildDebuggingSessionLedgerRecord({
        id: "debug-2",
        generatedAt: "2026-07-08T00:00:00.000Z",
        environment: "local",
        status: "mitigated",
        severity: "sev4",
        source: "client-report",
        symptom: "Toast error repeated during optimistic update",
        route: "/workshop/projects",
        event: "client_error",
        errorClass: "Error",
        errorCode: "OPTIMISTIC_UPDATE",
        fixSummary: "Kept the local draft visible during offline mutation failure.",
      });
      appendDebuggingSessionLedgerRecord(record, ledger);

      const saved = readFileSync(ledger, "utf8");
      expect(saved.trim()).toBe(JSON.stringify(record));

      const snapshot = buildDebuggingSessionLedgerSnapshot({
        ledgerPath: ledger,
        latestError: {
          environment: "local",
          route: "/workshop/projects",
          event: "client_error",
          errorClass: "Error",
          errorCode: "OPTIMISTIC_UPDATE",
        },
      });
      expect(snapshot).toMatchObject({
        exists: true,
        parsedRecords: 1,
        malformedLines: 0,
        unsafeRecords: 0,
        latestErrorRecurrenceKey: record.recurrenceKey,
        matchingLatestErrorCount: 1,
      });
      expect(snapshot.recentMatches[0]).toMatchObject({
        id: "debug-2",
        status: "mitigated",
        fixSummary: "Kept the local draft visible during offline mutation failure.",
      });
      expect(snapshot.latestErrorMatchSummary).toMatchObject({
        hasMatches: true,
        total: 1,
        statusCounts: {
          mitigated: 1,
        },
        latest: {
          id: "debug-2",
          status: "mitigated",
          fixSummary: "Kept the local draft visible during offline mutation failure.",
        },
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
