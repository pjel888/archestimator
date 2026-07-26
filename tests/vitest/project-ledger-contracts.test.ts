import { describe, expect, it } from "vitest";

import {
  PROJECT_ARTIFACT_STATUSES,
  PROJECT_ARTIFACT_TYPES,
  PROJECT_ARTIFACT_VERSION_SOURCE_KINDS,
} from "@/lib/project-artifacts/contracts";
import {
  PROJECT_CHANGE_REQUEST_STATUSES,
  PROJECT_CHANGE_REQUEST_TARGET_KINDS,
} from "@/lib/change-requests/contracts";
import {
  PROJECT_COMMITMENT_EVENT_SOURCE_TYPES,
  PROJECT_COMMITMENT_EXPOSURE_STATUSES,
} from "@/lib/project-ledger/contracts";
import {
  CLIENT_PORTAL_ISSUE_DRAFT_STATUSES,
  CLIENT_PORTAL_ISSUE_KINDS,
} from "@/lib/client-portal/issue-draft-contracts";

describe("project ledger contracts", () => {
  it("matches the migration-owned lifecycle enums", () => {
    expect(PROJECT_ARTIFACT_STATUSES).toEqual(["initializing", "active", "archived", "tombstoned"]);
    expect(PROJECT_ARTIFACT_TYPES).toContain("drawing");
    expect(PROJECT_ARTIFACT_VERSION_SOURCE_KINDS).toContain("recipient_upload");
    expect(PROJECT_CHANGE_REQUEST_STATUSES).toEqual([
      "initializing",
      "submitted",
      "acknowledged",
      "under_assessment",
      "proposal_issued",
      "resolved",
      "rejected",
      "withdrawn",
    ]);
    expect(PROJECT_CHANGE_REQUEST_TARGET_KINDS).toContain("artifact");
    expect(PROJECT_COMMITMENT_EVENT_SOURCE_TYPES).toEqual([
      "issue",
      "decision",
      "baseline",
      "change_request",
      "artifact",
      "legacy_publication",
    ]);
    expect(PROJECT_COMMITMENT_EXPOSURE_STATUSES).toEqual(["visible", "withdrawn", "redacted"]);
    expect(CLIENT_PORTAL_ISSUE_DRAFT_STATUSES).toEqual(["draft", "ready", "publishing", "published", "abandoned"]);
    expect(CLIENT_PORTAL_ISSUE_KINDS).toContain("change_order");
  });
});
