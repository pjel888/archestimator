/**
 * Maps historical writer variants to the stable vocabulary consumed by Activity
 * readers. Stored values remain unchanged so existing audit rows need no migration.
 */
const EVENT_TYPE_NORMALIZATION_MAP = {
  estimate_details_updated: "sheet_metadata_updated",
  estimate_node_created: "node_created",
  estimate_node_deleted: "node_deleted_with_children",
  estimate_node_renamed: "node_renamed",
  estimate_nodes_deleted: "node_deleted_with_children",
  estimate_nodes_reordered: "tree_reordered",
  estimate_nodes_restored: "nodes_restored",
  estimate_row_deleted: "row_deleted",
  estimate_row_inserted: "row_added",
  estimate_row_updated: "row_updated",
  estimate_tab_archived: "tab_archived",
  estimate_tab_created: "tab_created",
  estimate_tab_deleted: "tab_deleted",
  estimate_tab_duplicated: "tab_duplicated",
  estimate_tab_renamed: "tab_renamed",
  estimate_tabs_reordered: "tabs_reordered",
  estimate_template_inserted: "template_inserted",
  row_inserted: "row_added",
  rows_deleted: "rows_bulk_deleted",
  template_node_subtree_inserted: "template_inserted",
} as const;

const ACTIVITY_FILTER_ALIAS_MAP: Record<string, readonly string[]> = {
  node_deleted_with_children: ["estimate_node_deleted", "estimate_nodes_deleted"],
  row_deleted: ["rows_deleted"],
  sheet_code_updated: ["estimate_details_updated"],
  sheet_metadata_updated: ["estimate_details_updated"],
};

export type CanonicalEventType = (typeof EVENT_TYPE_NORMALIZATION_MAP)[keyof typeof EVENT_TYPE_NORMALIZATION_MAP] | string;

export function normalizeEventType(rawType: string, context: { changedFields?: readonly string[] } = {}): CanonicalEventType {
  if (rawType === "estimate_details_updated" && context.changedFields?.includes("sheetCode")) {
    return "sheet_code_updated";
  }
  return EVENT_TYPE_NORMALIZATION_MAP[rawType as keyof typeof EVENT_TYPE_NORMALIZATION_MAP] ?? rawType;
}

/** Returns every persisted spelling that represents the requested UI event type. */
export function storedEventTypesForCanonicalEventType(eventType: string): string[] {
  const canonicalType = normalizeEventType(eventType);
  return Array.from(new Set([
    canonicalType,
    ...Object.entries(EVENT_TYPE_NORMALIZATION_MAP)
      .filter(([, normalizedType]) => normalizedType === canonicalType)
      .map(([rawType]) => rawType),
    ...(ACTIVITY_FILTER_ALIAS_MAP[canonicalType] ?? []),
  ]));
}
