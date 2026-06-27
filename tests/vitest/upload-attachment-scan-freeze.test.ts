import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("component attachment scan freeze", () => {
  it("freezes approval/current-use transitions until scanner-clean finalization exists", () => {
    const migration = read("supabase/migrations/20260626184000_freeze_unscanned_component_attachment_approval.sql");

    expect(migration).toContain("create or replace function public.approve_cost_library_attachment");
    expect(migration).toContain("create or replace function public.supersede_cost_library_attachment");
    expect(migration).toContain("Component attachment approval is disabled until upload scanning is enabled.");
    expect(migration).not.toContain("set review_status = 'approved'");
    expect(migration).not.toContain("is_current_approved = true");
  });

  it("exposes a component attachment download broker only behind scan-clean gating", () => {
    const route = read("src/app/api/component-library/attachments/route.ts");

    expect(route).toContain("export async function GET");
    expect(route).toContain("export async function POST");
    expect(route).toContain("export async function DELETE");
    expect(route).toContain('.from("cost_library_item_variant_attachments")');
    expect(route).toContain('.from("upload_assets")');
    expect(route).toContain('data.scan_status !== "clean"');
    expect(route).toContain('event_type: "download_url_issued"');
    expect(route).toContain(".storage.from(COMPONENT_ATTACHMENT_BUCKET).download");
  });
});
