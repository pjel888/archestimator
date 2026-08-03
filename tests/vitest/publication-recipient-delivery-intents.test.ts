import { describe, expect, it } from "vitest";

import { createPublicationAdminD1Client } from "@/lib/publication/admin-d1-client";

type StatementCall = { sql: string; values: unknown[] };

function intentDatabase({
  existingRecipient = null,
  recipient = null,
  publicationEncryptedToken = "encrypted-publication-token",
}: {
  existingRecipient?: { id: string } | null;
  recipient?: { id: string; recipient_token_hash: string; resend_delivery_metadata: string } | null;
  publicationEncryptedToken?: string | null;
} = {}) {
  const calls: StatementCall[] = [];
  return {
    calls,
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          calls.push({ sql, values });
          return {
            async first() {
              if (sql.includes("lower(email)")) return existingRecipient;
              if (sql.includes("recipient_token_hash")) return recipient;
              if (sql.includes("SELECT encrypted_token FROM project_publications")) {
                return publicationEncryptedToken === null ? null : { encrypted_token: publicationEncryptedToken };
              }
              return null;
            },
            async all() {
              return { results: [], success: true };
            },
            async run() {
              return { meta: { changes: 1 }, success: true };
            },
          };
        },
      };
    },
  };
}

describe("legacy publication recipient delivery intents", () => {
  it("creates a pending invitation intent in the recipient insert", async () => {
    const database = intentDatabase();
    const admin = createPublicationAdminD1Client(Promise.resolve(database as never));

    const result = await admin.callProcedure<{ intentId: string; recipientId: string; status: string }>(
      "create_shared_link_recipient_delivery_intent",
      {
        expected_encrypted_token: "encrypted-publication-token",
        p_delivery_payload: {
          encryptedRawToken: "encrypted-recipient-token",
          linkBase: "/share/current-token",
          projectName: "Harbor House",
          recipientEmail: "client@example.com",
          senderEmail: "owner@example.com",
          senderLabel: "Owner",
        },
        p_display_name: "Client",
        p_email: "client@example.com",
        p_invited_by: "owner-id",
        p_recipient_token_hash: "recipient-token-hash",
        target_publication_id: "publication-id",
      },
    );

    expect(result.error).toBeNull();
    expect(result.data).toEqual(expect.objectContaining({ status: "queued" }));
    const insert = database.calls.find((call) => call.sql.includes("INSERT INTO shared_link_recipients"));
    expect(insert).toBeDefined();
    const metadata = insert?.values.find((value) => typeof value === "string" && value.includes("encrypted-recipient-token"));
    expect(JSON.parse(String(metadata))).toEqual(expect.objectContaining({
      attemptCount: 0,
      expectedPublicationEncryptedToken: "encrypted-publication-token",
      expectedRecipientTokenHash: "recipient-token-hash",
      kind: "invitation",
      proposedRecipientTokenHash: "recipient-token-hash",
      state: "pending",
    }));
  });

  it("reserves a resend intent without replacing the prior recipient token hash", async () => {
    const database = intentDatabase({
      recipient: {
        id: "recipient-id",
        recipient_token_hash: "previous-token-hash",
        resend_delivery_metadata: "{}",
      },
    });
    const admin = createPublicationAdminD1Client(Promise.resolve(database as never));

    const result = await admin.callProcedure<{ intentId: string; status: string }>(
      "reserve_shared_link_recipient_resend_intent",
      {
        expected_encrypted_token: "encrypted-publication-token",
        p_delivery_payload: { encryptedRawToken: "encrypted-new-token" },
        p_invited_by: "owner-id",
        p_proposed_recipient_token_hash: "new-token-hash",
        target_publication_id: "publication-id",
        target_recipient_id: "recipient-id",
      },
    );

    expect(result.error).toBeNull();
    expect(result.data).toEqual(expect.objectContaining({ status: "queued" }));
    const update = database.calls.find((call) => call.sql.includes("UPDATE shared_link_recipients"));
    expect(update?.sql).toContain("resend_delivery_metadata = ?");
    expect(update?.sql.split("WHERE")[0]).not.toContain("recipient_token_hash =");
    const metadata = update?.values.find((value) => typeof value === "string" && value.includes("encrypted-new-token"));
    expect(JSON.parse(String(metadata))).toEqual(expect.objectContaining({
      expectedRecipientTokenHash: "previous-token-hash",
      kind: "resend",
      proposedRecipientTokenHash: "new-token-hash",
      state: "pending",
    }));
  });
});
