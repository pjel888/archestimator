import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireCurrentUserContext: vi.fn(),
}));

const allowlistStoreMocks = vi.hoisted(() => ({
  createClosedBetaAllowlistEntryInD1: vi.fn(),
  updateClosedBetaAllowlistEntryInD1: vi.fn(),
}));

const feedbackStoreMocks = vi.hoisted(() => ({
  updateBetaFeedbackReviewStatusInD1: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  requireCurrentUserContext: authMocks.requireCurrentUserContext,
}));

vi.mock("@/lib/auth/closed-beta-d1-store", () => ({
  createClosedBetaAllowlistEntryInD1: allowlistStoreMocks.createClosedBetaAllowlistEntryInD1,
  updateClosedBetaAllowlistEntryInD1: allowlistStoreMocks.updateClosedBetaAllowlistEntryInD1,
}));

vi.mock("@/lib/workshop/beta-feedback-d1-store", () => ({
  updateBetaFeedbackReviewStatusInD1: feedbackStoreMocks.updateBetaFeedbackReviewStatusInD1,
}));

vi.mock("next/cache", () => ({
  revalidatePath: cacheMocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: navigationMocks.redirect,
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

describe("beta admin action boundaries", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
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

      await expect(createClosedBetaAllowlistEntry(createAllowlistForm())).rejects.toThrow(
        "NEXT_REDIRECT:/admin/allowlist?error=forbidden",
      );
      await expect(updateClosedBetaAllowlistEntry(updateAllowlistForm())).rejects.toThrow(
        "NEXT_REDIRECT:/admin/allowlist?error=forbidden",
      );

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
    await expect(createClosedBetaAllowlistEntry(createAllowlistForm())).rejects.toThrow(
      "NEXT_REDIRECT:/admin/allowlist?created=1",
    );
    expect(allowlistStoreMocks.createClosedBetaAllowlistEntryInD1).toHaveBeenCalledWith({
      actorUserId: "user-1",
      email: "beta+pilot@example.com",
      notes: "Pilot reviewer",
      status: "invited",
    });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/admin/allowlist");

    vi.clearAllMocks();
    authMocks.requireCurrentUserContext.mockResolvedValue(currentUser("ceo"));
    await expect(updateClosedBetaAllowlistEntry(updateAllowlistForm())).rejects.toThrow(
      "NEXT_REDIRECT:/admin/allowlist?saved=1",
    );
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

      await expect(updateBetaFeedbackReviewStatus(feedbackReviewForm())).rejects.toThrow(
        "NEXT_REDIRECT:/admin/feedback?error=forbidden",
      );

      expect(feedbackStoreMocks.updateBetaFeedbackReviewStatusInD1).not.toHaveBeenCalled();
      expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("allows platform admins to update beta feedback review status", async () => {
    authMocks.requireCurrentUserContext.mockResolvedValue(currentUser("admin"));
    const { updateBetaFeedbackReviewStatus } = await import("@/lib/workshop/beta-feedback-review-actions");

    await expect(updateBetaFeedbackReviewStatus(feedbackReviewForm())).rejects.toThrow(
      "NEXT_REDIRECT:/admin/feedback?saved=1",
    );

    expect(feedbackStoreMocks.updateBetaFeedbackReviewStatusInD1).toHaveBeenCalledWith({
      actorUserId: "user-1",
      id: "feedback-row-1",
      status: "reviewing",
    });
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/admin/feedback");
  });
});
