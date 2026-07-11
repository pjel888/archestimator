import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("recipient inbox dead-end recovery", () => {
  it("keeps unavailable proposals fail-closed while explaining the next safe action", () => {
    const repository = readFileSync("src/lib/repositories/recipient-proposals-repository.ts", "utf8");
    const row = readFileSync("src/components/workshop/proposals-page/ProposalRow.tsx", "utf8");
    const emptyState = readFileSync("src/components/workshop/proposals-page/ProposalsEmptyState.tsx", "utf8");

    expect(repository).toContain("if (rows.some((row) => row === null)) return { ok: false, error: \"unknown\" };");
    expect(repository).not.toContain(".filter(Boolean)");
    expect(row).toContain("Open the link from your email invitation");
    expect(row).toContain("Contact the sender for the next steps.");
    expect(row).toContain("contact the sender for next steps");
    expect(emptyState).toContain("This inbox shows proposals sent to your email address.");
  });
});
