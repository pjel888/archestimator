import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const allowlistStoreMocks = vi.hoisted(() => ({
  createClosedBetaAllowlistEntriesInD1: vi.fn(),
  createClosedBetaAllowlistEntryInD1: vi.fn(),
  updateClosedBetaAllowlistEntryInD1: vi.fn(),
}));

const feedbackStoreMocks = vi.hoisted(() => ({
  updateBetaFeedbackReviewStatusInD1: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: authMocks.requireCurrentUserContext,
}));

vi.mock("@/lib/auth/closed-beta-d1-store", () => ({
  createClosedBetaAllowlistEntriesInD1: allowlistStoreMocks.createClosedBetaAllowlistEntriesInD1,
  createClosedBetaAllowlistEntryInD1: allowlistStoreMocks.createClosedBetaAllowlistEntryInD1,
  updateClosedBetaAllowlistEntryInD1: allowlistStoreMocks.updateClosedBetaAllowlistEntryInD1,
}));

vi.mock("@/lib/workshop/beta-feedback-d1-store", () => ({
  updateBetaFeedbackReviewStatusInD1: feedbackStoreMocks.updateBetaFeedbackReviewStatusInD1,
}));

vi.mock("next/cache", () => ({
  revalidatePath: cacheMocks.revalidatePath,
}));

function currentUser(role: string | null) {
  return {
    email: "actor@example.test",
    role,
    userId: "user-1",
  };
}

function createAllowlistForm() {
  const formData = new FormData();
  formData.set("email", "Beta+Pilot@Example.COM");
  formData.set("notes", "Pilot reviewer");
  formData.set("status", "invited");
  return formData;
}

function updateAllowlistForm() {
  const formData = new FormData();
  formData.set("id", "allowlist-row-1");
  formData.set("notes", "Paused");
  formData.set("status", "revoked");
  return formData;
}

function feedbackReviewForm() {
  const formData = new FormData();
  formData.set("id", "feedback-row-1");
  formData.set("status", "reviewing");
  return formData;
}

function readSourceTree(path: string): string[] {
  return readdirSync(path).flatMap((entry) => {
    const childPath = join(path, entry);
    if (statSync(childPath).isDirectory()) return readSourceTree(childPath);
    return /\.[cm]?[jt]sx?$/.test(entry) ? [readFileSync(childPath, "utf8")] : [];
  });
}

describe("beta admin action boundaries", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    allowlistStoreMocks.createClosedBetaAllowlistEntriesInD1.mockResolvedValue({ created: 1, createdEmails: ["beta+pilot@example.com"] });
    allowlistStoreMocks.createClosedBetaAllowlistEntryInD1.mockResolvedValue(undefined);
    allowlistStoreMocks.updateClosedBetaAllowlistEntryInD1.mockResolvedValue(undefined);
    feedbackStoreMocks.updateBetaFeedbackReviewStatusInD1.mockResolvedValue(undefined);
  });

  it.each(["member", "owner", "client", null])(
    "denies closed-beta allowlist mutations for non-admin app role %s without writes",
    async (role) => {
      authMocks.requireCurrentUserContext.mockResolvedValue(currentUser(role));
      const {
        createClosedBetaAllowlistEntry,
        updateClosedBetaAllowlistEntry,
      } = await import("@/lib/auth/beta-allowlist-admin-actions");

      await expect(createClosedBetaAllowlistEntry(createAllowlistForm())).resolves.toEqual({
        ok: false,
        code: "forbidden",
        message: "Only platform admins can manage the allowlist.",
      });
      await expect(updateClosedBetaAllowlistEntry(updateAllowlistForm())).resolves.toEqual({
        ok: false,
        code: "forbidden",
        message: "Only platform admins can manage the allowlist.",
      });

      expect(allowlistStoreMocks.createClosedBetaAllowlistEntryInD1).not.toHaveBeenCalled();
      expect(allowlistStoreMocks.updateClosedBetaAllowlistEntryInD1).not.toHaveBeenCalled();
      expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("allows platform admins to create and update closed-beta allowlist rows", async () => {
    const {
      createClosedBetaAllowlistEntry,
      updateClosedBetaAllowlistEntry,
    } = await import("@/lib/auth/beta-allowlist-admin-actions");

    authMocks.requireCurrentUserContext.mockResolvedValue(currentUser("admin"));
    await expect(createClosedBetaAllowlistEntry(createAllowlistForm())).resolves.toEqual({
      ok: true,
      code: "created",
      message: "Email added to the allowlist and invite email queued.",
    });
    expect(allowlistStoreMocks.createClosedBetaAllowlistEntryInD1).toHaveBeenCalledWith({
      actorUserId: "user-1",
      email: "beta+pilot@example.com",
      notes: "Pilot reviewer",
      status: "invited",
    });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/admin/allowlist");

    vi.clearAllMocks();
    authMocks.requireCurrentUserContext.mockResolvedValue(currentUser("ceo"));
    await expect(updateClosedBetaAllowlistEntry(updateAllowlistForm())).resolves.toEqual({
      ok: true,
      code: "updated",
      message: "Allowlist entry updated.",
    });
    expect(allowlistStoreMocks.updateClosedBetaAllowlistEntryInD1).toHaveBeenCalledWith({
      actorUserId: "user-1",
      id: "allowlist-row-1",
      notes: "Paused",
      status: "revoked",
    });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/admin/allowlist");
  });

  it.each(["member", "owner", "client", null])(
    "denies beta feedback review mutations for non-admin app role %s without writes",
    async (role) => {
      authMocks.requireCurrentUserContext.mockResolvedValue(currentUser(role));
      const { updateBetaFeedbackReviewStatus } = await import("@/lib/workshop/beta-feedback-review-actions");

      await expect(updateBetaFeedbackReviewStatus(feedbackReviewForm())).resolves.toEqual({
        ok: false,
        code: "forbidden",
        message: "Only platform admins can review feedback.",
      });

      expect(feedbackStoreMocks.updateBetaFeedbackReviewStatusInD1).not.toHaveBeenCalled();
      expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("allows platform admins to update beta feedback review status", async () => {
    authMocks.requireCurrentUserContext.mockResolvedValue(currentUser("admin"));
    const { updateBetaFeedbackReviewStatus } = await import("@/lib/workshop/beta-feedback-review-actions");

    await expect(updateBetaFeedbackReviewStatus(feedbackReviewForm())).resolves.toEqual({
      ok: true,
      code: "updated",
      message: "Feedback status updated.",
    });

    expect(feedbackStoreMocks.updateBetaFeedbackReviewStatusInD1).toHaveBeenCalledWith({
      actorUserId: "user-1",
      id: "feedback-row-1",
      status: "reviewing",
    });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/admin/feedback");
  });

  it("returns validation and persistence failures without encoding them in the URL", async () => {
    authMocks.requireCurrentUserContext.mockResolvedValue(currentUser("admin"));
    const {
      createClosedBetaAllowlistEntry,
      createClosedBetaAllowlistEntries,
    } = await import("@/lib/auth/beta-allowlist-admin-actions");
    const { updateBetaFeedbackReviewStatus } = await import("@/lib/workshop/beta-feedback-review-actions");

    const invalidAllowlistForm = createAllowlistForm();
    invalidAllowlistForm.set("email", "not-an-email");
    await expect(createClosedBetaAllowlistEntry(invalidAllowlistForm)).resolves.toEqual({
      ok: false,
      code: "invalid",
      message: "Enter a valid email address.",
    });

    const duplicateAllowlistForm = new FormData();
    duplicateAllowlistForm.set("emails", "beta@example.test");
    duplicateAllowlistForm.set("status", "invited");
    allowlistStoreMocks.createClosedBetaAllowlistEntriesInD1.mockResolvedValue({ created: 0, createdEmails: [] });
    await expect(createClosedBetaAllowlistEntries(duplicateAllowlistForm)).resolves.toEqual({
      ok: false,
      code: "duplicate",
      message: "Those emails are already on the allowlist.",
    });

    feedbackStoreMocks.updateBetaFeedbackReviewStatusInD1.mockRejectedValueOnce(new Error("D1 unavailable"));
    await expect(updateBetaFeedbackReviewStatus(feedbackReviewForm())).resolves.toEqual({
      ok: false,
      code: "save",
      message: "Feedback status could not be saved.",
    });
  });

  it("reports a completed write when cache invalidation fails", async () => {
    authMocks.requireCurrentUserContext.mockResolvedValue(currentUser("admin"));
    cacheMocks.revalidatePath.mockImplementationOnce(() => {
      throw new Error("cache unavailable");
    });
    const { updateBetaFeedbackReviewStatus } = await import("@/lib/workshop/beta-feedback-review-actions");

    await expect(updateBetaFeedbackReviewStatus(feedbackReviewForm())).resolves.toEqual({
      ok: true,
      code: "updated",
      stale: true,
      message: "Feedback status updated. Refresh this page to see the latest data.",
    });
    expect(feedbackStoreMocks.updateBetaFeedbackReviewStatusInD1).toHaveBeenCalledWith({
      actorUserId: "user-1",
      id: "feedback-row-1",
      status: "reviewing",
    });

    cacheMocks.revalidatePath.mockImplementationOnce(() => {
      throw new Error("cache unavailable");
    });
    const { updateClosedBetaAllowlistEntry } = await import("@/lib/auth/beta-allowlist-admin-actions");

    await expect(updateClosedBetaAllowlistEntry(updateAllowlistForm())).resolves.toEqual({
      ok: true,
      code: "updated",
      stale: true,
      message: "Allowlist entry updated. Refresh this page to see the latest data.",
    });
    expect(allowlistStoreMocks.updateClosedBetaAllowlistEntryInD1).toHaveBeenCalledWith({
      actorUserId: "user-1",
      id: "allowlist-row-1",
      notes: "Paused",
      status: "revoked",
    });
  });

  it("keeps mutation outcomes out of every admin route URL", () => {
    const adminRouteSources = [
      ...readSourceTree("src/app/admin"),
      ...readSourceTree("src/components/admin"),
    ];
    const actionSources = [
      "src/lib/auth/beta-allowlist-admin-actions.ts",
      "src/lib/workshop/beta-feedback-review-actions.ts",
    ].map((path) => readFileSync(path, "utf8"));

    for (const source of [...adminRouteSources, ...actionSources]) {
      expect(source).not.toContain("?error=");
      expect(source).not.toContain("?created=");
      expect(source).not.toContain("?invited=");
      expect(source).not.toContain("?saved=");
      expect(source).not.toMatch(/searchParams\s*:\s*Promise<[^>]*\berror\??\s*:/);
    }
  });
});
