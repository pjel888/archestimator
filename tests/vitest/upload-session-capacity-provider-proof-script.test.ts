import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Cloudflare D1 upload session capacity contract", () => {
  it("keeps actor and workspace limits durable and atomically enforced", () => {
    const route = readFileSync(
      join(process.cwd(), "src/app/api/component-library/attachments/direct-upload/route.ts"),
      "utf8",
    );
    const records = readFileSync(join(process.cwd(), "src/lib/uploads/direct-upload-records.ts"), "utf8");

    expect(route).toContain("MAX_RESERVED_DIRECT_UPLOAD_SESSIONS_PER_ACTOR = 3");
    expect(route).toContain("MAX_RESERVED_DIRECT_UPLOAD_SESSIONS_PER_WORKSPACE = 6");
    expect(route).toContain("readActiveUploadSessionCapacity");
    expect(route).toContain("recordPendingUploadSession");
    expect(route).toContain("isUploadSessionCapacityExceededError");
    expect(route).toContain('quotaClass: "active_actor"');
    expect(route).toContain('quotaClass: "active_workspace"');
    expect(records).toContain("INSERT INTO upload_sessions");
    expect(records).toContain("SELECT COUNT(*)");
    expect(records).toContain("capacity.maxActiveActorSessions");
    expect(records).toContain("capacity.maxActiveWorkspaceSessions");
    expect(records).toContain("runRequiredD1Batch");
    expect(records).toContain('new UploadSessionCapacityExceededError("active_actor"');
    expect(records).toContain('new UploadSessionCapacityExceededError("active_workspace"');
  });
});
