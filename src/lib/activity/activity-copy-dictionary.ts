import type { ActivityAction } from "./types";

export const ESTIMATE_EVENT_ACTIONS: Record<string, ActivityAction> = {
  row_updated: "changed",
  row_added: "added",
  row_blank_added: "added",
  row_deleted: "removed",
  row_replaced: "replaced",
  row_unlinked: "changed",
  template_inserted: "inserted_template",
  project_source_inserted: "inserted_template",
  sheet_code_updated: "changed",
  sheet_metadata_updated: "changed",
  sheet_version_created: "created",
  sheet_restored_as_copy: "created",
  node_created: "created",
  node_renamed: "renamed",
  node_deleted_with_children: "deleted",
  nodes_reordered: "reorganized",
  tree_reordered: "reorganized",
  tab_created: "created",
  tab_renamed: "renamed",
  tab_reordered: "reorganized",
  tabs_reordered: "reorganized",
  tab_duplicated: "created",
  tab_archived: "removed",
  tab_deleted: "deleted",
};

export const DECISION_ACTIONS: Record<string, ActivityAction> = {
  accepted: "approved",
  declined: "declined",
  revision_requested: "requested_revision",
};

const ESTIMATE_EVENT_TYPES = Object.keys(ESTIMATE_EVENT_ACTIONS);
