import { describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
  D1Value,
} from "@/lib/cloudflare/d1";
import {
  recordProjectCommitmentEvent,
  type ProjectCommitmentEventInput,
} from "@/lib/project-ledger/event-service";

type CapturedStatement = {
  sql: string;
  values: D1Value[];
};

type ExistingEventRow = {
  actor_domain_role_snapshot: string | null;
  actor_id: string;
  actor_name_snapshot: string | null;
  actor_permission_role_snapshot: string | null;
  actor_type: string;
  artifact_id: string | null;
  artifact_version_id: string | null;
  baseline_id: string | null;
  causation_event_id: string | null;
  client_safe_snapshot_json: string;
  correlation_id: string;
  created_at: string;
  decision_id: string | null;
  event_type: string;
  id: string;
  internal_metadata_json: string;
  issue_id: string | null;
  legacy_publication_id: string | null;
  occurred_at: string;
  origin_portal_id: string | null;
  project_id: string;
  request_id: string | null;
  request_version_id: string | null;
  root_request_id: string | null;
  source_id: string;
  source_type: string;
  source_version_id: string | null;
  summary: string | null;
  title: string;
  workspace_id: string;
};

type ExistingExposureRow = {
  event_id: string;
  exposed_at: string;
  exposed_by_actor_id: string;
  exposed_by_actor_type: string;
  exposure_kind: string;
  policy_snapshot_json: string;
  portal_id: string;
  public_event_id: string;
  status: string;
};

class FakeStatement<T = Record<string, unknown>> implements D1PreparedStatementLike<T> {
  values: D1Value[] = [];

  constructor(
    readonly sql: string,
    private readonly firstResult: () => unknown,
  ) {}

  bind(...values: D1Value[]) {
    this.values = values;
    return this;
  }

  async first<R = T>() {
    return this.firstResult() as R | null;
  }

  async all<R = T>(): Promise<D1Result<R>> {
    return { results: [], success: true };
  }

  async run(): Promise<D1Result<T>> {
    return { meta: { changes: 1 }, success: true };
  }
}

function fakeDatabase(options: {
  batchError?: Error;
  batchResults?: D1Result[];
  firstResults?: unknown[];
} = {}) {
  const batches: CapturedStatement[][] = [];
  const firstResults = [...(options.firstResults ?? [])];
  const database: D1DatabaseLike = {
    prepare<T = Record<string, unknown>>(sql: string) {
      return new FakeStatement<T>(sql, () => firstResults.shift() ?? null);
    },
    async batch(statements) {
      batches.push(
        statements.map((entry) => {
          const captured = entry as FakeStatement;
          return { sql: captured.sql, values: captured.values };
        }),
      );
      if (options.batchError) throw options.batchError;
      return options.batchResults ?? statements.map(() => ({ meta: { changes: 1 }, success: true }));
    },
  };
  return { batches, database };
}

const timestamp = "2026-07-27T02:00:00.000Z";

function input(
  overrides: Partial<ProjectCommitmentEventInput> = {},
): ProjectCommitmentEventInput {
  return {
    actor: {
      actorId: "user_1",
      actorType: "internal_user",
      domainRoleSnapshot: "project_manager",
      nameSnapshot: "Project Manager",
      permissionRoleSnapshot: "admin",
    },
    clientSafeSnapshot: {
      label: "Drawing A",
      status: "published",
    },
    correlationId: "publish-artifact:artifact_1:v1",
    database: fakeDatabase().database,
    eventId: "event_1",
    eventType: "artifact_published",
    internalMetadata: {
      privateStorageKey: "project-artifacts/workspace_1/project_1/private.pdf",
    },
    occurredAt: timestamp,
    originPortalId: "portal_1",
    projectId: "project_1",
    source: {
      artifactId: "artifact_1",
      artifactVersionId: "artifact_version_1",
      sourceType: "artifact",
    },
    summary: "Drawing A was published.",
    title: "Drawing published",
    workspaceId: "workspace_1",
    ...overrides,
  };
}

function existingEvent(): ExistingEventRow {
  return {
    actor_domain_role_snapshot: "project_manager",
    actor_id: "user_1",
    actor_name_snapshot: "Project Manager",
    actor_permission_role_snapshot: "admin",
    actor_type: "internal_user",
    artifact_id: "artifact_1",
    artifact_version_id: "artifact_version_1",
    baseline_id: null,
    causation_event_id: null,
    client_safe_snapshot_json: '{"label":"Drawing A","status":"published"}',
    correlation_id: "publish-artifact:artifact_1:v1",
    created_at: timestamp,
    decision_id: null,
    event_type: "artifact_published",
    id: "event_1",
    internal_metadata_json:
      '{"privateStorageKey":"project-artifacts/workspace_1/project_1/private.pdf"}',
    issue_id: null,
    legacy_publication_id: null,
    occurred_at: timestamp,
    origin_portal_id: "portal_1",
    project_id: "project_1",
    request_id: null,
    request_version_id: null,
    root_request_id: null,
    source_id: "artifact_1",
    source_type: "artifact",
    source_version_id: "artifact_version_1",
    summary: "Drawing A was published.",
    title: "Drawing published",
    workspace_id: "workspace_1",
  };
}

function existingExposure(): ExistingExposureRow {
  return {
    event_id: "event_1",
    exposed_at: timestamp,
    exposed_by_actor_id: "user_1",
    exposed_by_actor_type: "internal_user",
    exposure_kind: "automatic",
    policy_snapshot_json: '{"audience":"portal_recipients","reason":"issued_artifact"}',
    portal_id: "portal_1",
    public_event_id: "evt_public_1",
    status: "visible",
  };
}

describe("recordProjectCommitmentEvent", () => {
  it("writes the event and client-safe exposure in one required D1 batch", async () => {
    const { batches, database } = fakeDatabase({ firstResults: [null] });
    const result = await recordProjectCommitmentEvent(
      input({
        database,
        exposure: {
          exposureKind: "automatic",
          policySnapshot: {
            audience: "portal_recipients",
            reason: "issued_artifact",
          },
          portalId: "portal_1",
          publicEventId: "evt_public_1",
        },
      }),
    );

    expect(result).toEqual({
      eventId: "event_1",
      exposed: true,
      occurredAt: timestamp,
      replayed: false,
    });
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(2);
    expect(batches[0]?.[0]?.sql).toContain("INSERT INTO project_commitment_events");
    expect(batches[0]?.[0]?.sql).toContain("project_commitment_events AS cause");
    expect(batches[0]?.[1]?.sql).toContain("INSERT INTO client_portal_event_exposures");
    expect(batches[0]?.[1]?.sql).not.toContain("internal_metadata_json");
    expect(batches[0]?.[1]?.values).toContain(
      '{"audience":"portal_recipients","reason":"issued_artifact"}',
    );
    expect(batches[0]?.[1]?.values).not.toContain(
      '{"privateStorageKey":"project-artifacts/workspace_1/project_1/private.pdf"}',
    );
  });

  it("uses a single event statement when no exposure is requested", async () => {
    const { batches, database } = fakeDatabase({ firstResults: [null] });

    const result = await recordProjectCommitmentEvent(input({ database }));

    expect(result.exposed).toBe(false);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(1);
  });

  it("replays a matching event and exposure without another write", async () => {
    const { batches, database } = fakeDatabase({
      firstResults: [existingEvent(), existingExposure()],
    });

    const result = await recordProjectCommitmentEvent(
      input({
        database,
        exposure: {
          exposureKind: "automatic",
          policySnapshot: {
            audience: "portal_recipients",
            reason: "issued_artifact",
          },
          portalId: "portal_1",
          publicEventId: "evt_public_1",
        },
      }),
    );

    expect(result).toEqual({
      eventId: "event_1",
      exposed: true,
      occurredAt: timestamp,
      replayed: true,
    });
    expect(batches).toHaveLength(0);
  });

  it.each([
    "commitment event artifact ownership mismatch",
    "commitment event causation mismatch",
  ])("propagates atomic D1 rejection: %s", async (message) => {
    const databaseError = new Error(message);
    const { database } = fakeDatabase({
      batchError: databaseError,
      firstResults: [null, null],
    });

    await expect(
      recordProjectCommitmentEvent(
        input({
          causationEventId: "event_other_project",
          database,
        }),
      ),
    ).rejects.toBe(databaseError);
  });
});
