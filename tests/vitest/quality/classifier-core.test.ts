import { describe, expect, it } from "vitest";
import {
  classifyFiles,
  type RiskMap,
} from "../../../scripts/quality/classifier-core";

const riskMap: RiskMap = {
  schema_version: 1,
  prose_extensions: [".md"],
  executable_extensions: [".ts"],
  release_flags: ["quality/release-request.json"],
  rules: [
    {
      id: "QUALITY",
      profile: "Q2_CRITICAL_CHANGE_GATE",
      patterns: ["quality/**"],
      capabilities: ["CAP-Z", "CAP-A"],
      reason: "Quality system",
    },
  ],
};

describe("classifier core", () => {
  it("selects Q0 through Q3 without changing deterministic output ordering", () => {
    const q0 = classifyFiles(["docs/readme.md"], riskMap).classification;
    const q1 = classifyFiles(["src/value.ts"], riskMap).classification;
    const q2 = classifyFiles(
      ["quality/z.ts", "quality/a.ts", "quality/z.ts"],
      riskMap,
    ).classification;
    const q3 = classifyFiles(["quality/release-request.json"], riskMap).classification;

    expect(q0.profile).toBe("Q0_CONTRACT_ONLY");
    expect(q1.profile).toBe("Q1_CHANGE_GATE");
    expect(q2).toMatchObject({
      profile: "Q2_CRITICAL_CHANGE_GATE",
      files: ["quality/a.ts", "quality/z.ts"],
      affected_capabilities: ["CAP-A", "CAP-Z"],
    });
    expect(q2.reasons).toEqual([
      "QUALITY: quality/a.ts: Quality system",
      "QUALITY: quality/z.ts: Quality system",
    ]);
    expect(q3.profile).toBe("Q3_RELEASE_GATE");
  });

  it("fails closed for empty, unknown, and classifier-error input", () => {
    for (const result of [
      classifyFiles([], riskMap),
      classifyFiles(["unknown/no-extension"], riskMap),
      classifyFiles(["docs/readme.md"], riskMap, { classifierError: "broken input" }),
    ]) {
      expect(result.classification).toMatchObject({
        profile: "Q2_CRITICAL_CHANGE_GATE",
        fail_closed: true,
      });
    }
  });

  it("rejects downgrades and permits requested-profile escalation", () => {
    const downgrade = classifyFiles(["quality/gate.ts"], riskMap, {
      requestedProfile: "Q1_CHANGE_GATE",
    });
    const escalation = classifyFiles(["docs/readme.md"], riskMap, {
      requestedProfile: "Q2_CRITICAL_CHANGE_GATE",
    });

    expect(downgrade.classification.rejected_downgrade).toBe("Q1_CHANGE_GATE");
    expect(downgrade.findings.map((finding) => finding.code)).toEqual([
      "PROFILE_DOWNGRADE_REJECTED",
    ]);
    expect(escalation.classification.profile).toBe("Q2_CRITICAL_CHANGE_GATE");
    expect(escalation.classification.reasons.at(-1)).toBe(
      "USER_ESCALATION: explicitly escalated to Q2_CRITICAL_CHANGE_GATE",
    );
  });
});
