import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const repository = readFileSync("src/lib/admin/corporate-account-repository.ts", "utf8");
const workspaces = readFileSync("src/components/admin/AdminAccountWorkspaces.tsx", "utf8");

describe("corporate account workspace link state", () => {
  it("loads the current corporate-account state for every link candidate", () => {
    const listCandidates = repository.match(/export async function listAllWorkspacesForLinking[\s\S]*?\n}\n\nexport async function listAllUsersForAssignment/)?.[0];

    expect(listCandidates).toContain("w.corporate_account_id");
    expect(listCandidates).toContain("a.name AS corporate_account_name");
    expect(listCandidates).toContain("LEFT JOIN corporate_accounts AS a");
  });

  it("identifies unlinked workspaces and explicit moves in the admin picker", () => {
    expect(workspaces).toContain('"No corporate account"');
    expect(workspaces).toContain('`Move from ${ws.corporate_account_name ?? "another account"}`');
  });
});
