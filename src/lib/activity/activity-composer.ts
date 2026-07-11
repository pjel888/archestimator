import { DECISION_ACTIONS, ESTIMATE_EVENT_ACTIONS } from "./activity-copy-dictionary";
import { createFallbackActivityViewModel, safeCompose } from "./activity-fallback";
import { filterActivityForVisibility } from "./activity-visibility";
import { formatActivityActor, formatActivityFieldLabel, formatActivityValue, stripUnsafeText } from "./activity-formatters";
import { filterMapBy } from "@/lib/util/array";
import type { ActivityAction, ActivityChange, ActivityFact, ActivitySource, ActivityTarget, ActivityViewModel, CollaborationActivityInput, ComposeActivityOptions, EstimateActivityInput, SharedLinkActivityInput } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return stripUnsafeText(value, "Item");
  }
  return "Item";
}

function readOptionalString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return stripUnsafeText(value, "");
  }
  return "";
}

function snapshot(value: unknown): Record<string, unknown> {
  if (isRecord(value)) {
    if (isRecord(value.changed)) return value.changed;
    return value;
  }
  return {};
}

function readNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function readArrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function isVisibleEstimateChangeField(field: string) {
  return !["row", "rows", "tree", "tabs", "metadata", "sourceLibraryItemId", "sourceSnapshot"].includes(field);
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 }).format(count)} ${count === 1 ? singular : plural}`;
}

function formatSignedTotalDelta(totalDelta: number) {
  if (Math.abs(totalDelta) < 0.005) return "No total cost change";
  const direction = totalDelta > 0 ? "increased" : "decreased";
  return `Total ${direction} by ${formatActivityValue("totalDelta", Math.abs(totalDelta))}`;
}

function sentenceFromParts(parts: readonly string[]) {
  return parts.filter(Boolean).join("; ");
}

// Single source of truth for blank-row labels: the estimate-sheet UI and the
// audit composer must agree or activity entries drift from what rows display.
export const BLANK_ESTIMATE_ROW_COMPONENT_LABEL = "Drag or add a component here";
export const BLANK_ESTIMATE_ROW_AUDIT_LABEL = "Empty row slot";

function rowMaterial(event: EstimateActivityInput) {
  const oldData = snapshot(event.oldSnapshot);
  const newData = snapshot(event.newSnapshot);
  const material = readString(event.rowContext?.material, newData.material, newData.name, oldData.material, oldData.name, "row");
  return material === BLANK_ESTIMATE_ROW_COMPONENT_LABEL ? BLANK_ESTIMATE_ROW_AUDIT_LABEL : material;
}

function nodeName(event: EstimateActivityInput) {
  const oldData = snapshot(event.oldSnapshot);
  const newData = snapshot(event.newSnapshot);
  return readString(newData.name, oldData.name, event.payload?.name, event.rowContext?.nodeName, "area");
}

function targetForEstimate(event: EstimateActivityInput): ActivityTarget {
  if (event.targetRowId) return { id: event.targetRowId, kind: "row", label: rowMaterial(event), secondaryLabel: readString(event.rowContext?.nodePath, event.rowContext?.areaName, "Estimate row") };
  if (event.estimateNodeId) return { id: event.estimateNodeId, kind: "node", label: nodeName(event) };
  if (event.eventType.startsWith("tab_") || event.eventType === "tabs_reordered") {
    const tabId = event.estimateTabId ?? (typeof event.payload?.estimateTabId === "string" ? event.payload.estimateTabId : undefined);
    return { id: tabId ?? undefined, kind: "tab", label: readString(event.payload?.name, event.payload?.tabName, "Estimate tab") };
  }
  return { kind: "sheet", label: readString(event.payload?.estimateName, event.payload?.sheetCode, "Estimate") };
}

function changesForEstimate(event: EstimateActivityInput): ActivityChange[] {
  const oldData = snapshot(event.oldSnapshot);
  const newData = snapshot(event.newSnapshot);
  return (event.changedFields ?? [])
    .filter(isVisibleEstimateChangeField)
    .slice(0, 8)
    .map((field) => ({
      field,
      label: formatActivityFieldLabel(field),
      previous: formatActivityValue(field, oldData[field]),
      current: formatActivityValue(field, newData[field]),
      rawPrevious: oldData[field],
      rawCurrent: newData[field],
    }));
}

function changedFieldLabelsForTitle(event: EstimateActivityInput) {
  return filterMapBy(
    event.changedFields ?? [],
    isVisibleEstimateChangeField,
    (field) => formatActivityFieldLabel(field).toLowerCase(),
  );
}

function factsForEstimate(event: EstimateActivityInput): ActivityFact[] {
  const facts: ActivityFact[] = [];
  if (event.totalDelta !== null && event.totalDelta !== undefined) facts.push({ label: "Total change", value: formatActivityValue("totalDelta", event.totalDelta) });
  const visibleFields = (event.changedFields ?? []).filter(isVisibleEstimateChangeField);
  if (visibleFields.length) facts.push({ label: "Affected fields", value: visibleFields.map(formatActivityFieldLabel).join(", ") });
  return facts;
}

function readableChangeDetails(changes: readonly ActivityChange[]) {
  return changes
    .filter((change) => change.previous !== change.current)
    .slice(0, 3)
    .map((change) => `${change.label} from ${change.previous ?? "not set"} to ${change.current ?? "not set"}`);
}

function rowLocationLabel(event: EstimateActivityInput) {
  return readOptionalString(event.rowContext?.nodePath, event.rowContext?.areaName, event.rowContext?.nodeName);
}

function rowSummary(event: EstimateActivityInput, changes: readonly ActivityChange[]) {
  const location = rowLocationLabel(event);
  const delta = typeof event.totalDelta === "number" ? formatSignedTotalDelta(event.totalDelta) : "";

  if (event.eventType === "row_updated") {
    return sentenceFromParts([
      ...readableChangeDetails(changes),
      delta,
      location ? `Located in ${location}` : "",
    ]) || "Row details changed.";
  }

  const material = rowMaterial(event);
  if (event.eventType === "row_added" || event.eventType === "row_blank_added") {
    return sentenceFromParts([
      material && material !== "row" ? `Added ${material}` : "Added a row",
      location ? `to ${location}` : "",
      delta,
    ]);
  }

  if (event.eventType === "row_deleted") {
    return sentenceFromParts([
      material && material !== "row" ? `Removed ${material}` : "Removed a row",
      location ? `from ${location}` : "",
      delta,
    ]);
  }

  if (event.eventType === "row_unlinked") {
    return sentenceFromParts([
      ...readableChangeDetails(changes),
      location ? `Located in ${location}` : "",
    ]) || "Detached row from the cost library.";
  }

  if (event.eventType === "row_replaced") {
    const oldData = snapshot(event.oldSnapshot);
    const newData = snapshot(event.newSnapshot);
    return sentenceFromParts([
      `Replaced ${readString(oldData.material, oldData.name, "previous item")} with ${readString(newData.material, newData.name, material)}`,
      location ? `in ${location}` : "",
      delta,
    ]);
  }

  return "";
}

function treeSummary(event: EstimateActivityInput) {
  const payload = event.payload ?? {};
  const updatedCount = readNumber(payload.updatedCount);
  const affectedCount = updatedCount ?? (readArrayLength(payload.moves) || readArrayLength(payload.moveUpdates));
  const countSummary = affectedCount ? `Reordered ${pluralize(affectedCount, "tree item")}` : "Reordered the estimate tree";
  return countSummary;
}

function templateSummary(event: EstimateActivityInput) {
  const payload = event.payload ?? {};
  const nodeCount = readNumber(payload.insertedNodeCount ?? payload.inserted_node_count ?? payload.nodeCount);
  const rowCount = readNumber(payload.insertedRowItemCount ?? payload.inserted_row_item_count ?? payload.rowCount ?? payload.insertedCount);
  const rootIds = readStringArray(payload.inserted_root_node_ids ?? payload.insertedRootNodeIds);
  return sentenceFromParts([
    rootIds.length ? `Created ${pluralize(rootIds.length, "root area")}` : "",
    nodeCount !== null ? `Copied ${pluralize(nodeCount, "tree item")}` : "",
    rowCount !== null ? `Added ${pluralize(rowCount, "estimate row")}` : "",
  ]) || "Inserted template content into the estimate.";
}

function nodeSummary(event: EstimateActivityInput) {
  const payload = event.payload ?? {};
  const kind = readString(payload.kind, "");
  const reorderedCount = readNumber(payload.reorderedSiblingCount);
  const deletedNodeCount = readNumber(payload.deletedNodeCount);
  const deletedRowCount = readNumber(payload.deletedRowCount);
  const delta = typeof event.totalDelta === "number" ? formatSignedTotalDelta(event.totalDelta) : "";

  if (event.eventType === "node_created") {
    return sentenceFromParts([
      kind ? `Created as ${kind === "group" ? "a group" : "an area"}` : "",
      reorderedCount !== null && reorderedCount > 1 ? `Refreshed ${pluralize(reorderedCount, "sibling position")}` : "",
    ]) || "Created a new estimate tree item.";
  }

  if (event.eventType === "node_deleted_with_children") {
    return sentenceFromParts([
      deletedNodeCount !== null ? `Removed ${pluralize(deletedNodeCount, "tree item")}` : "",
      deletedRowCount !== null ? `Deleted ${pluralize(deletedRowCount, "estimate row")}` : "",
      delta,
    ]) || "Deleted an estimate tree item and its rows.";
  }

  return "";
}

function tabSummary(event: EstimateActivityInput, changes: readonly ActivityChange[]) {
  const payload = event.payload ?? {};
  const updatedCount = readNumber(payload.updatedCount);
  const insertedNodeCount = readNumber(payload.insertedNodeCount);
  const insertedRowCount = readNumber(payload.insertedRowItemCount);

  if (event.eventType === "tabs_reordered" || event.eventType === "tab_reordered") {
    return updatedCount ? `Reordered ${pluralize(updatedCount, "tab")}.` : "Reordered estimate tabs.";
  }

  if (event.eventType === "tab_duplicated") {
    return sentenceFromParts([
      insertedNodeCount !== null ? `Copied ${pluralize(insertedNodeCount, "tree item")}` : "",
      insertedRowCount !== null ? `Copied ${pluralize(insertedRowCount, "estimate row")}` : "",
    ]) || "Copied tab contents.";
  }

  return readableChangeDetails(changes).join("; ");
}

function estimateSummary(event: EstimateActivityInput, changes: readonly ActivityChange[]) {
  if (event.eventType.startsWith("row_")) return rowSummary(event, changes);
  if (event.eventType === "tree_reordered" || event.eventType === "nodes_reordered") return treeSummary(event);
  if (event.eventType === "template_inserted" || event.eventType === "project_source_inserted") return templateSummary(event);
  if (event.eventType.startsWith("node_")) return nodeSummary(event);
  if (event.eventType.startsWith("tab_") || event.eventType === "tabs_reordered") return tabSummary(event, changes);
  if (event.eventType === "sheet_metadata_updated") return readableChangeDetails(changes).join("; ") || "Estimate metadata changed.";
  if (event.eventType === "sheet_code_updated") return readableChangeDetails(changes).join("; ") || "Estimate code changed.";
  if (changes.length) return readableChangeDetails(changes).join("; ");
  return undefined;
}

function estimateTitle(event: EstimateActivityInput, actor: string, target: ActivityTarget) {
  const oldData = snapshot(event.oldSnapshot);
  const newData = snapshot(event.newSnapshot);
  const material = rowMaterial(event);
  switch (event.eventType) {
    case "row_updated":
      return `${actor} changed ${changedFieldLabelsForTitle(event).join(", ") || "details"} for ${material}.`;
    case "row_added":
      return `${actor} added ${material} to the estimate.`;
    case "row_blank_added":
      return `${actor} added an empty row slot.`;
    case "row_deleted":
      return `${actor} removed ${material} from the estimate.`;
    case "rows_bulk_deleted":
      return `${actor} removed multiple rows from the estimate.`;
    case "rows_moved":
      return `${actor} moved estimate rows.`;
    case "row_component_moved":
      return `${actor} moved ${material} within the estimate.`;
    case "row_replaced":
      return `${actor} replaced ${readString(oldData.material, oldData.name, "the previous item")} with ${readString(newData.material, newData.name, material)}.`;
    case "row_unlinked":
      return `${actor} detached ${material} from the cost library.`;
    case "template_inserted":
      return `${actor} inserted ${readString(event.payload?.templateName, event.payload?.name, newData.name, "template rows")}.`;
    case "project_source_inserted":
      return `${actor} inserted project source content.`;
    case "project_estimate_package_applied":
      return `${actor} applied an estimate package.`;
    case "row_promoted_to_library":
      return `${actor} promoted ${material} to the cost library.`;
    case "sheet_code_updated":
      return `${actor} changed estimate code from ${formatActivityValue("sheetCode", oldData.sheetCode)} to ${formatActivityValue("sheetCode", newData.sheetCode)}.`;
    case "sheet_metadata_updated":
      return `${actor} updated estimate details.`;
    case "sheet_adjustment_updated":
      return `${actor} updated the estimate adjustment.`;
    case "sheet_version_created":
      return `${actor} created a version snapshot.`;
    case "sheet_restored_as_copy":
      return `${actor} restored a version as a copy.`;
    case "node_created":
      return `${actor} created ${target.label}.`;
    case "node_renamed":
      return `${actor} renamed ${readString(oldData.name, "the area")} to ${readString(newData.name, target.label)}.`;
    case "node_deleted_with_children":
      return `${actor} deleted ${target.label} and its contents.`;
    case "nodes_restored":
      return `${actor} restored estimate tree content.`;
    case "nodes_reordered":
    case "tree_reordered":
      return `${actor} reorganized the estimate tree.`;
    case "tab_created":
      return `${actor} created tab ${target.label}.`;
    case "tab_renamed":
      return `${actor} renamed tab ${readString(oldData.name, "the previous tab")} to ${target.label}.`;
    case "tab_reordered":
    case "tabs_reordered":
      return `${actor} reordered estimate tabs.`;
    case "tab_duplicated":
      return `${actor} duplicated tab ${target.label}.`;
    case "tab_archived":
      return `${actor} archived tab ${target.label}.`;
    case "tab_deleted":
      return `${actor} deleted tab ${target.label}.`;
    default:
      return `${actor} recorded estimate activity.`;
  }
}

function fallbackEstimateSummary(event: EstimateActivityInput) {
  if (ESTIMATE_EVENT_ACTIONS[event.eventType]) return undefined;
  return "This estimate event is preserved but not mapped to detailed copy yet.";
}

function sanitizeViewModel(activity: ActivityViewModel): ActivityViewModel {
  return {
    ...activity,
    title: stripUnsafeText(activity.title, "Activity recorded."),
    summary: activity.summary ? stripUnsafeText(activity.summary, "Activity details updated.") : undefined,
    body: activity.body ? stripUnsafeText(activity.body, "Comment") : undefined,
    actor: { ...activity.actor, displayName: stripUnsafeText(activity.actor.displayName, "Unknown user") },
    target: { ...activity.target, label: stripUnsafeText(activity.target.label, "Item"), secondaryLabel: activity.target.secondaryLabel ? stripUnsafeText(activity.target.secondaryLabel, "Context") : undefined },
    badges: activity.badges?.map((badge) => stripUnsafeText(badge, "Note")),
  };
}

function deltaForEstimate(totalDelta: number) {
  return {
    value: totalDelta,
    formatted: formatActivityValue("totalDelta", totalDelta),
    kind: totalDelta > 0 ? "increase" as const : totalDelta < 0 ? "decrease" as const : "neutral" as const,
  };
}

export function composeEstimateActivity(event: EstimateActivityInput, opts: ComposeActivityOptions = {}): ActivityViewModel {
  return safeCompose(() => {
    const audience = opts.audience ?? "owner";
    const visibility = opts.visibility ?? "owner";
    const action = ESTIMATE_EVENT_ACTIONS[event.eventType] ?? "recorded";
    const actor = formatActivityActor(event.actorUserId, event.actorLabel, audience);
    const target = targetForEstimate(event);
    const changes = changesForEstimate(event);
    const summary = estimateSummary(event, changes) ?? fallbackEstimateSummary(event);
    const base: ActivityViewModel = sanitizeViewModel({
      id: event.id,
      source: "estimate",
      audience,
      visibility,
      action,
      occurredAt: event.createdAt,
      actor,
      target,
      title: estimateTitle(event, actor.displayName, target),
      summary,
      changes,
      facts: factsForEstimate(event),
      delta: event.totalDelta !== null && event.totalDelta !== undefined ? deltaForEstimate(event.totalDelta) : undefined,
      raw: audience === "client" ? undefined : { id: event.id, eventType: event.eventType, eventSource: event.eventSource, correlationId: event.correlationId ?? undefined, payload: event.payload },
    });
    return audience === "client" ? filterActivityForVisibility([base], "client")[0] ?? createFallbackActivityViewModel(event.id, event.createdAt, event.eventType) : base;
  }, createFallbackActivityViewModel(event.id, event.createdAt, event.eventType)) as ActivityViewModel;
}

function sharedActor(item: SharedLinkActivityInput, opts: ComposeActivityOptions) {
  const label = opts.recipientDisplayName ?? item.recipientDisplayName ?? item.author ?? "Client";
  if (item.is_internal) return formatActivityActor(undefined, label || "Project owner", "owner");
  if (opts.audience === "client") return { kind: "client" as const, displayName: stripUnsafeText(label, "Client"), isSafeForClient: true };
  return { kind: "recipient" as const, displayName: stripUnsafeText(label, "Client"), isSafeForClient: true };
}

function sourceForShared(item: SharedLinkActivityInput): ActivitySource {
  if (item.type === "comment") return "comment";
  if (item.type === "decision") return "decision";
  return "share";
}

function sharedTargetKind(value: unknown): ActivityTarget["kind"] {
  if (value === "row" || value === "estimate" || value === "proposal") return value;
  return "proposal";
}

function targetForShared(metadata: Record<string, unknown>): ActivityTarget {
  const kind = sharedTargetKind(metadata.targetKind ?? metadata.target_kind);
  const label = readString(metadata.targetLabel, metadata.target_label, metadata.estimateName, metadata.areaName, kind === "proposal" ? "Proposal" : "Item");
  const secondaryLabel = readOptionalString(metadata.targetSecondaryLabel, metadata.target_secondary_label);
  return {
    kind,
    label,
    ...(secondaryLabel ? { secondaryLabel } : {}),
  };
}

function isProposalTarget(target: ActivityTarget) {
  return target.kind === "proposal" || /^the proposal$/i.test(target.label) || /^proposal$/i.test(target.label);
}

function sharedDecisionObjectLabel(target: ActivityTarget) {
  return isProposalTarget(target) ? "the proposal" : target.label;
}

export function composeSharedLinkActivity(item: SharedLinkActivityInput, opts: ComposeActivityOptions = {}): ActivityViewModel {
  return safeCompose(() => {
    const audience = opts.audience ?? "owner";
    const visibility = item.is_internal ? "internal" : opts.visibility ?? "owner";
    const actor = sharedActor(item, opts);
    const metadata = item.metadata ?? {};
    let action: ActivityViewModel["action"] = "recorded";
    let title = "Shared activity recorded.";
    const body = item.body ? stripUnsafeText(item.body, "Comment") : undefined;
    const target = targetForShared(metadata);
    const badges: string[] = [];

    if (item.type === "comment") {
      action = "commented";
      if (item.is_internal) badges.push("Internal");
      title = item.is_internal ? `${actor.displayName} added an internal note.` : `${actor.displayName} commented on ${target.label}.`;
    } else if (item.type === "decision") {
      action = DECISION_ACTIONS[item.decision ?? ""] ?? "recorded";
      const objectLabel = sharedDecisionObjectLabel(target);
      if (action === "approved") title = `${actor.displayName} approved ${objectLabel}.`;
      else if (action === "requested_revision") title = isProposalTarget(target)
        ? `${actor.displayName} requested revisions.`
        : `${actor.displayName} requested revisions for ${objectLabel}.`;
      else if (action === "declined") title = `${actor.displayName} declined ${objectLabel}.`;
      else title = "Shared decision recorded.";
    } else if (item.type === "event") {
      const eventType = String(metadata.eventType ?? metadata.event_type ?? "");
      if (eventType === "open") {
        action = "viewed";
        title = `${actor.displayName} viewed the proposal.`;
      } else if (eventType === "password_attempt") {
        action = "password_attempted";
        title = `${actor.displayName} entered the shared link password.`;
      } else {
        title = "Shared link activity recorded.";
      }
    }

    const facts = Object.entries(metadata)
      .filter(([key]) => !/[Ii]d$|event_?type|metadata_json|ip_?hash|user_?agent_?hash|raw_?ip|raw_?user_?agent|target_?kind|target_?label|target_?secondary_?label/i.test(key))
      .slice(0, 8)
      .map(([key, value]) => ({ label: formatActivityFieldLabel(key), value: formatActivityValue(key, value) }));

    const base = sanitizeViewModel({
      id: item.id,
      source: sourceForShared(item),
      audience,
      visibility,
      action,
      occurredAt: item.created_at,
      actor,
      target,
      title,
      body,
      badges,
      facts,
      raw: audience === "client" ? undefined : { id: item.id, eventType: item.decision ?? String(metadata.eventType ?? metadata.event_type ?? item.type), payload: metadata },
    });
    return audience === "client" ? filterActivityForVisibility([base], "client")[0] ?? createFallbackActivityViewModel(item.id, item.created_at) : base;
  }, createFallbackActivityViewModel(item.id, item.created_at, item.type)) as ActivityViewModel;
}

const COLLABORATION_EVENT_ACTIONS: Record<string, ActivityAction> = {
  invite_email_attempted: "invited",
  role_changed: "changed",
  member_removed: "removed",
  project_metadata_updated: "changed",
};

function collaborationActionAndTitle(
  event: CollaborationActivityInput,
  actorName: string,
): { action: ActivityAction; title: string } {
  const metadata = isRecord(event.metadata) ? event.metadata : {};
  switch (event.eventType) {
    case "invite_email_attempted":
      return { action: "invited", title: `${actorName} invited a collaborator.` };
    case "role_changed":
      return { action: "changed", title: `${actorName} changed a collaborator's role.` };
    case "member_removed":
      return { action: "removed", title: `${actorName} removed a collaborator.` };
    case "project_metadata_updated": {
      const changed = Array.isArray(metadata.changed_fields) ? metadata.changed_fields.map(String) : [];
      if (changed.length === 1 && changed[0] === "name") {
        return { action: "renamed", title: `${actorName} renamed the project.` };
      }
      const fieldList = changed.map((field) => formatActivityFieldLabel(field).toLowerCase()).join(", ");
      return {
        action: COLLABORATION_EVENT_ACTIONS[event.eventType] ?? "recorded",
        title: fieldList ? `${actorName} updated project ${fieldList}.` : `${actorName} updated project details.`,
      };
    }
    default:
      return { action: COLLABORATION_EVENT_ACTIONS[event.eventType] ?? "recorded", title: `${actorName} recorded project activity.` };
  }
}

/**
 * Compose a collaboration / project-metadata audit event into the shared activity
 * view-model (R11). Renders invites, role changes, removals, and project edits as
 * actor · verb · object, reusing the same actor formatting and XSS-safe sanitizer
 * as the estimate and shared-link composers so the project feed reads as one
 * surface (R14).
 */
export function composeCollaborationActivity(
  event: CollaborationActivityInput,
  opts: ComposeActivityOptions = {},
): ActivityViewModel {
  return safeCompose(() => {
    const audience = opts.audience ?? "owner";
    const visibility = opts.visibility ?? "owner";
    const actor = formatActivityActor(event.actorUserId, event.actorLabel, audience);
    const { action, title } = collaborationActionAndTitle(event, actor.displayName);

    const base: ActivityViewModel = sanitizeViewModel({
      id: event.id,
      source: "system",
      audience,
      visibility,
      action,
      occurredAt: event.createdAt,
      actor,
      target: { kind: "system", label: "Project" },
      title,
      raw: audience === "client" ? undefined : { id: event.id, eventType: event.eventType, payload: event.metadata ?? undefined },
    });

    return audience === "client"
      ? filterActivityForVisibility([base], "client")[0] ?? createFallbackActivityViewModel(event.id, event.createdAt, event.eventType)
      : base;
  }, createFallbackActivityViewModel(event.id, event.createdAt, event.eventType)) as ActivityViewModel;
}
