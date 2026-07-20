import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";

describe("corporate account status authorization contract", () => {
  it("excludes suspended corporate accounts from user corporate-account reads", () => {
    const source = readFileSync("src/lib/admin/corporate-account-repository.ts", "utf8");

    expect(source).toContain("WHERE m.user_id = ? AND a.status = 'active'");
    expect(source).not.toContain("WHERE m.user_id = ? AND a.status != 'archived'");
  });
});
