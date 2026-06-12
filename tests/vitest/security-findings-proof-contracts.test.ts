import { describe, expect, it } from "vitest";

import { listDirectory, read } from "./security-findings-test-helpers";

describe("Codex proof artifact sanitization contracts", () => {
  it("keeps raw proposal workbook artifacts out of the manual proof packet", () => {
    const proofDir = ".ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof";
    const proofFilenames = listDirectory(proofDir);
    const sanitizedSummary = JSON.parse(read(`${proofDir}/proposal-workbook-exceljs-summary-sanitized-2026-06-02.json`));
    const packetReadme = read(`${proofDir}/README.md`);
    const withdrawalArtifact = read(`${proofDir}/confidential-proposal-artifact-withdrawal-2026-06-04.json`);

    expect(proofFilenames.some((filename) => filename.endsWith(".xlsx"))).toBe(false);
    expect(packetReadme).not.toMatch(/[a-z0-9-]+-proposal-\d{4}-\d{2}-\d{2}\.xlsx/i);
    expect(withdrawalArtifact).not.toMatch(/[a-z0-9-]+-proposal-\d{4}-\d{2}-\d{2}\.xlsx/i);
    expect(withdrawalArtifact).toContain("CONFIDENTIAL_PROPOSAL_WORKBOOK_REDACTED.xlsx");
    expect(sanitizedSummary.rawWorkbookRetained).toBe(false);
    expect(sanitizedSummary.rawPreviewRetained).toBe(false);
    expect(JSON.stringify(sanitizedSummary)).not.toContain("workbookPath");
    expect(JSON.stringify(sanitizedSummary)).not.toContain("55230");
  });

  it("keeps live closed-beta proof sanitized to role placeholders", () => {
    const proofPath =
      ".ai/09_archive/store/2026-06-02-mvp-closed-beta-manual-proof/live-closed-beta-refresh-2026-06-04T1006Z.json";
    const proof = JSON.parse(read(proofPath));
    const proofText = JSON.stringify(proof);
    const currentState = read(".ai/10_state/current-state.md");
    const knownIssues = read(".ai/10_state/known-issues.md");
    const currentStart = currentState.indexOf("**Live Closed-Beta Refresh (2026-06-04 10:06Z):**");
    const currentEnd = currentState.indexOf("**Codex Security Cheap-Path Closure Batch", currentStart);
    const knownStart = knownIssues.indexOf("- Fresh 2026-06-04T10:06Z proof");
    const knownEnd = knownIssues.indexOf("- Latest artifact:", knownStart);
    const currentLow07Summary = currentState.slice(currentStart, currentEnd);
    const knownLow07Summary = knownIssues.slice(knownStart, knownEnd);
    const low07Surface = [proofText, currentLow07Summary, knownLow07Summary].join("\n");
    const privateDetailPatterns = [
      { label: "email-like value", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
      { label: "raw URL", pattern: /https?:\/\//i },
      { label: "Codex finding route", pattern: /codex\/cloud\/security\/findings/i },
      { label: "Supabase project reference shape", pattern: /\b[a-z]{20}\b/ },
      { label: "private support DNS host shape", pattern: /\b[a-z0-9-]+\.contact\.[a-z0-9.-]+\b/i },
      { label: "queue-state prose", pattern: /\bqueue\s+empty\b/i },
      { label: "open-queue prose", pattern: /\bhas\s+no\s+open\b/i },
    ];

    expect(proof.repository).toBe("REPOSITORY_PLACEHOLDER");
    expect(proof.raw_operational_proof).toBe("not committed");
    expect(proof.sanitized_provider_readiness.supabase.project).toBe("SUPABASE_PROJECT_PLACEHOLDER");
    expect(proof.sanitized_provider_readiness.supabase.allowlist_readback).toBe(
      "OWNER_ROLE_ACTIVE_PLACEHOLDER",
    );
    expect(currentStart).toBeGreaterThanOrEqual(0);
    expect(currentEnd).toBeGreaterThan(currentStart);
    expect(knownStart).toBeGreaterThanOrEqual(0);
    expect(knownEnd).toBeGreaterThan(knownStart);
    expect(currentLow07Summary).toContain("without recording raw private beta user");
    expect(knownLow07Summary).toContain("raw private beta user, allowlist, project");
    for (const { label, pattern } of privateDetailPatterns) {
      expect(low07Surface, label).not.toMatch(pattern);
    }
  });
});
