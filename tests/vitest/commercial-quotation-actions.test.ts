import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
  getCloudflareD1Database: vi.fn(),
  readProjectFromD1: vi.fn(),
  readEstimateInProjectFromD1: vi.fn(),
  readEstimateRowItemInEstimateFromD1: vi.fn(),
  canAccessEstimateInD1: vi.fn(),
  listAvailableEstimateQuotationOptions: vi.fn(),
  updateRowQuotationLink: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: mocks.requireCurrentUserContext,
}));
vi.mock("@/lib/cloudflare/d1", () => ({
  getCloudflareD1Database: mocks.getCloudflareD1Database,
}));
vi.mock("@/lib/authz/d1-access", () => ({
  readProjectFromD1: mocks.readProjectFromD1,
  readEstimateInProjectFromD1: mocks.readEstimateInProjectFromD1,
  readEstimateRowItemInEstimateFromD1: mocks.readEstimateRowItemInEstimateFromD1,
  canAccessEstimateInD1: mocks.canAccessEstimateInD1,
}));
vi.mock("@/lib/commercial-terms/repository", () => ({
  listAvailableEstimateQuotationOptions: mocks.listAvailableEstimateQuotationOptions,
  updateRowCommercialTerms: vi.fn(),
  updateRowQuotationLink: mocks.updateRowQuotationLink,
}));

import {
  linkEstimateRowQuotationAttachment,
  listEstimateQuotationOptions,
  unlinkEstimateRowQuotationAttachment,
} from "@/lib/commercial-terms/actions";

const scope = {
  projectId: "project-1",
  estimateId: "estimate-1",
  rowId: "row-1",
  mutationId: "mutation-1",
  expectedRowRevision: 7,
  expectedTermsRevision: 4,
};

describe("commercial quotation attachment actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUserContext.mockResolvedValue({ userId: "user-1" });
    mocks.getCloudflareD1Database.mockResolvedValue({ database: true });
    mocks.readProjectFromD1.mockResolvedValue({ id: "project-1", workspace_id: "workspace-1" });
    mocks.readEstimateInProjectFromD1.mockResolvedValue({ id: "estimate-1" });
    mocks.readEstimateRowItemInEstimateFromD1.mockResolvedValue({ id: "row-1" });
    mocks.canAccessEstimateInD1.mockResolvedValue(true);
  });

  it("lists only the repository's client-safe quotation projection for an accessible estimate", async () => {
    mocks.listAvailableEstimateQuotationOptions.mockResolvedValue({
      ok: true,
      value: [{ versionId: "version-1", title: "Supplier quote", revisionLabel: "R1", fileName: "quote.pdf" }],
    });

    await expect(listEstimateQuotationOptions({ projectId: "project-1", estimateId: "estimate-1" }))
      .resolves.toEqual([{ versionId: "version-1", title: "Supplier quote", revisionLabel: "R1", fileName: "quote.pdf" }]);
    expect(mocks.canAccessEstimateInD1).toHaveBeenCalledWith(
      { database: true },
      "estimate-1",
      { userId: "user-1" },
    );
  });

  it("does not list project quotations for a user without estimate access", async () => {
    mocks.canAccessEstimateInD1.mockResolvedValue(false);

    await expect(listEstimateQuotationOptions({ projectId: "project-1", estimateId: "estimate-1" }))
      .rejects.toThrow("could not be found");
    expect(mocks.listAvailableEstimateQuotationOptions).not.toHaveBeenCalled();
  });

  it("links an existing version through scoped authorization and CAS without returning its id", async () => {
    mocks.updateRowQuotationLink.mockResolvedValue({ ok: true, value: { termsRevision: 5, rowRevision: 8, eventId: "event-1" } });

    const result = await linkEstimateRowQuotationAttachment({
      ...scope,
      quotationArtifactVersionId: " version-private-1 ",
    });

    expect(mocks.updateRowQuotationLink).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: "workspace-1",
      actor: { userId: "user-1" },
      intentId: "mutation-1",
      expectedRowRevision: 7,
      expectedTermsRevision: 4,
      quotationArtifactVersionId: "version-private-1",
    }));
    expect(result).toEqual({
      termsRevision: 5,
      rowRevision: 8,
      quotationAttachment: { attachmentState: "available", hasAttachment: true },
    });
    expect(JSON.stringify(result)).not.toContain("version-private-1");
  });

  it("unlinks with the same CAS revision and returns no-attachment truth", async () => {
    mocks.updateRowQuotationLink.mockResolvedValue({ ok: true, value: { termsRevision: 5, rowRevision: 8, eventId: "event-1" } });

    await expect(unlinkEstimateRowQuotationAttachment(scope)).resolves.toEqual({
      termsRevision: 5,
      rowRevision: 8,
      quotationAttachment: { attachmentState: "none", hasAttachment: false },
    });
    expect(mocks.updateRowQuotationLink).toHaveBeenCalledWith(expect.objectContaining({
      expectedTermsRevision: 4,
      quotationArtifactVersionId: null,
    }));
  });

  it("fails closed on authorization, unavailable artifacts, and revision conflicts", async () => {
    mocks.updateRowQuotationLink.mockResolvedValueOnce({ ok: false, code: "not_authorized" });
    await expect(linkEstimateRowQuotationAttachment({ ...scope, quotationArtifactVersionId: "version-1" }))
      .rejects.toThrow("permission");

    mocks.updateRowQuotationLink.mockResolvedValueOnce({ ok: false, code: "quotation_not_linkable" });
    await expect(linkEstimateRowQuotationAttachment({ ...scope, quotationArtifactVersionId: "version-1" }))
      .rejects.toThrow("no longer available");

    mocks.updateRowQuotationLink.mockResolvedValueOnce({ ok: false, code: "commercial_terms_conflict" });
    await expect(unlinkEstimateRowQuotationAttachment(scope)).rejects.toThrow("changed elsewhere");
  });
});
