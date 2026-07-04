import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

/**
 * P3 — Active D1 Shared Link Contract Verification (Shared Link Overhaul V2)
 *
 * The provider-exit migration replaced generated Supabase type parity with active
 * Cloudflare D1 schema/source checks. This keeps the original shared-link contract
 * covered without keeping old generated provider types deletion-blocking.
 */

const d1PublicationMigration = readFileSync("migrations/0014_publication_shared_links.sql", "utf8");
const d1PublicationStore = readFileSync("src/lib/publication/d1-store.ts", "utf8");
const publicRepository = readFileSync("src/lib/publication/public-repository.ts", "utf8");

describe("P3 Shared Link Overhaul — Active D1 Contract Verification", () => {
  it("keeps the shared_link_* tables in active D1 migrations", () => {
    expect(d1PublicationMigration).toContain("CREATE TABLE IF NOT EXISTS shared_link_recipients");
    expect(d1PublicationMigration).toContain("CREATE TABLE IF NOT EXISTS shared_link_comments");
    expect(d1PublicationMigration).toContain("CREATE TABLE IF NOT EXISTS shared_link_responses");
    expect(d1PublicationMigration).toContain("CREATE TABLE IF NOT EXISTS shared_link_events");
    expect(d1PublicationMigration).toContain("recipient_token_hash TEXT NOT NULL UNIQUE");
    expect(d1PublicationMigration).toContain("CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_link_responses_recipient_publication");
  });

  it("keeps comment and response writes behind D1 store methods", () => {
    expect(d1PublicationStore).toContain("async insertClientComment");
    expect(d1PublicationStore).toContain("INSERT INTO shared_link_comments");
    expect(d1PublicationStore).toContain("async submitClientResponse");
    expect(d1PublicationStore).toContain("INSERT INTO shared_link_responses");
    expect(d1PublicationStore).toContain("WHERE publication_id = ? AND recipient_token_hash = ?");
    expect(publicRepository).toContain("store.insertClientComment");
    expect(publicRepository).toContain("store.submitClientResponse");
  });
});
