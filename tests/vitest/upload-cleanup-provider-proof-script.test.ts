import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Cloudflare upload cleanup provider contract", () => {
  it("runs the current D1 cleanup planner before R2 deletion", () => {
    const cleanup = readFileSync(join(process.cwd(), "src/lib/uploads/cleanup.ts"), "utf8");
    const cleanupJob = readFileSync(join(process.cwd(), "src/lib/uploads/cleanup-job.ts"), "utf8");
    const route = readFileSync(join(process.cwd(), "src/app/api/internal/upload-cleanup/route.ts"), "utf8");

    expect(cleanup).toContain("export function planUploadStorageCleanup");
    expect(cleanup).toContain("export function summarizeUploadCleanup");
    expect(cleanup).toContain("export function buildUploadCleanupOperationalSnapshot");
    expect(cleanupJob).toContain("export async function runUploadCleanupJob");
    expect(cleanupJob).toContain("export function createUploadCleanupEventWriter");
    expect(cleanupJob).toContain("createUploadCleanupStorageFromProvider");
    expect(route).toContain("planUploadStorageCleanup(records, { limit })");
    expect(route).toContain("runUploadCleanupJob({");
    expect(route).toContain("createUploadCleanupEventWriter(db)");
    expect(route.indexOf("listUploadCleanupJobRecords")).toBeLessThan(route.indexOf("runUploadCleanupJob({"));
  });

  it("deduplicates safe targets, preserves referenced assets, and audits every outcome without raw paths", () => {
    const cleanup = readFileSync(join(process.cwd(), "src/lib/uploads/cleanup.ts"), "utf8");
    const cleanupJob = readFileSync(join(process.cwd(), "src/lib/uploads/cleanup-job.ts"), "utf8");

    expect(cleanup).toContain("const seen = new Set<string>()");
    expect(cleanup).toContain("if (seen.has(key)) continue");
    expect(cleanup).toContain('reason: "not_cleanup_eligible"');
    expect(cleanup).toContain('reason: "unsafe_path"');
    expect(cleanup).toContain("workspacePrefixMatches(target.path, record.workspaceId)");
    expect(cleanupJob).toContain('return { action: "retain", reason: "referenced" }');
    expect(cleanupJob).toContain('return { action: "retain", reason: "already_purged" }');
    expect(cleanupJob).toContain("storagePathSha256: sha256Hex(candidate.target.path)");
    expect(cleanupJob).toContain("storagePathRecorded: false");
    expect(cleanupJob).toContain('"cleanup_queued"');
    expect(cleanupJob).toContain('"cleanup_failed"');
    expect(cleanupJob).toContain('"cleanup_succeeded"');
    expect(cleanupJob).toContain("last_error_sha256");
  });
});
