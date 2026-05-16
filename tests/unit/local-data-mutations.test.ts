import { describe, expect, test } from "bun:test";
import type { Estimate, LocalDatabase } from "@/lib/local-data/schemas";
import { createProjectWithInitialEstimate, createProposalSnapshot, duplicateEstimateRevision, saveEstimateInDatabase } from "@/lib/local-data/mutations";

const estimate: Estimate = {
  id: "estimate_1",
  projectId: "project_1",
  name: "Initial Estimate",
  versionLabel: "Initial",
  versionNumber: 1,
  status: "draft",
  pricingBasisDate: "2026-05-16",
  sections: [{ id: "section_1", name: "Works", outlineCode: "A", sectionType: "trade" }],
  lineItems: [
    {
      id: "line_1",
      sectionId: "section_1",
      itemName: "Work item",
      quantity: 2,
      unit: "lot",
      unitCost: 100,
      scopeStatus: "included",
      linkState: "manual",
    },
  ],
};

const database: LocalDatabase = {
  schemaVersion: 1,
  workspace: { id: "workspace_1", name: "Demo", defaultCurrency: "PHP" },
  projects: [{ id: "project_1", name: "Project", clientName: "Client", location: "Manila", status: "active", currentEstimateId: "estimate_1" }],
  estimates: [estimate],
  costLibraryItems: [],
  proposalSnapshots: [],
};

describe("saveEstimateInDatabase", () => {
  test("replaces an existing estimate and preserves the project pointer", () => {
    const changed = { ...estimate, name: "Changed Estimate" };
    const next = saveEstimateInDatabase(database, changed);

    expect(next.estimates).toHaveLength(1);
    expect(next.estimates[0].name).toBe("Changed Estimate");
    expect(next.projects[0].currentEstimateId).toBe("estimate_1");
  });
});

describe("duplicateEstimateRevision", () => {
  test("creates a new draft revision and points the project at it", () => {
    const next = duplicateEstimateRevision(database, "estimate_1", "Design change");

    expect(next.estimate.id).not.toBe("estimate_1");
    expect(next.estimate.versionNumber).toBe(2);
    expect(next.estimate.versionLabel).toBe("Rev 02");
    expect(next.estimate.status).toBe("draft");
    expect(next.database.projects[0].currentEstimateId).toBe(next.estimate.id);
  });
});

describe("createProposalSnapshot", () => {
  test("freezes proposal totals without mutating the estimate", () => {
    const next = createProposalSnapshot(database, "estimate_1");

    expect(next.snapshot.estimateId).toBe("estimate_1");
    expect(next.snapshot.totalAmount).toBe(200);
    expect(next.snapshot.currency).toBe("PHP");
    expect(next.snapshot.projectName).toBe("Project");
    expect(next.snapshot.clientName).toBe("Client");
    expect(next.snapshot.projectLocation).toBe("Manila");
    expect(next.snapshot.estimateName).toBe("Initial Estimate");
    expect(next.snapshot.terms.subject).toBe("Cost proposal for Project");
    expect(next.snapshot.terms.validityDays).toBe(30);
    expect(next.database.proposalSnapshots).toHaveLength(1);
    expect(next.database.estimates[0].status).toBe("draft");
  });
});

describe("createProjectWithInitialEstimate", () => {
  test("creates a project with a first empty draft estimate", () => {
    const next = createProjectWithInitialEstimate(database, {
      name: " New Project ",
      clientName: " Owner ",
      location: " Cebu ",
    });

    const project = next.database.projects[0];
    const newEstimate = next.database.estimates[0];

    expect(project.id).toBe(next.projectId);
    expect(project.name).toBe("New Project");
    expect(project.clientName).toBe("Owner");
    expect(project.location).toBe("Cebu");
    expect(project.currentEstimateId).toBe(next.estimateId);
    expect(newEstimate.projectId).toBe(project.id);
    expect(newEstimate.lineItems).toHaveLength(0);
    expect(newEstimate.sections[0].name).toBe("General Scope");
  });
});
