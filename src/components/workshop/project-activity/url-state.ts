import { isUuid } from "@/lib/ids";
import {
  isProjectActivityConcreteActionBucket,
  type ProjectActivityConcreteActionBucket,
} from "./action-classes";

export type ActivityPageScope =
  | { kind: "whole-project" }
  | { kind: "project-only" }
  | { kind: "estimate"; estimateId: string };

export type ActivityPageState = {
  scope: ActivityPageScope;
  actions: ProjectActivityConcreteActionBucket[];
  actor: string | "me" | null;
  client: string | null;
};

export const DEFAULT_ACTIVITY_PAGE_STATE: ActivityPageState = {
  scope: { kind: "whole-project" },
  actions: [],
  actor: null,
  client: null,
};

function firstSearchParam(params: URLSearchParams, key: string) {
  return params.getAll(key).find((value) => value.trim().length > 0) ?? null;
}

export function parseActivityScope(value: string | null): ActivityPageScope {
  if (!value || value === "whole-project") return { kind: "whole-project" };
  if (value === "project-only") return { kind: "project-only" };
  if (value.startsWith("estimate:")) {
    const estimateId = value.slice("estimate:".length);
    if (isUuid(estimateId)) return { kind: "estimate", estimateId };
  }
  return { kind: "whole-project" };
}

export function serializeActivityScope(scope: ActivityPageScope) {
  if (scope.kind === "estimate") return `estimate:${scope.estimateId}`;
  return scope.kind;
}

function parseActions(value: string | null): ProjectActivityConcreteActionBucket[] {
  if (!value) return [];
  const seen = new Set<ProjectActivityConcreteActionBucket>();
  for (const part of value.split(",")) {
    const action = part.trim();
    if (isProjectActivityConcreteActionBucket(action) && !seen.has(action)) {
      seen.add(action);
    }
  }
  return Array.from(seen);
}

function parseActor(value: string | null) {
  if (!value) return null;
  if (value === "me") return "me";
  return isUuid(value) ? value : null;
}

function parseUuidParam(value: string | null) {
  return value && isUuid(value) ? value : null;
}

export function parseActivityUrlSearchParams(params: URLSearchParams): ActivityPageState {
  return {
    scope: parseActivityScope(firstSearchParam(params, "scope")),
    actions: parseActions(firstSearchParam(params, "action")),
    actor: parseActor(firstSearchParam(params, "actor")),
    client: parseUuidParam(firstSearchParam(params, "client")),
  };
}

export function serializeActivityPageState(state: ActivityPageState): URLSearchParams {
  const params = new URLSearchParams();
  const scope = serializeActivityScope(state.scope);
  if (scope !== "whole-project") params.set("scope", scope);
  if (state.actions.length) params.set("action", state.actions.join(","));
  if (state.actor) params.set("actor", state.actor);
  if (state.client) params.set("client", state.client);
  return params;
}
