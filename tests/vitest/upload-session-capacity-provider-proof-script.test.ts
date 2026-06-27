import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("upload session capacity provider proof script", () => {
  it("requires explicit provider mode and refuses unexpected Supabase projects", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-session-capacity-provider-postgres.ts"), "utf8");

    expect(script).toContain("#!/usr/bin/env bun");
    expect(script).toContain("ARCH_UPLOAD_SESSION_CAPACITY_PROOF");
    expect(script).toContain("ARCH_UPLOAD_SESSION_CAPACITY_PROOF_ENV_FILE");
    expect(script).toContain('EXPECTED_PROJECT_REF = "ebxxqidacheyapmmzavr"');
    expect(script).toContain("provider-proof-skipped");
    expect(script).toContain("provider-proof-refused");
    expect(script).toContain("linked-provider-create-upload-session-concurrency-proof");
  });

  it("exercises parallel create_upload_session calls for actor and workspace caps", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-session-capacity-provider-postgres.ts"), "utf8");

    expect(script).toContain("Promise.allSettled");
    expect(script).toContain("ACTOR_CAP_ATTEMPTS = 8");
    expect(script).toContain("WORKSPACE_CAP_ATTEMPTS = 8");
    expect(script).toContain("ACTOR_CAP = 3");
    expect(script).toContain("WORKSPACE_CAP = 6");
    expect(script).toContain("recordPendingUploadSession");
    expect(script).toContain("isUploadSessionCapacityExceededError");
    expect(script).toContain("parallel-create-upload-session-actor-cap-admits-three");
    expect(script).toContain("parallel-create-upload-session-actor-cap-rejects-overflow");
    expect(script).toContain("parallel-create-upload-session-workspace-cap-admits-six");
    expect(script).toContain("parallel-create-upload-session-workspace-cap-rejects-overflow");
    expect(script).toContain("Reports are sanitized");
  });
});
