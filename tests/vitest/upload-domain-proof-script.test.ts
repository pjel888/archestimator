import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Cloudflare upload domain boundary contract", () => {
  it("keeps upload metadata in D1 behind authenticated workspace/project authorization", () => {
    const schema = readFileSync(join(process.cwd(), "migrations/0010_upload_metadata.sql"), "utf8");
    const integrity = readFileSync(join(process.cwd(), "migrations/0087_upload_actor_and_removal_state_integrity.sql"), "utf8");
    const route = readFileSync(
      join(process.cwd(), "src/app/api/component-library/attachments/direct-upload/route.ts"),
      "utf8",
    );

    expect(schema).toContain("CREATE TABLE IF NOT EXISTS upload_sessions");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS upload_assets");
    expect(schema).toContain("CREATE TABLE IF NOT EXISTS upload_events");
    expect(schema).toContain("idx_upload_sessions_active_capacity");
    expect(integrity).toContain("CREATE TRIGGER upload_assets_session_integrity_insert");
    expect(integrity).toContain("asset.actor_user_id IS NOT session.actor_user_id");
    expect(integrity).toContain("asset.workspace_id IS NOT session.workspace_id");
    expect(integrity).toContain("asset.storage_path IS NOT session.storage_path");
    expect(route).toContain("requireCurrentUserContext()");
    expect(route).toContain("isWorkspaceEditorInD1");
    expect(route).toContain("canEditProjectInD1");
    expect(route).toContain("readUploadSessionForActor");
    expect(route).not.toContain("@supabase/supabase-js");
    expect(route).not.toMatch(/\.rpc\s*\(/);
  });
});
