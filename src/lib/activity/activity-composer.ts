import { DECISION_ACTIONS, ESTIMATE_EVENT_ACTIONS } from "./activity-copy-dictionary";
import { createFallbackActivityViewModel, safeCompose } from "./activity-fallback";
import { filterActivityForVisibility } from "./activity-visibility";
import { formatActivityActor, formatActivityFieldLabel, formatActivityValue, stripUnsafeText } from "./activity-formatters";
import type { ActivityChange, ActivityFact, ActivitySource, ActivityTarget, ActivityViewModel, ComposeActivityOptions, EstimateActivityInput, SharedLinkActivityInput } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return stripUnsafeText(value, "Item");
  }
  return "Item";
}

function snapshot(value: unknown): Record<string, unknown> {
  if (isRecord(value)) {
    if (isRecord(value.changed)) return value.changed;
    return value;
  }
  return {};
}

const BLANK_ESTIMATE_ROW_COMPONENT_LABEL = "Drag or add a component here";
const BLANK_ESTIMATE_ROW_AUDIT_LABEL = "Empty row slot";

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
  return { kind: "sheet", label: readString(event.payload?.estimateName, event.payload?.sheetCode, "Estimate sheet") };
}

function changesForEstimate(event: EstimateActivityInput): ActivityChange[] {
  const oldData = snapshot(event.oldSnapshot);
  const newData = snapshot(event.newSnapshot);
  return (event.changedFields ?? []).slice(0, 8).map((field) => ({
    field,
    label: formatActivityFieldLabel(field),
    previous: formatActivityValue(field, oldData[field]),
    current: formatActivityValue(field, newData[field]),
    rawPrevious: oldData[field],
    rawCurrent: newData[field],
  }));
}

function factsForEstimate(event: EstimateActivityInput): ActivityFact[] {
  const facts: ActivityFact[] = [];
  if (event.totalDelta !== null && event.totalDelta !== undefined) facts.push({ label: "Total change", value: formatActivityValue("totalDelta", event.totalDelta) });
  if (event.changedFields?.length) facts.push({ label: "Affected fields", value: event.changedFields.map(formatActivityFieldLabel).join(", ") });
  return facts;
}

function estimateTitle(event: EstimateActivityInput, actor: string, target: ActivityTarget) {
  const oldData = snapshot(event.oldSnapshot);
  const newData = snapshot(event.newSnapshot);
  const material = rowMaterial(event);
  switch (event.eventType) {
    case "row_updated":
      return `${actor} changed ${event.changedFields?.map((field) => formatActivityFieldLabel(field).toLowerCase()).join(", ") || "details"} for ${material}.`;
    case "row_added":
      return `${actor} added ${material} to the estimate.`;
    case "row_blank_added":
      return `${actor} added an empty row slot.`;
    case "row_deleted":
      return `${actor} removed ${material} from the estimate.`;
    case "row_replaced":
      return `${actor} replaced ${readString(oldData.material, oldData.name, "the previous item")} with ${readString(newData.material, newData.name, material)}.`;
    case "template_inserted":
      return `${actor} inserted ${readString(event.payload?.templateName, event.payload?.name, newData.name, "template rows")}.`;
    case "sheet_code_updated":
      return `${actor} changed sheet code from ${formatActivityValue("sheetCode", oldData.sheetCode)} to ${formatActivityValue("sheetCode", newData.sheetCode)}.`;
    case "sheet_metadata_updated":
      return `${actor} updated estimate sheet details.`;
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
    case "tree_reordered":
      return `${actor} reorganized the estimate tree.`;
    default:
      return "Activity recorded.";
  }
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
      summary: changes.length ? `Updated ${changes.map((change) => change.label.toLowerCase()).join(", ")}.` : undefined,
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

export function composeSharedLinkActivity(item: SharedLinkActivityInput, opts: ComposeActivityOptions = {}): ActivityViewModel {
  return safeCompose(() => {
    const audience = opts.audience ?? "owner";
    const visibility = item.is_internal ? "internal" : opts.visibility ?? "owner";
    const actor = sharedActor(item, opts);
    const metadata = item.metadata ?? {};
    let action: ActivityViewModel["action"] = "recorded";
    let title = "Activity recorded.";
    const body = item.body ? stripUnsafeText(item.body, "Comment") : undefined;
    const target: ActivityTarget = { kind: "proposal", label: readString(metadata.targetLabel, metadata.estimateName, metadata.areaName, "Proposal") };
    const badges: string[] = [];

    if (item.type === "comment") {
      action = "commented";
      if (item.is_internal) badges.push("Internal");
      title = item.is_internal ? `${actor.displayName} added an internal note.` : `${actor.displayName} commented on ${target.label}.`;
    } else if (item.type === "decision") {
      action = DECISION_ACTIONS[item.decision ?? ""] ?? "recorded";
      if (action === "approved") title = `${actor.displayName} approved the proposal.`;
      else if (action === "requested_revision") title = `${actor.displayName} requested revisions.`;
      else if (action === "declined") title = `${actor.displayName} did not approve the proposal.`;
      else title = "Activity recorded.";
    } else if (item.type === "event") {
      const eventType = String(metadata.eventType ?? metadata.event_type ?? "");
      if (eventType === "open") {
        action = "viewed";
        title = `${actor.displayName} viewed the proposal.`;
      } else if (eventType === "password_attempt") {
        action = "password_attempted";
        title = `${actor.displayName} entered the shared link password.`;
      }
    }

    const facts = Object.entries(metadata)
      .filter(([key]) => !/[Ii]d$|event_?type|metadata_json|ip_?hash|user_?agent_?hash|raw_?ip|raw_?user_?agent/i.test(key))
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
