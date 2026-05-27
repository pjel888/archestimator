import { describe, expect, it } from "vitest";

import { collaborationColorPalette, getCollaborationColorForUser } from "@/lib/collaboration/colors";

describe("collaboration colors", () => {
  it("assigns a stable visible cursor color from the shared palette", () => {
    const first = getCollaborationColorForUser("user-alpha");
    const second = getCollaborationColorForUser("user-alpha");

    expect(first).toEqual(second);
    expect(collaborationColorPalette).toContainEqual(first);
    expect(first.name).toMatch(/\w+/);
    expect(first.cursor).toMatch(/^#[0-9A-F]{6}$/i);
    expect(first.cursorSoft).toMatch(/^#[0-9A-F]{6}$/i);
    expect(first.text).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it("spreads common user ids across multiple colors", () => {
    const assignedNames = new Set(
      ["user-alpha", "user-bravo", "user-charlie", "user-delta", "user-echo"].map((userId) => getCollaborationColorForUser(userId).name),
    );

    expect(assignedNames.size).toBeGreaterThan(1);
  });
});
