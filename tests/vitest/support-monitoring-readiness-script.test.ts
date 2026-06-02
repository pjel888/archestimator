import { describe, expect, it } from "vitest";

import {
  checkSupportMonitoringReadiness,
  parseProofFlag,
  sanitizeOwnerLabel,
} from "@/../scripts/check-support-monitoring-readiness";

describe("support monitoring readiness checker", () => {
  it("parses explicit proof flags only", () => {
    expect(parseProofFlag("true")).toBe(true);
    expect(parseProofFlag("1")).toBe(true);
    expect(parseProofFlag("yes")).toBe(true);
    expect(parseProofFlag("passed")).toBe(true);
    expect(parseProofFlag("false")).toBe(false);
    expect(parseProofFlag("")).toBe(false);
    expect(parseProofFlag(undefined)).toBe(false);
  });

  it("keeps owner labels short and sanitized", () => {
    expect(sanitizeOwnerLabel(" Philip / Launch Ops ")).toBe("Philip / Launch Ops");
    expect(sanitizeOwnerLabel("bad<script>")).toBeNull();
    expect(sanitizeOwnerLabel("x".repeat(81))).toBeNull();
  });

  it("fails closed when monitoring proof is not provided", () => {
    const result = checkSupportMonitoringReadiness({});

    expect(result.supportMonitoringReady).toBe(false);
    expect(result.missing).toEqual([
      "support inbox monitoring confirmed",
      "feedback table review confirmed",
      "uptime alert delivery confirmed",
      "error alert delivery confirmed",
      "incident escalation path confirmed",
      "support owner label",
      "alert owner label",
      "first 24-hour review owner label",
      "first 72-hour review owner label",
    ]);
    expect(result.note).toContain("does not verify inbox access");
  });

  it("passes only when all proof flags and owner labels are present", () => {
    const result = checkSupportMonitoringReadiness({
      SUPPORT_MONITORING_INBOX_CONFIRMED: "true",
      SUPPORT_MONITORING_FEEDBACK_REVIEW_CONFIRMED: "true",
      SUPPORT_MONITORING_UPTIME_ALERT_CONFIRMED: "true",
      SUPPORT_MONITORING_ERROR_ALERT_CONFIRMED: "true",
      SUPPORT_MONITORING_INCIDENT_ESCALATION_CONFIRMED: "true",
      SUPPORT_MONITORING_SUPPORT_OWNER: "Philip / Support",
      SUPPORT_MONITORING_ALERT_OWNER: "Philip / Alerts",
      SUPPORT_MONITORING_FIRST_24H_OWNER: "Philip / Day 1",
      SUPPORT_MONITORING_FIRST_72H_OWNER: "Philip / Day 3",
    });

    expect(result.supportMonitoringReady).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.supportOwner).toBe("Philip / Support");
    expect(result.alertOwner).toBe("Philip / Alerts");
    expect(result.first24HourReviewOwner).toBe("Philip / Day 1");
    expect(result.first72HourReviewOwner).toBe("Philip / Day 3");
  });
});
