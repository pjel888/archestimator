# UNIT-006 Execution Addendum

This addendum is the current execution source for `UNIT-006`, `AC-006`, and `TEST-006`. It closes the security-key ownership and concrete shared-engine choices found during current-source preflight. Where this addendum conflicts with UNIT-006 wording in `IMPLEMENTATION_PLAN.md`, this addendum controls; all policy values and other unit contracts remain unchanged.

## Additional owned paths

- `src/lib/publication/security.ts`
- `tests/vitest/project-publication-security-hardening.test.ts`
- `tests/vitest/security-findings-publication-contracts.test.ts`
- new `tests/vitest/durable-public-rate-limit-contract.test.ts`

Move `readTelemetryHashPepper()` and the keyed value helper from `publication/public-repository.ts` into `publication/security.ts`, exporting `hashPublicTelemetryValue()` there. Publication telemetry, publication policy, and Client Portal policy import that helper from the security module. Delete the old helper/export from `public-repository.ts`; do not compatibility-re-export it and do not duplicate HMAC/pepper logic.

Retarget the helper-ownership/source-contract assertions. In particular, stop requiring the obsolete exact `createHash, createHmac` import in `public-repository.ts`; keep the security invariant that public IP/user-agent values use keyed HMAC rather than bare SHA-256.

The five-file gate also contains three stale current-source assertions in `tests/vitest/security-findings-publication-contracts.test.ts`; exact maintenance of these assertions is authorized and required:

- The legacy shared-decision CSRF assertion must be branch/helper-aware: the outer `POST` dispatches between Client Portal and legacy handling, while `legacyDecisionPost` owns the legacy CSRF guard before `checkSharedLinkDecisionRateLimit`.
- The publication image assertion must follow `normalizePublicationImageUrl()` through the brokered `/api/projects/images?path=...` route and `isSafeProjectImagePath()`, while retaining the separate rejection of already-brokered input in `normalizeIssuedPublicationImageUrl()`.
- The Estimate-row image normalization ownership assertion must point at `estimate-tree-read-repository.ts` after UNIT-003 extraction while preserving the activity-history consumer assertion.

Do not alter unrelated security expectations or add broader coverage in this unit.

Move exactly these five existing engine/lockout tests from `tests/vitest/project-publication-public-repository.test.ts` into the new `tests/vitest/durable-public-rate-limit-contract.test.ts`, retargeted to the extracted engine and concrete D1 operations:

- `does not delete expired rate-limit events on every recorded attempt`
- `runs expired rate-limit cleanup as a single in-process flight under concurrent checks`
- `blocks publication password attempts from durable D1 failure rows`
- `records publication password failures as durable D1 rows without holding the request open`
- `clears durable publication password failure rows after successful unlock`

Delete their obsolete `publication/d1-store.ts` mocks and the old repository-local `AND expires_at > ?` source assertion from `project-publication-public-repository.test.ts`; exact SQL and active-expiry behavior are proved in the dedicated contract instead. Keep all unrelated repository behavior tests in place. Do not leave duplicate copies or a compatibility mock surface for removed repository rate-limit exports.

## Concrete shared modules

`security/durable-rate-limit-d1.ts` is server-only and exports four concrete D1 operations:

- `insertDurableRateLimitEvent`
- `countDurableRateLimitEvents`
- `deleteDurableRateLimitEvents`
- `cleanupExpiredDurableRateLimitEvents`

Freeze their signatures to the current store shapes: insert accepts `{ keyHash, metadata?, scope, ttlSeconds }`; count accepts `{ activeAt?, keyHash, scope, since }`; delete accepts `(scope, keyHash)`; cleanup accepts optional epoch milliseconds. Each function acquires the current `ARCH_DB` binding internally. Own a local recursive JSON-metadata value type in the security module; do not import `JsonValue` or any type from `publication/d1-store.ts`.

Preserve current SQL, bind order, UUID generation, `JSON.stringify(metadata ?? {})`, separate reads for `occurred_at` and `expires_at`, optional `AND expires_at > ?`, and the exact binding error `Cloudflare D1 ARCH_DB binding is required for publication shared links.`. Insert binds `[randomUUID(), scope, keyHash, metadataJson, occurredAt, expiresAt]`; count binds `[scope, keyHash, since]` plus optional `activeAt`; delete binds `[scope, keyHash]`; cleanup binds the ISO timestamp for `expires_at < ?`. Do not create a generic store factory.

`security/durable-rate-limits.ts` is server-only and owns outer key hashing, 60-second cleanup debounce/single-flight state, record/count/check/clear behavior, ordered window evaluation, and result/window types. Export:

- `checkRecordedDurableRateLimit`
- `checkExistingDurableRateLimit`
- `recordDurableRateLimitEvent`
- `clearDurableRateLimitEvents`
- `DurableRateLimitResult`
- `DurableRateLimitWindow`

Freeze the concrete input shapes: recorded-check accepts `{ keyParts, metadata?, scope, windows }`; existing-check accepts `{ keyParts, scope, window }`; record accepts `{ keyParts, metadata?, scope, ttlSeconds }`; clear accepts `(scope, keyParts)`. `keyParts` is `Array<string | null | undefined>`, scope is `string`, and each window has `seconds`, `limit`, and `message(retryAfter)`. Domain scope unions and messages remain in each policy module. The engine imports no `Request`, publication, Client Portal, route, password, cookie, or UI surface.

Both policy modules are server-only, preserve existing public wrapper names/signatures, and own their domain scope unions/message functions. Do not make Client Portal import publication policy or repository. `publication_digest` remains absent from both extracted policy unions and every extracted-engine consumer: its existing `publication/actions.ts` use goes through the separate `reserve_security_rate_limit_slot` path and is outside UNIT-006.

## Frozen behavior matrix

| Scope | Key parts | Metadata route | Windows | Consumption |
|---|---|---|---|---|
| `project_publication_snapshot` | token hash + HMAC IP | `snapshot` | 60s/60 generic | record, then deny above limit |
| `proposal_export` | user ID + raw/unknown IP | `proposal_export` | 60s/12; 3600s/120 generic | recorded |
| `project_publication_event` | token hash + HMAC IP | `event` | 60s/60 generic | recorded |
| `project_publication_activity` | token hash + HMAC IP | `activity` | 60s/60 generic | recorded |
| `shared_link_session_start` | token hash + HMAC IP | `recipient_session` | 60s/10; 3600s/50 generic | recorded |
| `project_publication_password` | token hash + HMAC IP | failure `password`, `success:false` | 3600s/5 generic | check existing; failure insert; success clear |
| `shared_link_comment` | publication ID + recipient ID | `comment` | 60s/5; 3600s/20 comment | recorded |
| `shared_link_comment_read` | publication ID + recipient ID | `comment_read` | 60s/60 generic | recorded |
| `shared_link_decision` | publication ID + recipient ID | `decision` | 60s/5 generic | recorded |
| `shared_link_decision_read` | publication ID + recipient ID | `decision_read` | 60s/60 generic | recorded |
| `shared_link_unsubscribe` | token hash + HMAC IP + recipient-token hash | `unsubscribe` | 60s/5; 3600s/20 generic | recorded |
| `client_portal_public_read` | token hash + HMAC IP | `client_portal_asset/manifest/section` | 60s/60 generic | recorded |
| `client_portal_password` | token hash + HMAC IP | failure `client_portal_password`, `success:false` | 3600s/5 generic | check existing; failure insert; success clear |
| `client_portal_session_start` | token hash + HMAC IP | `client_portal_recipient_session` | 60s/10; 3600s/50 generic | recorded |
| `client_portal_thread` | portal ID + recipient ID | same scope | 60s/5; 3600s/20 comment | recorded |
| `client_portal_thread_read` | portal ID + recipient ID | same scope | 60s/60 generic | recorded |
| `client_portal_decision` | portal ID + recipient ID | same scope | 60s/5 generic | recorded |
| `client_portal_decision_read` | portal ID + recipient ID | same scope | 60s/60 generic | recorded |

Preserve outer key normalization (`part?.trim() || "-"`), unit-separator input, SHA-256 base64url output, record-before-count denial on attempt `limit + 1`, existing/password denial at `count >= limit`, declared window order, full window seconds as `retryAfter`, cleanup failure reset/propagation, and clear-without-cleanup behavior.

## AC-006 / TEST-006

Pass only when the old engine/policy/D1 blocks are deleted, every wrapper has one domain-owned definition, no Client Portal limiter imports publication repository, HMAC ownership is singular, the matrix is unchanged, and no new import cycle appears.

Run the focused engine/policy/lockout gate:

```sh
bunx vitest run tests/vitest/durable-public-rate-limit-contract.test.ts tests/vitest/client-portal-public-rate-limit.test.ts tests/vitest/project-publication-public-repository.test.ts tests/vitest/project-publication-password-lockout-route.test.ts tests/vitest/project-publication-security-hardening.test.ts tests/vitest/security-findings-publication-contracts.test.ts
```

Then run one caller-loading/rate-path assertion in every other owned mock-retarget file:

```sh
bunx vitest run tests/vitest/project-publication-activity.test.tsx tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx tests/vitest/project-publication-page.test.tsx tests/vitest/project-publication-route.test.ts tests/vitest/proposal-export-route-workbook.test.ts tests/vitest/proposal-export-route.test.ts tests/vitest/share-unsubscribe-interstitial.test.ts tests/vitest/share/share-page-get-routes-contract.test.ts -t 'uses durable rate limiting before loading public activity|uses durable comment rate limiting before inserting a comment|uses durable decision rate limiting before submitting a decision|requires public CSRF and rate-limits recipient session creation before token verification|rate limits snapshot reads before resolving publication state|rate limits publication password attempts before password verification|builds a real xlsx workbook through the route handler without mocking the workbook builder|returns a clean 429 JSON when the per-user export rate limit is exceeded|POST \(same-origin\) performs the unsubscribe|comment route rate limits public comment history reads before loading comments|decision route rate limits public decision-state reads before loading decisions'
```

The dedicated engine contract must prove exact D1 SQL/binds and separate clocks, key normalization with the unit separator and SHA-256 base64url output, record-before-count denial on attempt `limit + 1`, declared multi-window order/retry, cleanup debounce and single-flight, cleanup failure propagation followed by a real retry, and clear-without-cleanup. It must also prove all of the following migrated existing-check/password invariants:

- an existing check denies at `count >= limit`;
- the same captured `now` produces exact `activeAt` and `since` ISO timestamps passed to `countDurableRateLimitEvents`;
- an existing check never calls `insertDurableRateLimitEvent`;
- publication password failure recording awaits cleanup, then inserts the frozen `project_publication_password` scope, `{ route: "password", success: false }` metadata, and 3600-second TTL;
- password clearing hashes the identical normalized key parts used by check/record, calls `deleteDurableRateLimitEvents` with that hash, and performs no cleanup; and
- the concrete count operation retains `AND expires_at > ?` with the frozen optional `activeAt` bind.

The targeted caller command proves every remaining retargeted test module loads and its domain limiter mock intercepts the expected path without inheriting unrelated noisy assertions from those files.

Also require TypeScript, scoped ESLint, `git diff --check`, source/mocking residue scans, GitNexus change detection, and cycle comparison against the existing four-cycle baseline. GitNexus preflight is CRITICAL for `checkRecordedRateLimit`, the engine helpers, and `createPublicationD1Store`, and HIGH for the main Client Portal recipient wrapper; the receipt must reconcile every direct caller.
