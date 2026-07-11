import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const userDetailPage = readFileSync("src/app/admin/users/[userId]/page.tsx", "utf8");

describe("corporate account user membership detail", () => {
  it("shows a user's corporate memberships with roles and account links", () => {
    expect(userDetailPage).toContain("listUserCorporateAccounts(userId)");
    expect(userDetailPage).toContain("Corporate membership");
    expect(userDetailPage).toContain("href={`/admin/accounts/${acct.id}`}");
    expect(userDetailPage).toContain("{acct.role}");
  });
});
