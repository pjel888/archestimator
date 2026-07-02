import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

const PUBLICATION_ID = "11111111-1111-4111-8111-111111111111";
const RECIPIENT_ID = "22222222-2222-4222-8222-222222222222";

type ActionHarnessOptions = {
  authorization?: Array<{ publication_id: string; recipient_id: string }> | null;
  authorizationError?: { code?: string; message?: string } | null;
  publication?: {
    encrypted_token: string;
    expires_at: string | null;
    id: string;
    password_hash: string | null;
    revoked_at: string | null;
    status: "published" | "expired" | "revoked";
  } | null;
  publicationError?: { message?: string } | null;
};

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

function formData(publicationId = PUBLICATION_ID) {
  const data = new FormData();
  data.set("publicationId", publicationId);
  return data;
}

function createPublicationQuery(options: ActionHarnessOptions) {
  const query = {
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({
      data: options.publication === undefined
        ? {
            encrypted_token: "encrypted-recipient-token",
            expires_at: "2999-01-01T00:00:00.000Z",
            id: PUBLICATION_ID,
            password_hash: "password-hash",
            revoked_at: null,
            status: "published",
          }
        : options.publication,
      error: options.publicationError ?? null,
    })),
    select: vi.fn(() => query),
  };
  return query;
}

async function loadHarness(options: ActionHarnessOptions = {}) {
  vi.resetModules();

  const cookieSet = vi.fn();
  const publicationQuery = createPublicationQuery(options);
  const admin = {
    callProcedure: vi.fn(async () => ({
      data: options.authorization === undefined
        ? [{ publication_id: PUBLICATION_ID, recipient_id: RECIPIENT_ID }]
        : options.authorization,
      error: options.authorizationError ?? null,
    })),
    from: vi.fn(() => publicationQuery),
  };
  const redirect = vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
  const decryptPublicationToken = vi.fn(() => "recipient-token");
  const getSharedLinkSessionCookieParts = vi.fn(() => ({
    cookieOptions: {
      httpOnly: true,
      maxAge: 86400,
      path: "/",
      sameSite: "lax",
      secure: false,
    },
    name: "shared_link_session_test",
    value: "signed-session",
  }));

  vi.doMock("@/lib/publication/admin-d1-client", () => ({
    createPublicationAdminD1Client: vi.fn(() => admin),
  }));
  vi.doMock("next/cache", () => ({
    revalidatePath: vi.fn(),
  }));
  vi.doMock("next/headers", () => ({
    cookies: vi.fn(async () => ({ set: cookieSet })),
    headers: vi.fn(async () => ({ get: vi.fn(() => null) })),
  }));
  vi.doMock("next/navigation", () => ({
    redirect,
  }));
  vi.doMock("@/lib/auth/session", () => ({
    requireAuth: vi.fn(async () => ({ id: "user-1" })),
    requireCurrentUserContext: vi.fn(async () => ({
      email: "recipient@example.com",
      userId: "33333333-3333-4333-8333-333333333333",
    })),
  }));
  vi.doMock("@/lib/publication/security", () => ({
    createPublicationToken: vi.fn(() => "new-token"),
    decryptPublicationToken,
    deriveCredentialVersion: vi.fn(() => "credential-version"),
    encryptPublicationToken: vi.fn((token: string) => `encrypted-${token}`),
    getSharedLinkSessionCookieParts,
    hashPublicationPassword: vi.fn(async (value: string) => `password-hash-${value}`),
    hashPublicationToken: vi.fn((token: string) => `token-hash-${token}`),
    readPublicationTokenEncryptionSecret: vi.fn(() => "encryption-secret"),
    readPublicationTokenHashSecret: vi.fn(() => "hash-secret"),
    validatePublicationPassword: vi.fn(async () => true),
  }));

  const actions = await import("@/lib/publication/actions");

  return {
    admin,
    cookieSet,
    decryptPublicationToken,
    getSharedLinkSessionCookieParts,
    openRecipientProposalAction: actions.openRecipientProposalAction,
    publicationQuery,
    redirect,
  };
}

describe("openRecipientProposalAction", () => {
  it("rejects invalid publication ids before RPC or service-role access", async () => {
    const harness = await loadHarness();

    await expect(harness.openRecipientProposalAction(null, formData("not-a-uuid"))).resolves.toEqual({
      ok: false,
      error: "invalid",
    });

    expect(harness.admin.callProcedure).not.toHaveBeenCalled();
    expect(harness.admin.from).not.toHaveBeenCalled();
    expect(harness.cookieSet).not.toHaveBeenCalled();
  });

  it("returns not-a-recipient when the authorization RPC finds no recipient row", async () => {
    const harness = await loadHarness({ authorization: [] });

    await expect(harness.openRecipientProposalAction(null, formData())).resolves.toEqual({
      ok: false,
      error: "not-a-recipient",
    });

    expect(harness.admin.callProcedure).toHaveBeenCalledWith("authorize_recipient_publication_for_current_user", {
      p_publication_id: PUBLICATION_ID,
      p_current_user_email: "recipient@example.com",
    });
    expect(harness.admin.from).not.toHaveBeenCalled();
    expect(harness.cookieSet).not.toHaveBeenCalled();
  });

  it("returns unavailable for inactive or expired publications after recipient authorization", async () => {
    const harness = await loadHarness({
      publication: {
        encrypted_token: "encrypted-recipient-token",
        expires_at: "2000-01-01T00:00:00.000Z",
        id: PUBLICATION_ID,
        password_hash: null,
        revoked_at: null,
        status: "published",
      },
    });

    await expect(harness.openRecipientProposalAction(null, formData())).resolves.toEqual({
      ok: false,
      error: "unavailable",
    });

    expect(harness.admin.from).toHaveBeenCalledWith("project_publications");
    expect(harness.decryptPublicationToken).not.toHaveBeenCalled();
    expect(harness.cookieSet).not.toHaveBeenCalled();
  });

  it("mints the shared-link session cookies and redirects to the recovered share URL", async () => {
    const harness = await loadHarness();

    await expect(harness.openRecipientProposalAction(null, formData())).rejects.toThrow(
      "NEXT_REDIRECT:/share/recipient-token",
    );

    expect(harness.publicationQuery.select).toHaveBeenCalledWith(
      "id, encrypted_token, password_hash, status, revoked_at, expires_at",
    );
    expect(harness.decryptPublicationToken).toHaveBeenCalledWith("encrypted-recipient-token", "encryption-secret");
    expect(harness.getSharedLinkSessionCookieParts).toHaveBeenCalledWith({
      credentialVersion: "credential-version",
      publicationId: PUBLICATION_ID,
      recipientId: RECIPIENT_ID,
      token: "recipient-token",
    });
    expect(harness.cookieSet).toHaveBeenCalledWith(
      "shared_link_session_test",
      "signed-session",
      expect.objectContaining({ httpOnly: true, maxAge: 86400, sameSite: "lax" }),
    );
    expect(harness.cookieSet).toHaveBeenCalledWith(
      "shared_link_session_test_ok",
      "1",
      expect.objectContaining({ httpOnly: false, maxAge: 86400, sameSite: "lax" }),
    );
    expect(harness.redirect).toHaveBeenCalledWith("/share/recipient-token");
  });

  it("keeps the action source ordered authorization-first and free of returned credential material", () => {
    const source = readFileSync("src/lib/publication/actions.ts", "utf8");
    const actionSource = source.slice(
      source.indexOf("export async function openRecipientProposalAction"),
      source.indexOf("function assertUuid"),
    );

    expect(actionSource.indexOf("createPublicationAdminClient()")).toBeLessThan(
      actionSource.indexOf("authorize_recipient_publication_for_current_user"),
    );
    expect(actionSource.indexOf("authorize_recipient_publication_for_current_user")).toBeLessThan(
      actionSource.indexOf(".from<"),
    );
    expect(actionSource).toContain("getSharedLinkSessionCookieParts");
    expect(actionSource).toContain("cookieStore.set(parts.name, parts.value, parts.cookieOptions)");
    expect(actionSource).toContain("cookieStore.set(`${parts.name}_ok`");
    expect(actionSource).toContain("redirectPath = `/share/${encodeURIComponent(token)}`");
    expect(actionSource).not.toContain("token_hash");
    expect(actionSource).not.toContain("recipient_token_hash");
  });
});
