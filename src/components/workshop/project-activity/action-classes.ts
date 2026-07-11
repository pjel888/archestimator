import type { ActivityViewModel } from "@/lib/activity";

export const PROJECT_ACTIVITY_ACTION_BUCKETS = [
  "all",
  "created",
  "edited",
  "deleted",
  "reordered",
  "shared",
  "commented",
  "decided",
  "invited",
  "viewed",
  "versioned",
  "system",
] as const;

export type ProjectActivityActionBucket = (typeof PROJECT_ACTIVITY_ACTION_BUCKETS)[number];
export type ProjectActivityConcreteActionBucket = Exclude<ProjectActivityActionBucket, "all">;

const concreteBuckets = new Set<ProjectActivityActionBucket>(PROJECT_ACTIVITY_ACTION_BUCKETS.filter((bucket) => bucket !== "all"));

const estimateEventBuckets: Record<string, ProjectActivityConcreteActionBucket> = {
  node_created: "created",
  row_added: "created",
  row_added_from_template: "created",
  row_inserted_from_template: "created",
  sheet_created: "created",
  tab_created: "created",
  template_inserted: "created",
  node_renamed: "edited",
  row_changed: "edited",
  row_detached: "edited",
  row_replaced: "edited",
  row_unlinked: "edited",
  row_updated: "edited",
  sheet_code_updated: "edited",
  sheet_metadata_updated: "edited",
  tab_renamed: "edited",
  node_deleted: "deleted",
  node_deleted_with_children: "deleted",
  row_deleted: "deleted",
  tab_archived: "deleted",
  tab_deleted: "deleted",
  tabs_reordered: "reordered",
  tree_reordered: "reordered",
  nodes_reordered: "reordered",
  sheet_restored_as_copy: "versioned",
  sheet_version_created: "versioned",
};

const publicationEventBuckets: Record<string, ProjectActivityConcreteActionBucket> = {
  published: "shared",
  republished: "shared",
  revoked: "shared",
  sent: "shared",
  resent: "shared",
};

const sharedEventBuckets: Record<string, ProjectActivityConcreteActionBucket> = {
  open: "viewed",
  opened: "viewed",
  viewed: "viewed",
  password_attempt: "viewed",
  password_attempted: "viewed",
};

const collaborationEventBuckets: Record<string, ProjectActivityConcreteActionBucket> = {
  invite_email_attempted: "invited",
  invite_email_sent: "invited",
  member_added: "invited",
  member_removed: "invited",
  project_metadata_updated: "edited",
  role_changed: "invited",
  estimate_access_inherited: "edited",
  estimate_access_restricted: "edited",
  collaboration_invite_token_issued: "invited",
  collaboration_invite_link_copied: "invited",
  collaboration_invite_email_sent: "invited",
  collaboration_invite_email_delivery_failed: "system",
  collaboration_invite_revoked: "invited",
  collaboration_invite_accepted: "invited",
};

function readRawEventType(activity: ActivityViewModel) {
  return activity.raw?.eventType?.trim() ?? "";
}

function bucketFromAction(activity: ActivityViewModel): ProjectActivityConcreteActionBucket {
  switch (activity.action) {
    case "added":
    case "created":
    case "inserted_template":
      return "created";
    case "changed":
    case "renamed":
    case "replaced":
      return "edited";
    case "deleted":
    case "removed":
      return "deleted";
    case "reorganized":
      return "reordered";
    case "sent":
    case "resent":
      return "shared";
    case "commented":
      return "commented";
    case "approved":
    case "declined":
    case "requested_revision":
      return "decided";
    case "invited":
      return "invited";
    case "password_attempted":
    case "viewed":
      return "viewed";
    default:
      return "system";
  }
}

export function isProjectActivityActionBucket(value: string): value is ProjectActivityActionBucket {
  return PROJECT_ACTIVITY_ACTION_BUCKETS.includes(value as ProjectActivityActionBucket);
}

export function isProjectActivityConcreteActionBucket(value: string): value is ProjectActivityConcreteActionBucket {
  return concreteBuckets.has(value as ProjectActivityActionBucket);
}

export function deriveActionBucket(activity: ActivityViewModel): ProjectActivityConcreteActionBucket {
  const rawEventType = readRawEventType(activity);

  if (activity.source === "estimate") {
    return estimateEventBuckets[rawEventType] ?? bucketFromAction(activity);
  }
  if (activity.source === "comment") return "commented";
  if (activity.source === "decision") return "decided";
  if (activity.source === "share") {
    return publicationEventBuckets[rawEventType] ?? sharedEventBuckets[rawEventType] ?? bucketFromAction(activity);
  }
  if (activity.source === "system") {
    return collaborationEventBuckets[rawEventType] ?? bucketFromAction(activity);
  }

  return bucketFromAction(activity);
}

export function matchesActionFilter(activity: ActivityViewModel, selected: readonly ProjectActivityActionBucket[] | null | undefined) {
  if (!selected?.length || selected.includes("all")) return true;
  return selected.includes(deriveActionBucket(activity));
}
