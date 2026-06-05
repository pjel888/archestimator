import type { ActivityAudience, ActivityTarget, ActivityViewModel } from "./types";
import { stripUnsafeText } from "./activity-formatters";

function clientSafeTarget(target: ActivityTarget): ActivityTarget {
  return {
    kind: target.kind,
    label: stripUnsafeText(target.label, "Item"),
    secondaryLabel: target.secondaryLabel ? stripUnsafeText(target.secondaryLabel, "Context") : undefined,
  };
}

function toBase36Hash(value: string, seed: number) {
  let hash = seed;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(36).padStart(7, "0");
}

function clientSafeActivityId(activity: ActivityViewModel) {
  const seed = `activity:${activity.source}:${activity.id}:${activity.occurredAt}`;
  const digest = `${toBase36Hash(seed, 2166136261)}${toBase36Hash(seed, 2166136261 ^ 0x9e3779b9)}`;
  return `activity_${activity.source}_${digest}`;
}

export function toClientSafeActivity(activity: ActivityViewModel): ActivityViewModel {
  const withoutRaw: Omit<ActivityViewModel, "raw"> = { ...activity };
  delete (withoutRaw as Partial<ActivityViewModel>).raw;
  return {
    ...withoutRaw,
    id: clientSafeActivityId(activity),
    audience: "client",
    visibility: activity.visibility === "internal" ? "owner" : activity.visibility,
    actor: {
      kind: activity.actor.kind === "user" || activity.actor.kind === "recipient" ? "client" : activity.actor.kind,
      displayName: stripUnsafeText(activity.actor.isSafeForClient ? activity.actor.displayName : "Client", "Client"),
      isSafeForClient: true,
    },
    target: clientSafeTarget(activity.target),
    title: stripUnsafeText(activity.title, "Activity recorded."),
    summary: activity.summary ? stripUnsafeText(activity.summary, "Activity details updated.") : undefined,
    body: activity.body ? stripUnsafeText(activity.body, "Comment") : undefined,
    badges: activity.badges?.map((badge) => stripUnsafeText(badge, "Note")),
    facts: activity.facts?.map((fact) => ({
      label: stripUnsafeText(fact.label, "Detail"),
      value: fact.value ? stripUnsafeText(fact.value, "Available") : undefined,
      previous: fact.previous ? stripUnsafeText(fact.previous, "Previous") : undefined,
      current: fact.current ? stripUnsafeText(fact.current, "Current") : undefined,
    })),
    changes: activity.changes?.map((change) => ({ field: change.field, label: change.label, previous: change.previous, current: change.current })),
  };
}

export function filterActivityForVisibility(events: ActivityViewModel[], audience: ActivityAudience): ActivityViewModel[] {
  if (audience === "client") return events.filter((event) => event.visibility !== "internal").map(toClientSafeActivity);
  return events;
}
