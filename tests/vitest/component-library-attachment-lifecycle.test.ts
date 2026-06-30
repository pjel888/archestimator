import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function latestMigration(suffix: string) {
  const migration = readdirSync(join(process.cwd(), "supabase/migrations"))
    .filter((file) => file.endsWith(suffix))
    .sort()
    .at(-1);
  if (!migration) throw new Error(`Missing migration: ${suffix}`);
  return readFileSync(join(process.cwd(), "supabase/migrations", migration), "utf8");
}

const migration = latestMigration("_library_trust_governance.sql");
const attachmentRoute = readFileSync(join(process.cwd(), "src/app/api/component-library/attachments/route.ts"), "utf8");
const supabaseTypes = readFileSync(join(process.cwd(), "src/lib/supabase/types.ts"), "utf8");

describe("component library attachment lifecycle governance", () => {
  it("adds durable attachment review state scoped to item, price option, and cost entry", () => {
    expect(migration).toContain("create type public.cost_library_attachment_review_status as enum");
    expect(migration).toContain("'uploaded'");
    expect(migration).toContain("'approved'");
    expect(migration).toContain("'rejected'");
    expect(migration).toContain("'superseded'");
    expect(migration).toContain("add column if not exists review_status public.cost_library_attachment_review_status");
    expect(migration).toContain("add column if not exists applicable_cost_entry_id uuid references public.cost_library_item_variant_cost_entries(id)");
    expect(migration).toContain("add column if not exists is_current_approved boolean not null default false");
    expect(migration).toContain("cost_library_attachments_one_current_item_scope");
    expect(migration).toContain("cost_library_attachments_one_current_option_scope");
    expect(migration).toContain("cost_library_attachments_one_current_cost_entry_scope");
    expect(migration).toContain("Applicable cost entry must share workspace, item, and price option.");
  });

  it("uses admin-only RPCs for attachment approval, rejection, and supersede events", () => {
    const rpcNames = [
      "approve_cost_library_attachment",
      "reject_cost_library_attachment",
      "supersede_cost_library_attachment",
    ];

    expect(migration).toContain("create table if not exists public.cost_library_attachment_review_events");
    expect(migration).toContain("public.require_cost_library_governance_admin(target_row.workspace_id)");
    expect(migration).toContain("raise exception 'Attachment review revision conflict.' using errcode = '40001'");
    expect(migration).toContain("storage_bucket <> 'component-attachments'");
    expect(migration).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(migration).toContain("competitor.id not in (target_row.id, replacement_row.id)");
    expect(migration).toContain("replacement_prior_status := replacement_row.review_status");

    for (const rpcName of rpcNames) {
      expect(migration).toContain(`create or replace function public.${rpcName}`);
      expect(migration).toContain(`grant execute on function public.${rpcName}`);
      expect(supabaseTypes).toContain(`${rpcName}:`);
    }
  });

  it("removes direct member attachment writes while preserving member reads", () => {
    expect(migration).toContain('drop policy if exists "members can manage variant attachments"');
    expect(migration).toContain('create policy "members can view variant attachments"');
    expect(migration).toContain("revoke all on public.cost_library_item_variant_attachments from public, anon, authenticated");
    expect(migration).toContain("grant select on public.cost_library_item_variant_attachments to authenticated");
    expect(migration).toContain("revoke execute on function public.approve_cost_library_attachment(uuid, integer, uuid, text) from public, anon");
    expect(migration).toContain("grant execute on function public.approve_cost_library_attachment(uuid, integer, uuid, text) to authenticated");
  });

  it("blocks draft storage cleanup from deleting reviewed persisted attachments", () => {
    const lookupIndex = attachmentRoute.indexOf('.from("cost_library_item_variant_attachments")');
    const removeIndex = attachmentRoute.indexOf("removeObjects(COMPONENT_ATTACHMENT_BUCKET, paths)");

    expect(lookupIndex).toBeGreaterThanOrEqual(0);
    expect(removeIndex).toBeGreaterThan(lookupIndex);
    expect(attachmentRoute).toContain('.select("storage_path, review_status, is_current_approved")');
    expect(attachmentRoute).toContain("row.is_current_approved === true");
    expect(attachmentRoute).toContain('row.review_status && row.review_status !== "uploaded"');
    expect(attachmentRoute).toContain("Reviewed Library attachments cannot be removed from draft cleanup.");
    expect(attachmentRoute).toContain("isMissingAttachmentGovernanceColumnError");
  });

  it("requires approved current attachments before private download brokering", () => {
    expect(attachmentRoute).toContain('.select("id, workspace_id, storage_bucket, storage_path, file_name, content_type, size_bytes, review_status, is_current_approved")');
    expect(attachmentRoute).toContain('data.review_status !== "approved"');
    expect(attachmentRoute).toContain("data.is_current_approved !== true");
    expect(attachmentRoute).toContain('privateAttachmentUnavailable("Attachment is not available until approval is complete.")');
    expect(attachmentRoute).toContain("decideUploadScanGate");
    expect(attachmentRoute).toContain("scan_override_expires_at");
    expect(attachmentRoute).toContain('event_type: "download_url_issued"');
  });

  it("keeps generated Supabase types aligned with attachment governance", () => {
    expect(supabaseTypes).toContain("cost_library_attachment_review_status:");
    expect(supabaseTypes).toContain("cost_library_attachment_review_event_type:");
    expect(supabaseTypes).toContain("cost_library_attachment_review_events");
    expect(supabaseTypes).toContain("review_status: Database[\"public\"][\"Enums\"][\"cost_library_attachment_review_status\"]");
    expect(supabaseTypes).toContain("applicable_cost_entry_id: string | null");
    expect(supabaseTypes).toContain("is_current_approved: boolean");
  });
});
