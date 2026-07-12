import { describe, expect, it } from "vitest";

import {
  createClientPortalRolePreview,
  evaluateClientPortalPolicy,
  filterClientPortalSections,
  type ClientPortalPolicyPortal,
  type ClientPortalRecipientActor,
} from "@/lib/client-portal/policy";

const portal: ClientPortalPolicyPortal = {
  id: "portal_1",
  workspaceId: "workspace_1",
  projectId: "project_1",
  status: "live",
  allowAnonymousView: false,
};

function recipient(overrides: ClientPortalRecipientActor["overrides"] = []): ClientPortalRecipientActor {
  return {
    kind: "recipient",
    recipientId: "recipient_1",
    portalId: portal.id,
    role: "approver",
    status: "active",
    verificationState: "verified",
    organization: "Client Co",
    isRequiredApprover: true,
    overrides,
  };
}

describe("client portal policy", () => {
  it("denies anonymous writes even when anonymous viewing is enabled", () => {
    const decision = evaluateClientPortalPolicy({
      actor: { kind: "anonymous" },
      action: "thread:create",
      portal: { ...portal, allowAnonymousView: true },
    });

    expect(decision).toMatchObject({ allowed: false, hideResource: true, reasonCode: "anonymous_access_disabled" });
  });

  it("keeps recipient membership and verification fail-closed", () => {
    const wrongPortal = evaluateClientPortalPolicy({
      actor: { ...recipient(), portalId: "portal_other" },
      action: "portal:view",
      portal,
    });
    const unverifiedWrite = evaluateClientPortalPolicy({
      actor: { ...recipient(), verificationState: "unverified" },
      action: "thread:create",
      portal,
    });

    expect(wrongPortal).toMatchObject({ allowed: false, hideResource: true, reasonCode: "portal_relationship_required" });
    expect(unverifiedWrite).toMatchObject({ allowed: false, reasonCode: "recipient_unverified" });
  });

  it("applies deny overrides before role and allow overrides", () => {
    const decision = evaluateClientPortalPolicy({
      actor: recipient([{ capability: "decision:submit_formal", effect: "deny" }]),
      action: "decision:submit_formal",
      portal,
      issue: { id: "issue_1", status: "under_review", isCurrent: true },
    });

    expect(decision).toMatchObject({ allowed: false, reasonCode: "capability_explicitly_denied" });
  });

  it("limits formal decisions to active designated approvers on the current issue", () => {
    const decision = evaluateClientPortalPolicy({
      actor: recipient(),
      action: "decision:submit_formal",
      portal,
      issue: { id: "issue_1", status: "superseded", isCurrent: false },
    });

    expect(decision).toMatchObject({ allowed: false, reasonCode: "decision_issue_not_current" });
  });

  it("filters hidden sections before they can be serialized", () => {
    const sections = filterClientPortalSections(recipient(), portal, [
      { id: "section_public", enabled: true, commentable: true, downloadable: false },
      { id: "section_private", enabled: true, commentable: true, downloadable: false, allowedRecipientIds: ["recipient_2"] },
      { id: "section_disabled", enabled: false, commentable: true, downloadable: false },
    ]);

    expect(sections.map((section) => section.id)).toEqual(["section_public"]);
  });

  it("keeps controlled cost fields hidden until the section explicitly enables them", () => {
    const defaultFieldDecision = evaluateClientPortalPolicy({
      actor: recipient(),
      action: "field:view",
      portal,
      section: { id: "section_1", enabled: true, commentable: true, downloadable: false },
      field: "unit_cost",
    });
    const enabledFieldDecision = evaluateClientPortalPolicy({
      actor: recipient(),
      action: "field:view",
      portal,
      section: { id: "section_1", enabled: true, commentable: true, downloadable: false, visibleFields: ["unit_cost"] },
      field: "unit_cost",
    });

    expect(defaultFieldDecision).toMatchObject({ allowed: false, reasonCode: "field_hidden" });
    expect(enabledFieldDecision).toMatchObject({ allowed: true });
  });

  it("uses the exact same evaluator for role preview", () => {
    const preview = createClientPortalRolePreview(portal.id, "viewer");
    const decision = preview.evaluate({ action: "thread:create", portal });

    expect(decision).toMatchObject({ allowed: false, reasonCode: "capability_not_granted" });
  });
});
