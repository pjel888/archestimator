import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  attachClientPortalInternalIdentifiers,
  createClientPortalPublicCursor,
  createClientPortalPublicIdentifier,
  parseClientPortalPublicCursor,
  readClientPortalInternalIdentifiers,
  resolveClientPortalPublicIdentifier,
} from "@/lib/client-portal/public-identifiers";

describe("client portal public identifiers", () => {
  it("creates deterministic token-scoped opaque identifiers", () => {
    const firstToken = "a".repeat(43);
    const secondToken = "b".repeat(43);
    const first = createClientPortalPublicIdentifier(firstToken, "issue", "issue_internal_1");

    expect(first).toMatch(/^cpi_[A-Za-z0-9_-]{43}$/);
    expect(first).toBe(createClientPortalPublicIdentifier(firstToken, "issue", "issue_internal_1"));
    expect(first).not.toBe(createClientPortalPublicIdentifier(secondToken, "issue", "issue_internal_1"));
    expect(first).not.toContain("issue_internal_1");
    expect(resolveClientPortalPublicIdentifier(firstToken, "issue", first, ["issue_internal_1"])).toBe("issue_internal_1");
    expect(resolveClientPortalPublicIdentifier(secondToken, "issue", first, ["issue_internal_1"])).toBeNull();
  });

  it("projects cursors without exposing their internal row identifier", () => {
    const token = "a".repeat(43);
    const cursor = createClientPortalPublicCursor(token, "thread", "2026-07-27T00:00:00.000Z|thread_internal_1");

    expect(cursor).not.toContain("thread_internal_1");
    expect(parseClientPortalPublicCursor(cursor)).toEqual({
      publicId: createClientPortalPublicIdentifier(token, "thread", "thread_internal_1"),
      timestamp: "2026-07-27T00:00:00.000Z",
    });
  });

  it("keeps internal translation metadata out of JSON responses", () => {
    const value = attachClientPortalInternalIdentifiers({ issue: { id: "cpi_public" } }, {
      issueId: "issue_internal_1",
      portalId: "portal_internal_1",
    });

    expect(readClientPortalInternalIdentifiers(value)).toEqual({
      issueId: "issue_internal_1",
      portalId: "portal_internal_1",
    });
    expect(JSON.stringify(value)).toBe('{"issue":{"id":"cpi_public"}}');
  });
});
