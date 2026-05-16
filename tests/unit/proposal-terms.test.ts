import { describe, expect, test } from "bun:test";
import { createDefaultProposalTerms } from "@/lib/proposals/terms";
import type { Estimate, LocalDatabase } from "@/lib/local-data/schemas";

const estimate: Estimate = {
  id: "estimate_1",
  projectId: "project_1",
  name: "Initial Estimate",
  versionLabel: "Initial",
  versionNumber: 1,
  status: "draft",
  pricingBasisDate: "2026-05-16",
  sections: [],
  lineItems: [],
};

const database: LocalDatabase = {
  schemaVersion: 1,
  workspace: { id: "workspace_1", name: "Lewis Builders", defaultCurrency: "PHP" },
  projects: [{ id: "project_1", name: "Sample Residence", clientName: "Client", location: "Manila", status: "active", currentEstimateId: "estimate_1" }],
  estimates: [estimate],
  costLibraryItems: [],
  proposalSnapshots: [],
};

describe("createDefaultProposalTerms", () => {
  test("creates contractor-ready editable terms from workspace and project data", () => {
    const terms = createDefaultProposalTerms(database, estimate);

    expect(terms.subject).toBe("Cost proposal for Sample Residence");
    expect(terms.contractorName).toBe("Lewis Builders");
    expect(terms.validityDays).toBe(30);
    expect(terms.exclusions).toContain("owner-supplied");
  });
});
