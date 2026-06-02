import type { ActivityViewModel } from "./types";

export function createFallbackActivityViewModel(id = "activity", occurredAt = new Date(0).toISOString(), rawEventType?: string): ActivityViewModel {
  return {
    id,
    source: "system",
    audience: "owner",
    visibility: "owner",
    action: "recorded",
    occurredAt,
    actor: { kind: "system", displayName: "System", isSafeForClient: true },
    target: { kind: "unknown", label: "Activity" },
    title: "Activity recorded.",
    summary: "An activity entry was recorded, but the details are not available.",
    facts: rawEventType ? [{ label: "Source", value: "Unavailable" }] : [],
    raw: rawEventType ? { id, eventType: rawEventType } : undefined,
  };
}

export function safeCompose<T extends ActivityViewModel>(compose: () => T, fallback?: ActivityViewModel): T | ActivityViewModel {
  try {
    return compose();
  } catch {
    return fallback ?? createFallbackActivityViewModel();
  }
}
