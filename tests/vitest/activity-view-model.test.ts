import { describe, expect, it } from "vitest";
import { composeEstimateActivity, composeSharedLinkActivity, filterActivityForVisibility, formatActivityActor, formatActivityFieldLabel, formatActivityValue } from "@/lib/activity";
import { estimateEventTypes, makeEstimateEvent, sharedLinkFixtures } from "./fixtures/activity-events";

describe("activity view model", () => {
  it.each(estimateEventTypes)("returns required view-model fields for %s", (eventType) => {
    const activity = composeEstimateActivity(makeEstimateEvent(eventType));
    expect(activity).toMatchObject({ id: expect.any(String), source: "estimate", action: expect.any(String), visibility: "owner", occurredAt: expect.any(String), title: expect.any(String) });
    expect(activity.actor.displayName).toEqual(expect.any(String));
    expect(activity.target.label).toEqual(expect.any(String));
  });

  it.each(sharedLinkFixtures)("returns required shared-link fields for $id", (item) => {
    const activity = composeSharedLinkActivity(item);
    expect(activity.id).toBe(item.id);
    expect(activity.occurredAt).toBe(item.created_at);
    expect(activity.title).toEqual(expect.any(String));
  });

  it("formats fields, values, and actors", () => {
    expect(formatActivityFieldLabel("unit_cost")).toBe("Unit cost");
    expect(formatActivityValue("unitCost", 1200)).toMatch(/₱/);
    expect(formatActivityValue("contingencyPercentage", 10)).toBe("10%");
    expect(formatActivityActor("u1", "Maria Santos").displayName).toBe("Maria Santos");
  });


  it("composes client estimate activity with public-safe audience", () => {
    const activity = composeEstimateActivity(makeEstimateEvent("row_updated"), { audience: "client", visibility: "public" });
    expect(activity.audience).toBe("client");
    expect(activity.visibility).toBe("public");
    expect(activity.raw).toBeUndefined();
  });

  it("keeps internal notes available to owner filtering", () => {
    const internal = composeSharedLinkActivity(sharedLinkFixtures.find((item) => item.is_internal) ?? sharedLinkFixtures[0]);
    expect(filterActivityForVisibility([internal], "owner")).toHaveLength(1);
  });

  it("removes internal notes from client filtering", () => {
    const internal = composeSharedLinkActivity(sharedLinkFixtures.find((item) => item.is_internal) ?? sharedLinkFixtures[0]);
    expect(filterActivityForVisibility([internal], "client")).toHaveLength(0);
  });

  it("maps shared-link sources by item family", () => {
    expect(composeSharedLinkActivity(sharedLinkFixtures.find((item) => item.type === "comment") ?? sharedLinkFixtures[0]).source).toBe("comment");
    expect(composeSharedLinkActivity(sharedLinkFixtures.find((item) => item.type === "decision") ?? sharedLinkFixtures[0]).source).toBe("decision");
    expect(composeSharedLinkActivity(sharedLinkFixtures.find((item) => item.type === "event") ?? sharedLinkFixtures[0]).source).toBe("share");
  });

  it("formats linked library states into human copy", () => {
    expect(formatActivityValue("linkState", "linked-clean")).toBe("Using library values");
    expect(formatActivityValue("linkState", "linked-overridden")).toBe("Customized from library");
  });

  it("summarizes row edits with changed values, total delta, and row location", () => {
    const activity = composeEstimateActivity(makeEstimateEvent("row_updated", {
      rowContext: { material: "Porcelain tile", nodePath: "Ground Floor / Bath" },
      oldSnapshot: { material: "Porcelain tile", quantity: 1, unitCost: 1000 },
      newSnapshot: { material: "Porcelain tile", quantity: 2, unitCost: 1500 },
      changedFields: ["quantity", "unitCost", "row"],
      totalDelta: 2000,
    }));

    expect(activity.title).toBe("Philip Lewis changed quantity, unit cost for Porcelain tile.");
    expect(activity.summary).toContain("Quantity from 1 to 2");
    expect(activity.summary).toContain("Unit cost from ₱1,000.00 to ₱1,500.00");
    expect(activity.summary).toContain("Total increased by ₱2,000.00");
    expect(activity.summary).toContain("Located in Ground Floor / Bath");
    expect(activity.summary).not.toContain("Updated row");
  });

  it("summarizes newer tree reorder events with affected item counts", () => {
    const activity = composeEstimateActivity(makeEstimateEvent("nodes_reordered", {
      estimateNodeId: null,
      changedFields: ["tree"],
      payload: { updatedCount: 3 },
    }));

    expect(activity.title).toBe("Philip Lewis reorganized the estimate tree.");
    expect(activity.summary).toBe("Reordered 3 tree items");
    expect(activity.summary).not.toContain("Updated tree");
  });

  it("summarizes library unlink events without internal ids", () => {
    const activity = composeEstimateActivity(makeEstimateEvent("row_unlinked", {
      rowContext: { material: "Sleeper sofa", nodePath: "Living Room" },
      oldSnapshot: {
        sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
        linkState: "linked-clean",
        metadata: {},
      },
      newSnapshot: {
        sourceLibraryItemId: null,
        linkState: "detached",
        metadata: { detachedReason: "custom dimensions" },
      },
      changedFields: ["sourceLibraryItemId", "linkState", "metadata"],
      totalDelta: 0,
    }));

    expect(activity.title).toBe("Philip Lewis detached Sleeper sofa from the cost library.");
    expect(activity.summary).toBe("Library status from Using library values to Detached from library; Located in Living Room");
    expect(activity.facts).toContainEqual({ label: "Affected fields", value: "Library status" });
    expect(activity.summary).not.toContain("Source library item");
    expect(activity.summary).not.toContain("metadata");
  });

  it("does not invent an Item location when row context has no area", () => {
    const activity = composeEstimateActivity(makeEstimateEvent("row_added", {
      rowContext: { material: "Sleeper sofa" },
      newSnapshot: { material: "Sleeper sofa" },
      changedFields: ["row"],
      totalDelta: 0,
    }));

    expect(activity.summary).toBe("Added Sleeper sofa; No total cost change");
    expect(activity.summary).not.toContain("Item");
  });

  it("summarizes node deletions with tree, row, and total impact", () => {
    const activity = composeEstimateActivity(makeEstimateEvent("node_deleted_with_children", {
      payload: { deletedNodeCount: 2, deletedRowCount: 5 },
      totalDelta: -4500,
    }));

    expect(activity.summary).toContain("Removed 2 tree items");
    expect(activity.summary).toContain("Deleted 5 estimate rows");
    expect(activity.summary).toContain("Total decreased by ₱4,500.00");
  });

  it("does not summarize express component insertion as a blank row", () => {
    const activity = composeEstimateActivity(makeEstimateEvent("row_added", {
      rowContext: {
        material: "Express custom vanity",
        areaName: "Powder Room",
        metadata: { expressComponent: { kind: "express", id: "express-row-1" } },
      },
      newSnapshot: {
        material: "Express custom vanity",
        metadata: { expressComponent: { kind: "express", id: "express-row-1" } },
      },
    }));

    expect(activity.title).toContain("added Express custom vanity");
    expect(activity.title).not.toContain("empty row slot");
    expect(activity.title).not.toContain("Blank row");
  });

  it("client visibility strips raw and target ids", () => {
    const owner = composeEstimateActivity(makeEstimateEvent("row_added"));
    const [client] = filterActivityForVisibility([owner], "client");
    expect(client.raw).toBeUndefined();
    expect(client.target.id).toBeUndefined();
  });
});
