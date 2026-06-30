import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  acceptCollaborationInvitationTokenInD1,
  resolveCollaborationInvitationFromD1,
} from "@/lib/collaboration/invitation-d1-store";

const NOW = "2026-07-01T00:00:00.000Z";
const FUTURE = "2026-07-15T00:00:00.000Z";

type StoredInvitation = {
  accepted_at: string | null;
  accepted_via: string | null;
  created_at: string;
  email: string;
  estimate_id: string | null;
  expires_at: string;
  id: string;
  invited_by: string | null;
  invited_user_id: string | null;
  last_opened_at: string | null;
  lifecycle_state: string;
  project_id: string | null;
  revoked_at: string | null;
  role: string;
  scope: string;
  workspace_id: string;
};

type StoredToken = {
  expires_at: string;
  id: string;
  invitation_id: string;
  last_opened_at: string | null;
  revoked_at: string | null;
  token_hash: string;
  used_at: string | null;
};

class FakeD1Statement {
  private values: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first<R>() {
    const normalizedSql = this.sql.toLowerCase();
    if (normalizedSql.includes("from collaboration_invitation_tokens t")) {
      const token = this.database.findTokenByHash(String(this.values[0]));
      return (token ? this.database.toLookupRow(token) : null) as R | null;
    }
    if (normalizedSql.includes("from collaboration_invitations i") && normalizedSql.includes("where i.id = ?")) {
      const invitation = this.database.invitations.get(String(this.values[0]));
      return (invitation ? this.database.toLookupRow(null, invitation) : null) as R | null;
    }
    if (normalizedSql.includes("from project_members")) {
      const [projectId, userId] = this.values.map(String);
      return (this.database.projectMembers.get(`${projectId}:${userId}`) ?? null) as R | null;
    }
    if (normalizedSql.includes("from estimate_sheet_members")) {
      const [estimateId, userId] = this.values.map(String);
      return (this.database.estimateMembers.get(`${estimateId}:${userId}`) ?? null) as R | null;
    }
    return null;
  }

  async all<R>() {
    return { results: [] as R[] };
  }

  async run() {
    const normalizedSql = this.sql.toLowerCase();
    if (normalizedSql.includes("set lifecycle_state = 'expired'")) {
      const [now] = this.values.map(String);
      for (const invitation of this.database.invitations.values()) {
        if (
          invitation.lifecycle_state === "pending"
          && !invitation.accepted_at
          && !invitation.revoked_at
          && invitation.expires_at <= now
        ) {
          invitation.lifecycle_state = "expired";
        }
      }
    } else if (normalizedSql.includes("update collaboration_invitation_tokens") && normalizedSql.includes("set last_opened_at")) {
      const [now, tokenId] = this.values.map(String);
      const token = this.database.tokens.get(tokenId);
      if (token) token.last_opened_at = now;
    } else if (normalizedSql.includes("update collaboration_invitations") && normalizedSql.includes("set last_opened_at")) {
      const [now, invitationId] = this.values.map(String);
      const invitation = this.database.invitations.get(invitationId);
      if (invitation) invitation.last_opened_at = now;
    } else if (normalizedSql.includes("insert into project_members")) {
      const [projectId, workspaceId, userId, role, addedBy, createdAt, updatedAt] = this.values.map((value) => value === null ? null : String(value));
      this.database.projectMembers.set(`${projectId}:${userId}`, {
        added_by: addedBy,
        created_at: createdAt,
        project_id: projectId,
        role,
        updated_at: updatedAt,
        user_id: userId,
        workspace_id: workspaceId,
      });
    } else if (normalizedSql.includes("insert into estimate_sheet_members")) {
      const [estimateId, projectId, userId, role, addedBy, createdAt, updatedAt] = this.values.map((value) => value === null ? null : String(value));
      this.database.estimateMembers.set(`${estimateId}:${userId}`, {
        added_by: addedBy,
        created_at: createdAt,
        estimate_id: estimateId,
        project_id: projectId,
        role,
        updated_at: updatedAt,
        user_id: userId,
      });
    } else if (normalizedSql.includes("update collaboration_invitation_tokens") && normalizedSql.includes("set used_at")) {
      const [now, target] = this.values.map(String);
      for (const token of this.database.tokens.values()) {
        const matchesTarget = normalizedSql.includes("where id = ?")
          ? token.id === target
          : token.invitation_id === target && !token.used_at && !token.revoked_at;
        if (matchesTarget && !token.used_at) token.used_at = now;
      }
    } else if (normalizedSql.includes("update collaboration_invitations") && normalizedSql.includes("set accepted_at")) {
      const [now, userId, via, invitationId] = this.values.map(String);
      const invitation = this.database.invitations.get(invitationId);
      if (invitation) {
        invitation.accepted_at ??= now;
        invitation.invited_user_id ??= userId;
        invitation.accepted_via ??= via;
        invitation.lifecycle_state = "accepted_by_recipient";
      }
    } else if (normalizedSql.includes("insert into collaboration_audit_events")) {
      const literalEventType = normalizedSql.includes("collaboration_invite_opened")
        ? "collaboration_invite_opened"
        : null;
      this.database.auditEvents.push(literalEventType ? [...this.values, literalEventType] : [...this.values]);
    }

    return { success: true, meta: { changes: 1 } };
  }
}

class FakeD1Database {
  auditEvents: unknown[][] = [];
  estimateMembers = new Map<string, Record<string, unknown>>();
  invitations = new Map<string, StoredInvitation>();
  profiles = new Map<string, { display_name: string | null; email: string }>();
  projectMembers = new Map<string, Record<string, unknown>>();
  projects = new Map<string, { id: string; name: string; project_code: string | null }>();
  estimates = new Map<string, { id: string; name: string }>();
  tokens = new Map<string, StoredToken>();

  prepare(sql: string) {
    return new FakeD1Statement(this, sql);
  }

  findTokenByHash(tokenHash: string) {
    return [...this.tokens.values()].find((token) => token.token_hash === tokenHash) ?? null;
  }

  toLookupRow(token: StoredToken | null, explicitInvitation?: StoredInvitation) {
    const invitation = explicitInvitation ?? (token ? this.invitations.get(token.invitation_id) : null);
    if (!invitation) return null;
    const project = invitation.project_id ? this.projects.get(invitation.project_id) : null;
    const estimate = invitation.estimate_id ? this.estimates.get(invitation.estimate_id) : null;
    const inviter = invitation.invited_by ? this.profiles.get(invitation.invited_by) : null;
    return {
      estimate_id: invitation.estimate_id,
      estimate_name: estimate?.name ?? null,
      invitation_expires_at: invitation.expires_at,
      invitation_id: invitation.id,
      invitation_revoked_at: invitation.revoked_at,
      invited_by: invitation.invited_by,
      invited_email: invitation.email,
      invited_user_id: invitation.invited_user_id,
      inviter_email: inviter?.email ?? null,
      inviter_label: inviter?.display_name ?? inviter?.email ?? "Archestimator collaborator",
      lifecycle_state: invitation.lifecycle_state,
      project_code: project?.project_code ?? null,
      project_id: invitation.project_id,
      project_name: project?.name ?? null,
      role: invitation.role,
      scope: invitation.scope,
      token_expires_at: token?.expires_at ?? null,
      token_id: token?.id ?? null,
      token_revoked_at: token?.revoked_at ?? null,
      token_used_at: token?.used_at ?? null,
      workspace_id: invitation.workspace_id,
    };
  }
}

function createDatabase() {
  const database = new FakeD1Database();
  database.profiles.set("manager-user", { display_name: "Studio Partner", email: "manager@example.test" });
  database.projects.set("project-alpha", { id: "project-alpha", name: "Clinic Fit-Out", project_code: "AE-101" });
  database.estimates.set("estimate-alpha", { id: "estimate-alpha", name: "Baseline" });
  database.invitations.set("invitation-alpha", {
    accepted_at: null,
    accepted_via: null,
    created_at: "2026-06-30T00:00:00.000Z",
    email: "invitee@example.test",
    estimate_id: null,
    expires_at: FUTURE,
    id: "invitation-alpha",
    invited_by: "manager-user",
    invited_user_id: null,
    last_opened_at: null,
    lifecycle_state: "pending",
    project_id: "project-alpha",
    revoked_at: null,
    role: "viewer",
    scope: "project",
    workspace_id: "workspace-alpha",
  });
  database.tokens.set("token-alpha", {
    expires_at: FUTURE,
    id: "token-alpha",
    invitation_id: "invitation-alpha",
    last_opened_at: null,
    revoked_at: null,
    token_hash: "hash-alpha",
    used_at: null,
  });
  return database;
}

describe("Cloudflare D1 collaboration invitation store", () => {
  it("resolves active invite tokens and records the open in D1", async () => {
    const database = createDatabase();

    await expect(resolveCollaborationInvitationFromD1(database, "hash-alpha", NOW)).resolves.toMatchObject({
      state: "active",
      invitation_id: "invitation-alpha",
      project_id: "project-alpha",
      project_name: "Clinic Fit-Out",
      inviter_label: "Studio Partner",
      invited_email: "invitee@example.test",
    });

    expect(database.tokens.get("token-alpha")?.last_opened_at).toBe(NOW);
    expect(database.invitations.get("invitation-alpha")?.last_opened_at).toBe(NOW);
    expect(database.auditEvents.some((event) => event.includes("collaboration_invite_opened"))).toBe(true);
  });

  it("accepts matching accounts by token without Supabase RPCs", async () => {
    const database = createDatabase();

    await expect(
      acceptCollaborationInvitationTokenInD1(database, {
        actorEmail: " Invitee@Example.Test ",
        actorUserId: "invitee-user",
        invitationTokenHash: "hash-alpha",
        now: NOW,
      }),
    ).resolves.toMatchObject({
      data: {
        state: "accepted",
        project_id: "project-alpha",
        estimate_id: null,
      },
      error: null,
    });

    expect(database.projectMembers.get("project-alpha:invitee-user")).toMatchObject({
      role: "viewer",
      workspace_id: "workspace-alpha",
    });
    expect(database.tokens.get("token-alpha")?.used_at).toBe(NOW);
    expect(database.invitations.get("invitation-alpha")).toMatchObject({
      accepted_at: NOW,
      accepted_via: "invite_route",
      invited_user_id: "invitee-user",
      lifecycle_state: "accepted_by_recipient",
    });
    expect(database.auditEvents.some((event) => event.includes("collaboration_invite_accepted"))).toBe(true);
  });

  it("denies wrong-account acceptance without creating membership", async () => {
    const database = createDatabase();

    await expect(
      acceptCollaborationInvitationTokenInD1(database, {
        actorEmail: "other@example.test",
        actorUserId: "other-user",
        invitationTokenHash: "hash-alpha",
        now: NOW,
      }),
    ).resolves.toMatchObject({
      data: {
        state: "wrong_account",
        invited_email: "invitee@example.test",
      },
      error: null,
    });

    expect(database.projectMembers.has("project-alpha:other-user")).toBe(false);
    expect(database.auditEvents.some((event) => event.includes("collaboration_invite_wrong_account"))).toBe(true);
  });

  it("keeps invite entry and acceptance runtime off Supabase", () => {
    const page = readFileSync("src/app/invite/[token]/page.tsx", "utf8");
    const acceptance = readFileSync("src/lib/collaboration/invitation-acceptance.ts", "utf8");
    const store = readFileSync("src/lib/collaboration/invitation-d1-store.ts", "utf8");
    const migration = readFileSync("migrations/0007_collaboration_invitations.sql", "utf8");

    expect(page).toContain("resolveCollaborationInvitationFromCloudflareD1");
    expect(acceptance).toContain("acceptCollaborationInvitationTokenInCloudflareD1");
    expect(acceptance).toContain("acceptCollaborationInvitationByIdInCloudflareD1");
    expect(store).toContain("getCloudflareD1Database");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS collaboration_invitations");
    expect(`${page}\n${acceptance}\n${store}`).not.toMatch(/@supabase\/supabase-js|createSupabase|createSupabaseServiceRoleClient|SUPABASE_SERVICE_ROLE_KEY|resolve_collaboration_invitation|accept_collaboration_invitation/);
  });
});
