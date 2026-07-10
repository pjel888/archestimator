-- Better Auth durable rate-limit table (SEC-5).
-- Required when better-auth rateLimit.storage = "database".
-- Schema matches @better-auth/core getAuthTables rateLimit model (1.6.23).

CREATE TABLE IF NOT EXISTS "rateLimit" (
  "id" text NOT NULL PRIMARY KEY,
  "key" text NOT NULL UNIQUE,
  "count" integer NOT NULL,
  "lastRequest" integer NOT NULL
);

CREATE INDEX IF NOT EXISTS "rateLimit_key_idx" ON "rateLimit" ("key");
