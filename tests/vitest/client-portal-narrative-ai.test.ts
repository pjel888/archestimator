import { describe, expect, it } from "vitest";

import {
  buildClientPortalNarrativeFacts,
  buildClientPortalNarrativeInput,
  buildClientPortalNarrativeInputFingerprint,
  createDeterministicClientPortalNarrativeSelection,
  parseClientPortalNarrativeSelection,
  renderClientPortalNarrative,
} from "@/lib/client-portal/narrative-ai";

const draft = {
  assumptions: ["Existing services remain usable."],
  artifacts: [{ artifactVersionId: "artifact-version-secret", sortOrder: 0 }],
  basedOnBaselineId: "baseline-secret",
  comparisonIssueId: "issue-secret",
  draftRevision: 4,
  estimates: [{ estimateId: "estimate-secret", included: true, sortOrder: 0 }],
  exclusions: ["Permit fees"],
  issueKind: "change_order",
  requestedDecision: "formal",
  requests: [{ requestVersionId: "request-version-secret", sortOrder: 0 }],
  unresolvedItems: ["Confirm finish selection"],
  versionLabel: "CO-04",
};

const sources = {
  artifacts: [{ artifactVersionId: "artifact-version-secret", revisionLabel: "B", title: "Kitchen drawing", versionNumber: 2 }],
  baselines: [{ id: "baseline-secret", issueLabel: "Accepted issue 3" }],
  estimates: [{ id: "estimate-secret", name: "Main estimate", sheetCode: "A-100" }],
  issues: [{ id: "issue-secret", issueNumber: 3, versionLabel: "Issue 3" }],
  requests: [{ requestCode: "CR-0001", requestVersionId: "request-version-secret", title: "Move sink" }],
};

describe("bounded client-portal narrative contracts", () => {
  it("projects a deterministic label-only DTO without internal identifiers or financial values", () => {
    const changeSet = buildClientPortalNarrativeInput({ draft, sources });
    const serialized = JSON.stringify(changeSet);

    expect(changeSet.included).toEqual({
      estimates: ["A-100 · Main estimate"],
      artifacts: ["Kitchen drawing · v2 · B"],
      requests: ["CR-0001 · Move sink"],
    });
    expect(serialized).not.toContain("estimate-secret");
    expect(serialized).not.toContain("artifact-version-secret");
    expect(serialized).not.toContain("request-version-secret");
    expect(serialized).not.toContain("baseline-secret");
    expect(serialized).not.toMatch(/total|price|costMinorUnits|unitCost/);
  });

  it("accepts only exact source-backed fact IDs and renders no provider-authored prose", () => {
    const changeSet = buildClientPortalNarrativeInput({ draft, sources });
    const facts = buildClientPortalNarrativeFacts(changeSet);
    const selection = parseClientPortalNarrativeSelection({
      summary: ["summary-1", "summary-5"],
      included: ["included-3"],
      excluded: ["excluded-1"],
      unresolved: ["unresolved-1"],
      warnings: ["warnings-1"],
    }, facts);
    const narrative = renderClientPortalNarrative(facts, selection);

    expect(narrative).toContain("CO-04 is a change order package.");
    expect(narrative).toContain("Change request: CR-0001 · Move sink");
    expect(narrative).not.toContain("summary-1");
    expect(() => parseClientPortalNarrativeSelection({
      summary: ["summary-1"],
      included: ["invented-promise"],
      excluded: [],
      unresolved: [],
      warnings: [],
    }, facts)).toThrow("unsupported fact ID");
    expect(() => parseClientPortalNarrativeSelection({
      summary: ["summary-1"],
      included: [],
      excluded: [],
      unresolved: [],
      warnings: [],
      publish: ["now"],
    }, facts)).toThrow("must contain only");
  });

  it("falls back deterministically and invalidates the fingerprint when source facts change", () => {
    const changeSet = buildClientPortalNarrativeInput({ draft, sources });
    const facts = buildClientPortalNarrativeFacts(changeSet);
    const selection = createDeterministicClientPortalNarrativeSelection(facts);
    const narrative = renderClientPortalNarrative(facts, selection);
    const fingerprint = buildClientPortalNarrativeInputFingerprint({ draftRevision: draft.draftRevision, changeSet });
    const changed = buildClientPortalNarrativeInput({ draft: { ...draft, unresolvedItems: ["Confirm appliance model"] }, sources });

    expect(narrative).toContain("Included:");
    expect(narrative).toContain("Unresolved: Confirm finish selection.");
    expect(buildClientPortalNarrativeInputFingerprint({ draftRevision: draft.draftRevision, changeSet: changed })).not.toBe(fingerprint);
    expect(buildClientPortalNarrativeInputFingerprint({ draftRevision: draft.draftRevision + 1, changeSet })).toBe(fingerprint);
  });
});
