-- Better Auth 1.6.23 core D1 schema.
--
-- Better Auth generated these tables during the Cloudflare cutover, but they
-- were never part of the ordered repository migrations. A clean local D1 could
-- therefore report every tracked migration as applied while OAuth failed when
-- it tried to persist its verification state.

CREATE TABLE IF NOT EXISTS "user" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" INTEGER NOT NULL,
  "image" TEXT,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "expiresAt" DATE NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" DATE,
  "refreshTokenExpiresAt" DATE,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" DATE NOT NULL,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");

-- CREATE TABLE IF NOT EXISTS deliberately preserves an existing compatible
-- Better Auth schema. Fail closed when a partial or drifted table would make
-- that idempotence silently accept an unusable shape.
DROP TABLE IF EXISTS "better_auth_0104_schema_guard";
CREATE TABLE "better_auth_0104_schema_guard" (
  "valid" INTEGER NOT NULL CHECK ("valid" = 1)
);

INSERT INTO "better_auth_0104_schema_guard" ("valid")
SELECT CASE WHEN
  (SELECT COUNT(*) FROM pragma_table_info('user')) = 7
  AND (SELECT COUNT(*) FROM pragma_table_info('user') WHERE
    (name = 'id' AND lower(type) = 'text' AND "notnull" = 1 AND pk = 1)
    OR (name = 'name' AND lower(type) = 'text' AND "notnull" = 1)
    OR (name = 'email' AND lower(type) = 'text' AND "notnull" = 1)
    OR (name = 'emailVerified' AND lower(type) = 'integer' AND "notnull" = 1)
    OR (name = 'image' AND lower(type) = 'text' AND "notnull" = 0)
    OR (name = 'createdAt' AND lower(type) = 'date' AND "notnull" = 1)
    OR (name = 'updatedAt' AND lower(type) = 'date' AND "notnull" = 1)
  ) = 7
  AND EXISTS (
    SELECT 1 FROM pragma_index_list('user') AS indexes
    WHERE indexes."unique" = 1 AND indexes.partial = 0
      AND (SELECT COUNT(*) FROM pragma_index_info(indexes.name)) = 1
      AND EXISTS (
        SELECT 1 FROM pragma_index_info(indexes.name)
        WHERE seqno = 0 AND name = 'email'
      )
  )
  AND (SELECT COUNT(*) FROM pragma_table_info('session')) = 8
  AND (SELECT COUNT(*) FROM pragma_table_info('session') WHERE
    (name = 'id' AND lower(type) = 'text' AND "notnull" = 1 AND pk = 1)
    OR (name = 'expiresAt' AND lower(type) = 'date' AND "notnull" = 1)
    OR (name = 'token' AND lower(type) = 'text' AND "notnull" = 1)
    OR (name = 'createdAt' AND lower(type) = 'date' AND "notnull" = 1)
    OR (name = 'updatedAt' AND lower(type) = 'date' AND "notnull" = 1)
    OR (name = 'ipAddress' AND lower(type) = 'text' AND "notnull" = 0)
    OR (name = 'userAgent' AND lower(type) = 'text' AND "notnull" = 0)
    OR (name = 'userId' AND lower(type) = 'text' AND "notnull" = 1)
  ) = 8
  AND EXISTS (
    SELECT 1 FROM pragma_index_list('session') AS indexes
    WHERE indexes."unique" = 1 AND indexes.partial = 0
      AND (SELECT COUNT(*) FROM pragma_index_info(indexes.name)) = 1
      AND EXISTS (
        SELECT 1 FROM pragma_index_info(indexes.name)
        WHERE seqno = 0 AND name = 'token'
      )
  )
  AND EXISTS (
    SELECT 1 FROM pragma_index_list('session') AS indexes
    WHERE indexes.name = 'session_userId_idx' AND indexes."unique" = 0 AND indexes.partial = 0
      AND (SELECT COUNT(*) FROM pragma_index_info(indexes.name)) = 1
      AND EXISTS (
        SELECT 1 FROM pragma_index_info(indexes.name)
        WHERE seqno = 0 AND name = 'userId'
      )
  )
  AND EXISTS (
    SELECT 1 FROM pragma_foreign_key_list('session')
    WHERE "table" = 'user' AND "from" = 'userId' AND "to" = 'id' AND lower(on_delete) = 'cascade'
  )
  AND (SELECT COUNT(*) FROM pragma_table_info('account')) = 13
  AND (SELECT COUNT(*) FROM pragma_table_info('account') WHERE
    (name = 'id' AND lower(type) = 'text' AND "notnull" = 1 AND pk = 1)
    OR (name = 'accountId' AND lower(type) = 'text' AND "notnull" = 1)
    OR (name = 'providerId' AND lower(type) = 'text' AND "notnull" = 1)
    OR (name = 'userId' AND lower(type) = 'text' AND "notnull" = 1)
    OR (name = 'accessToken' AND lower(type) = 'text' AND "notnull" = 0)
    OR (name = 'refreshToken' AND lower(type) = 'text' AND "notnull" = 0)
    OR (name = 'idToken' AND lower(type) = 'text' AND "notnull" = 0)
    OR (name = 'accessTokenExpiresAt' AND lower(type) = 'date' AND "notnull" = 0)
    OR (name = 'refreshTokenExpiresAt' AND lower(type) = 'date' AND "notnull" = 0)
    OR (name = 'scope' AND lower(type) = 'text' AND "notnull" = 0)
    OR (name = 'password' AND lower(type) = 'text' AND "notnull" = 0)
    OR (name = 'createdAt' AND lower(type) = 'date' AND "notnull" = 1)
    OR (name = 'updatedAt' AND lower(type) = 'date' AND "notnull" = 1)
  ) = 13
  AND EXISTS (
    SELECT 1 FROM pragma_foreign_key_list('account')
    WHERE "table" = 'user' AND "from" = 'userId' AND "to" = 'id' AND lower(on_delete) = 'cascade'
  )
  AND EXISTS (
    SELECT 1 FROM pragma_index_list('account') AS indexes
    WHERE indexes.name = 'account_userId_idx' AND indexes."unique" = 0 AND indexes.partial = 0
      AND (SELECT COUNT(*) FROM pragma_index_info(indexes.name)) = 1
      AND EXISTS (
        SELECT 1 FROM pragma_index_info(indexes.name)
        WHERE seqno = 0 AND name = 'userId'
      )
  )
  AND (SELECT COUNT(*) FROM pragma_table_info('verification')) = 6
  AND (SELECT COUNT(*) FROM pragma_table_info('verification') WHERE
    (name = 'id' AND lower(type) = 'text' AND "notnull" = 1 AND pk = 1)
    OR (name = 'identifier' AND lower(type) = 'text' AND "notnull" = 1)
    OR (name = 'value' AND lower(type) = 'text' AND "notnull" = 1)
    OR (name = 'expiresAt' AND lower(type) = 'date' AND "notnull" = 1)
    OR (name = 'createdAt' AND lower(type) = 'date' AND "notnull" = 1)
    OR (name = 'updatedAt' AND lower(type) = 'date' AND "notnull" = 1)
  ) = 6
  AND EXISTS (
    SELECT 1 FROM pragma_index_list('verification') AS indexes
    WHERE indexes.name = 'verification_identifier_idx' AND indexes."unique" = 0 AND indexes.partial = 0
      AND (SELECT COUNT(*) FROM pragma_index_info(indexes.name)) = 1
      AND EXISTS (
        SELECT 1 FROM pragma_index_info(indexes.name)
        WHERE seqno = 0 AND name = 'identifier'
      )
  )
  AND (SELECT COUNT(*) FROM pragma_table_info('rateLimit')) = 4
  AND (SELECT COUNT(*) FROM pragma_table_info('rateLimit') WHERE
    (name = 'id' AND lower(type) = 'text' AND "notnull" = 1 AND pk = 1)
    OR (name = 'key' AND lower(type) = 'text' AND "notnull" = 1)
    OR (name = 'count' AND lower(type) = 'integer' AND "notnull" = 1)
    OR (name = 'lastRequest' AND lower(type) IN ('integer', 'bigint') AND "notnull" = 1)
  ) = 4
  AND EXISTS (
    SELECT 1 FROM pragma_index_list('rateLimit') AS indexes
    WHERE indexes."unique" = 1 AND indexes.partial = 0
      AND (SELECT COUNT(*) FROM pragma_index_info(indexes.name)) = 1
      AND EXISTS (
        SELECT 1 FROM pragma_index_info(indexes.name)
        WHERE seqno = 0 AND name = 'key'
      )
  )
THEN 1 ELSE 0 END;

DROP TABLE "better_auth_0104_schema_guard";
