import type { EstimateActivityInput, SharedLinkActivityInput } from "@/lib/activity";

export const estimateEventTypes = [
  "row_updated",
  "row_added",
  "row_blank_added",
  "row_deleted",
  "row_replaced",
  "template_inserted",
  "sheet_code_updated",
  "sheet_metadata_updated",
  "sheet_version_created",
  "sheet_restored_as_copy",
  "node_created",
  "node_renamed",
  "node_deleted_with_children",
  "tree_reordered",
  "tab_created",
  "tab_renamed",
  "tab_reordered",
  "tabs_reordered",
  "tab_duplicated",
  "tab_archived",
  "tab_deleted",
] as const;

export function makeEstimateEvent(eventType: string, overrides: Partial<EstimateActivityInput> = {}): EstimateActivityInput {
  return {
    id: `evt-${eventType}`,
    eventType,
    eventSource: "server_action",
    createdAt: "2026-06-02T08:00:00.000Z",
    actorUserId: "11111111-1111-4111-8111-111111111111",
    actorLabel: "Philip Lewis",
    estimateTabId: eventType.startsWith("tab_") ? "55555555-5555-4555-8555-555555555555" : null,
    targetRowId: eventType.startsWith("row_") ? "22222222-2222-4222-8222-222222222222" : null,
    estimateNodeId: eventType.startsWith("tab_") ? null : eventType.startsWith("node_") ? "33333333-3333-4333-8333-333333333333" : "living-area",
    rowContext: { material: "Hardwood Oak Flooring", areaName: "Living Area" },
    oldSnapshot: { material: "Old Tile", quantity: 1, unitCost: 1000, sheetCode: "ES-001", name: "Old Living Area" },
    newSnapshot: { material: "Hardwood Oak Flooring", quantity: 2, unitCost: 1500, sheetCode: "ES-002", name: "Living Area" },
    changedFields: ["quantity", "unitCost"],
    totalDelta: 2000,
    payload: { templateName: "Living Area Template", name: "Main", tabName: "Main", estimateTabId: "55555555-5555-4555-8555-555555555555", updatedCount: 3 },
    correlationId: "44444444-4444-4444-8444-444444444444",
    ...overrides,
  };
}

export const sharedLinkFixtures: SharedLinkActivityInput[] = [
  { id: "comment-public", type: "comment", created_at: "2026-06-02T09:00:00.000Z", author: "Maria Santos", body: "Looks good.", metadata: { targetLabel: "Living Area" } },
  { id: "comment-internal", type: "comment", created_at: "2026-06-02T09:01:00.000Z", author: "Philip Lewis", body: "Internal note.", is_internal: true, metadata: { targetLabel: "Kitchen" } },
  { id: "decision-accepted", type: "decision", created_at: "2026-06-02T09:02:00.000Z", recipientDisplayName: "Maria", decision: "accepted" },
  { id: "decision-declined", type: "decision", created_at: "2026-06-02T09:03:00.000Z", recipientDisplayName: "Maria", decision: "declined" },
  { id: "decision-revision", type: "decision", created_at: "2026-06-02T09:04:00.000Z", recipientDisplayName: "Maria", decision: "revision_requested" },
  { id: "event-open", type: "event", created_at: "2026-06-02T09:05:00.000Z", recipientDisplayName: "Maria", metadata: { eventType: "open" } },
  { id: "event-password", type: "event", created_at: "2026-06-02T09:06:00.000Z", recipientDisplayName: "Maria", metadata: { eventType: "password_attempt", success: true } },
  { id: "event-unknown", type: "event", created_at: "2026-06-02T09:07:00.000Z", metadata: { eventType: "something_new" } },
];

export const bannedPublicTerms = [
  "row_updated", "row_replaced", "row_deleted", "row_added", "row_blank_added",
  "sheet_code_updated", "sheet_metadata_updated", "node_created", "node_renamed", "node_deleted_with_children",
  "tree_reordered", "tab_created", "tab_renamed", "tab_reordered", "tabs_reordered", "tab_duplicated", "tab_archived", "tab_deleted", "template_inserted", "revision_requested", "accepted", "server_action",
  "metadata_json", "sourceSnapshot", "oldSnapshot", "newSnapshot", "changedFields", "correlation_id", "target_row_id", "estimate_node_id",
  "linked-clean", "linked-overridden", "source-changed", "detached", "COMMENT", "DECISION", "EVENT",
];
