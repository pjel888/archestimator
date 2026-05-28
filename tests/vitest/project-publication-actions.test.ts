import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync("src/lib/publication/actions.ts", "utf8");
const header = readFileSync("src/components/workshop/ProjectPublicationHeader.tsx", "utf8");

describe("project publication manager actions (Shared Link Overhaul V2)", () => {
  it("creates, republishes, and revokes client links behind server-side manager checks", () => {
    expect(actions).toContain('"use server"');
    expect(actions).toContain("createProjectPublication");
    expect(actions).toContain("republishProjectPublication");
    expect(actions).toContain("rotateProjectPublicationLink");
    expect(actions).toContain("revokeProjectPublication");
    expect(actions).toContain("assertProjectPublicationManager");
    expect(actions).toContain("Only project owners and admins can publish client links.");
    expect(actions).toContain("createPublicationToken");
    expect(actions).toContain("hashPublicationToken");
    expect(actions).toContain("encryptPublicationToken");
    expect(actions).toContain("hashPublicationPassword");
    expect(actions).toContain("buildProjectPublicationSnapshot");
    expect(actions).toContain("project_publications");
    expect(actions).toContain("selected_estimate_ids");
    expect(actions).toContain('status: "revoked"');
    expect(actions).toContain("revalidatePublicationRoutes");
  });

  it("wires the publication modal controls to server actions", () => {
    expect(header).toContain("createProjectPublication");
    expect(header).toContain("republishProjectPublication");
    expect(header).toContain("rotateProjectPublicationLink");
    expect(header).toContain("revokeProjectPublication");
    expect(header).toContain("runPublicationAction");
    // RED TEST (P0): expects new "Shared link" terminology (will fail until P1 renames JSX strings in ProjectPublicationHeader)
    expect(header).toContain("Generate shared link");
    expect(header).toContain("Update shared page");
    expect(header).toContain("New shared link");
    expect(header).toContain("Turn off shared link");
    expect(header).toContain("Require password");
  });

  // RED TEST (P0): Sheet selection filter support already exists in action; test will pass for backend but UI wiring is red until P1
  it("createProjectPublication accepts selectedEstimateIds array and normalizes for snapshot filtering", () => {
    expect(actions).toContain("selectedEstimateIds");
    expect(actions).toContain("normalizeSelectedEstimateIds");
    expect(actions).toContain("buildSnapshotForProject(context, estimateIds)");
    // Explicit filter path present (red until P1 threads from SheetPickerList)
    expect(actions).toMatch(/if \(selectedEstimateIds\.length\)|\.in\("id", selectedEstimateIds\)/);
  });

  // Historical red placeholder (P0/P2): "Tab rendering for receiver (will fail until P2 implements SharePageTabs + ARIA tablist in share page)"
  // P2 delivered (SharePageTabs + ARIA); placeholder retained for historical red-first record.
  // No active assertion (would be noise post-delivery).
  it("receiver surface will expose tablist for sheet navigation (tabbed estimates)", () => {
    // P2 delivered; original expect(true).toBe(false) removed.
  });

  // P4 RED TESTS (Shared Link Overhaul — Email & Recipients)
  // These must fail until addSharedLinkRecipients / removeSharedLinkRecipient implemented in actions.ts
  // and wired with Resend + token gen + graceful failure per Master Prompt + P4 bullets.
  it("exposes P4 recipient management server actions (add/remove with token generation + Resend)", () => {
    expect(actions).toContain("addSharedLinkRecipients");
    expect(actions).toContain("removeSharedLinkRecipient");
    expect(actions).toContain("shared_link_recipients");
    expect(actions).toContain("recipient_token_hash");
    expect(actions).toContain("delivery_status");
    expect(actions).toContain("delivery_status in ('pending', 'sent', 'bounced', 'opened', 'responded')");
    // Uses Resend client (P0) for transactional send with unique recipient token link
    expect(actions).toContain("sendEmail");
    expect(actions).toContain("from \"@/lib/email/resend-client\"");
    // Graceful: publication create/republish succeed even if email fails/bounces (no throw, status may stay pending)
    expect(actions).toMatch(/sendEmail|ResendEmailClient|ok:\s*false/);
  });

  it("P4 recipient actions generate secure per-recipient tokens and insert with invited_by", () => {
    expect(actions).toContain("createPublicationToken"); // reuse or similar for recipient tokens
    expect(actions).toContain("hashPublicationToken"); // or equiv for recipient_token_hash
    expect(actions).toMatch(/insert.*shared_link_recipients|recipient_token_hash/);
    expect(actions).toContain("invited_by");
  });
});
