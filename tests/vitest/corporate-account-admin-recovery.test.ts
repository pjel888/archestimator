import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const accountsPage = readFileSync("src/app/admin/accounts/page.tsx", "utf8");
const repository = readFileSync("src/lib/admin/corporate-account-repository.ts", "utf8");

describe("corporate account archive recovery", () => {
  it("keeps the default list non-archived and exposes an archived-only recovery view", () => {
    expect(repository).toContain("status?: \"active\" | \"suspended\" | \"archived\"");
    expect(repository).toContain("WHERE a.status = 'archived'");
    expect(repository).toContain("WHERE a.status != 'archived'");
    expect(accountsPage).toContain('status === "archived"');
    expect(accountsPage).toContain('href={showArchived ? "/admin/accounts" : "/admin/accounts?status=archived"}');
    expect(accountsPage).toContain('status: showArchived ? "archived" : undefined');
  });
});
