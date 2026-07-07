# Implementation Plan

This is the authoritative execution guide for the future implementation AI. Organized into dependency-aware phases. Each phase is a durable-goal contract. Phases 1, 2, 4, 5(mechanism) are `IMPLEMENTATION-READY`. Phases 3, 6, 7 and Phase-5 TTLs are owner-gated (`CONDITIONALLY READY`).

**Before any edit:** `git status` + `git diff --check`; re-read the target files (concurrent-agent safety); re-verify `next`/`react` versions; read the relevant Next.js 16 local doc only if framework-sensitive (the route handler pattern here is stable). All file paths are repo-relative.

---

## Phase 0 — Discovery & baseline (small, optional)

**Objective.** Capture the activity-route benchmark baseline before Phase 1 narrows SELECTs, so PERF-01 regression is measurable.
**Requirements.** PERF-01.
**Prerequisites.** None.
**Work packages.**
- WP-0.1: Extend `tests/vitest/shared-link-activity-benchmark.test.ts` with the 1000-comment + 50-recipient + 50-response + 200-event fixture and a p50/p95 computation over 20 runs.
**Exact paths.** `tests/vitest/shared-link-activity-benchmark.test.ts`.
**Validation.** `bun test tests/vitest/shared-link-activity-benchmark.test.ts` → capture p50/p95 numbers.
**Acceptance.** Baseline numbers recorded in `19_…md` evidence.
**Exit criteria.** Baseline captured.
**Complexity.** Small.

---

## Phase 1 — Minimization: DTO, over-fetch, facts allow-list, redactor routing (`IMPLEMENTATION-READY`)

**Objective.** Tighten the public activity surface to the minimum recipient-visible fields and route share-route logging through the redactor.
**Requirements.** FR-01, SEC-01, SEC-02, SEC-03, SEC-04, DATA-02.
**Prerequisites.** None (Phase 0 optional).
**Work packages / tasks:**

### WP-1.1 — Drop `author_email` from public comment SELECT (SEC-01)
- **Files:** `src/lib/publication/d1-store.ts` (method `listPublicActivityComments` around :474-496); the `SharedLinkActivityCommentD1Row` type (around :69).
- **Symbols:** `listPublicActivityComments`, `SharedLinkActivityCommentD1Row`.
- **Instruction:** Remove `author_email` from the SELECT list and from the row type used by the public path. **Do NOT** change the owner action's `loadSharedLinkActivity` (it legitimately selects `author_email` at actions.ts:1842). If `SharedLinkActivityCommentD1Row` is shared between public and owner paths, split into `PublicActivityCommentD1Row` (no `author_email`) and keep the owner path on the wider type.
- **Failure cases:** If a downstream consumer reads `author_email` from the public function's output, it breaks — verified the public route does not (route.ts:174-188 uses `recipient_id` only). Re-verify before edit.
- **Tests:** repository unit test asserting the returned row type omits `author_email`; extend an existing or new `tests/vitest/share/` repository test.
- **Validation:** `bun run type-check` + focused vitest.
- **Completion evidence:** type narrows; test green; `EXPLAIN`/query-log provider readback (Phase 4) confirms the column is gone from the public query.
- **Parallelization:** Sequential with WP-1.2 (same file region of route consumer) — actually independent (different files); **parallel-safe** with WP-1.3/WP-1.4.
- **Complexity:** Small.

### WP-1.2 — Drop recipient `email` from display-name SELECT (SEC-02)
- **Files:** `src/lib/publication/d1-store.ts` (`listRecipientDisplayNames` :539-552).
- **Symbols:** `listRecipientDisplayNames`.
- **Instruction:** Remove `email` from the SELECT list. `readSharedLinkRecipientDisplayName` (activity-helpers.ts:42-44) uses only `display_name` → safe.
- **Tests:** repository unit test asserting `email` absent from the returned row type.
- **Validation:** `bun run type-check` + focused vitest.
- **Complexity:** Small. **Parallel-safe** with WP-1.1/WP-1.3/WP-1.4.

### WP-1.3 — Allow-list facts filter (SEC-03)
- **Files:** `src/lib/activity/activity-composer.ts` (`composeSharedLinkActivity` facts block :449-452).
- **Symbols:** `composeSharedLinkActivity`.
- **Instruction:** Replace the deny-list regex with an allow-list. The allow-list = the event-write metadata allow-list (`src/app/api/share/[token]/events/route.ts:17`: `durationMs, format, reason, source, success, target`) plus decision/target coordinates already on the row (`target_kind`, `target_label`, `target_secondary_label` are already excluded by the DTO; `signer_name` is on the row, surfaced via title/summary, not facts). **Discovery step first:** enumerate the metadata keys actually produced by `recordProjectPublicationEvent`/`insertSharedLinkEvent` (server-authored) to confirm the allow-list covers all currently-shown benign facts. If a key is in use and benign, add it to the allow-list with a comment.
- **Failure cases:** Tightening may drop a currently-shown fact — the discovery step prevents this.
- **Tests:** extend `tests/vitest/activity-security.test.ts` — assert an off-list key (e.g. `internalUserId`, `signerName`, `rawIp`) does not appear in `facts`.
- **Validation:** `bun test tests/vitest/activity-security.test.ts`.
- **Complexity:** Medium (discovery + filter rewrite + test). **Parallel-safe** with WP-1.1/WP-1.2/WP-1.4.

### WP-1.4 — Drop `meta` dead field from public DTO (FR-01)
- **Files:** `src/app/api/share/[token]/activity/route.ts` (`PublicActivityViewModel` :30-40; `toPublicActivityViewModel` :60-77).
- **Symbols:** `PublicActivityViewModel`, `toPublicActivityViewModel`.
- **Instruction:** Remove `meta` from the `Pick<>` and from the mapped output. Verify no consumer reads `meta` (verified: `SharedLinkActivityFeed.tsx` does not; no recipient-page consumer).
- **Tests:** the route test (Phase 2, WP-2.1) asserts `meta` is absent.
- **Validation:** `bun run type-check`.
- **Complexity:** Small. **Parallel-safe**.

### WP-1.5 — Route share-route logging through the redactor + add structured logging to silent routes (SEC-04)
- **Files (two distinct sub-scopes):**
  - **Sub-scope A — route existing raw `console.error` through the redactor:** `src/app/api/share/[token]/route.ts:72` (root snapshot), `comment/route.ts:84,120`, `decision/route.ts:38,76`, `password/route.ts:105`, `src/app/share/[token]/page.tsx:179,246,260,272`.
  - **Sub-scope B — add structured error logging (currently absent):** `src/app/api/share/[token]/activity/route.ts` (zero logging today — verified by grep) and `events/route.ts` (zero logging today — verified by grep). Wrap caught failures in a redacted `logAppError`/`emitLogRecord` call.
- **Symbols:** the `console.error("[share] …" / "[publication] …", error)` call sites above (re-verify line numbers before edit — concurrent agents may have shifted them). NOTE: the structured `console.error({ level, route, errorCode, ipHash, … })` calls (e.g. comment/route.ts:84, decision/route.ts:38) already pass only `ipHash` + `errorCode` (no raw token) — preserve them; the targets are the calls that pass a raw `error` object as a second arg.
- **Instruction:** For sub-scope A, replace each raw `console.error(error, …)` that passes a raw error object with `logAppError`/`emitLogRecord` so `redactForLog` (`src/lib/observability/redact.ts`) applies. For sub-scope B, add try/catch + structured logging around the activity/events route handlers' failure paths (they currently swallow). Preserve existing structured calls.
- **Failure cases:** If the redactor drops a field needed for debugging, the structured call still carries `errorCode`. Acceptable tradeoff.
- **Tests:** WP-2.4 (Phase 2) — a test that an error whose message contains `/share/<token>` or a `token_hash` is redacted in the emitted record; plus an assertion that the activity/events routes now emit a record on caught failure (currently silent).
- **Validation:** focused vitest + grep assertion `rg -n "console\.error\(" src/app/api/share/[token] src/app/share/[token]` returns only the already-safe structured-object calls (no raw `error` second-arg).
- **Complexity:** Medium (mechanical but careful across 6 files + 2 additive). **Parallel-safe** across the different route files (each owns its own call site) but coordinate via the ledger.

### WP-1.6 — Document no-soft-delete invariant (DATA-02)
- **Files:** `src/lib/publication/d1-store.ts` (`listPublicActivityComments`).
- **Instruction:** Add a comment naming the assumption: "No `deleted_at` column on `shared_link_comments`; if a future migration adds soft-delete, this query MUST exclude it."
- **Complexity:** Trivial. **Parallel-safe**.

### WP-1.7 — Clean dead `author_email` from SharePageComments interface
- **Files:** `src/components/share/SharePageComments.tsx:15-29` (interface), fallback at ~:567.
- **Instruction:** Remove the optional `author_email?` field and the `|| c.author_email` fallback (dead — `mapSharedLinkPublicComment` never populates it). Keep `authorName`/`"You"` fallback.
- **Tests:** existing `project-publication-comments.test.tsx` stays green.
- **Complexity:** Trivial. **Parallel-safe**.

**Phase 1 exit criteria.** FR-01, SEC-01, SEC-02, SEC-03, SEC-04, DATA-02 met; `bun run type-check` green; focused vitests green; grep assertion clean.
**Phase 1 rollback.** Revert deploy (code-only).

**Durable-goal contract (Phase 1):**
- Goal ID: `G-P1`.
- Objective: minimize the public activity surface.
- Scope: WP-1.1..1.7.
- Requirements covered: FR-01, SEC-01..04, DATA-02.
- Required evidence: type-check green; repository/composer/route tests green; grep assertion; provider readback (Phase 4).
- Completion audit: requirement-by-requirement (see `16_…md`).
- Checkpoint artifacts: this plan folder + test outputs.
- Stop condition: all WP green + exit criteria.
- Blocker condition: a discovered currently-shown fact that has no obvious allow-list home → escalate to owner (OPEN-UX/SEC).
- Review gate: Phase 2 tests + adversarial review (`19_…md`).
- QA gate: route-level privacy tests (Phase 2).

---

## Phase 2 — Route-level privacy tests (`IMPLEMENTATION-READY`)

**Objective.** Prove each minimization rule at the route-handler level (treating source-only inspection as insufficient, per PROMPT.md).
**Requirements.** TEST-01, TEST-02, TEST-04, FR-02..07, SEC-05, SEC-06, SEC-10, API-01, API-02, REL-01.
**Prerequisites.** Phase 1 complete.
**Work packages:**

### WP-2.1 — Route-handler test for `GET /activity`
- **New file:** `tests/vitest/share/share-activity-route.test.ts`.
- **Instruction:** Exercise the route handler with a fake D1 (follow the pattern in existing `tests/vitest/share/share-page-get-routes-contract.test.ts`). Scenarios:
  - Happy path: 200 + `activities[]` matching the allow-list (no `meta`, `email`, `author_email`, raw UUID).
  - Pagination: `limit=5` → 5 items + `hasMore:true` + `nextCursor`; next page correct; tampered cursor → 400.
  - Password gate: password-protected publication, no cookie → 423; valid cookie → 200.
  - Rate limit: 61st request → 429 + `Retry-After`.
  - Revoked → 404; expired → 404; both with `cache-control: no-store`.
  - Anonymous: comments only, no decisions/events.
  - Recipient-A vs recipient-B: no cross-recipient decisions/events.
  - Internal comment excluded.
  - `author_email`/`email` absent from any returned row shape (cast/assert on the repository mock).
  - ID format `/^act_[0-9a-f]{16}$/`.
  - D1 failure → 500 uniform (REL-01).
- **Complexity:** Medium-Large. **Sequential** after Phase 1 (depends on the narrowed types).

### WP-2.2 — Facts allow-list test (SEC-03)
- Extend `tests/vitest/activity-security.test.ts`. (Also referenced in WP-1.3; ensure both exist.)

### WP-2.3 — Retention-rule test (folded into WP-5.2)

(Placeholder removed during revision cycle — the retention-rule test is owned by WP-5.2 in Phase 5. No separate work here.)

### WP-2.4 — Redactor routing test (SEC-04)
- Assert a share route error path emits a record via `logAppError`/`emitLogRecord` and the record is redacted for a token-bearing message.

**Phase 2 exit criteria.** TEST-01/02/04 green; all shadow-path cells for activity GET covered.
**Durable-goal contract:** `G-P2` (analogous to G-P1).

---

## Phase 3 — Split the shared secret (OWNER-GATED OPEN-SEC-02, `CONDITIONALLY READY`)

**Objective.** Require four dedicated production secrets; remove silent fallback chaining.
**Requirements.** SEC-07.
**Prerequisites.** Owner approval (OPEN-SEC-02); secret provisioning in Cloudflare.
**Work packages:**
- WP-3.1: `src/lib/publication/security.ts:107-120` — make each secret independently required in production (throw on missing); remove the cross-fallback (or guard it behind an explicit `allowSecretFallback` flag defaulting false in prod).
- WP-3.2: `src/lib/publication/public-repository.ts:172-174` — require `ARCHESTIMATOR_TELEMETRY_HASH_PEPPER` (no fallback to token hash secret).
- WP-3.3: Document provisioning in `13_…md` runbook.
**Validation.** Config unit test (production throws on missing any of the four); owner confirmation.
**Rollback.** Restore fallbacks (document as temporary).
**Complexity.** Medium. **Decision owner:** Philip.

---

## Phase 4 — Revoked/expired uniformity + no-store + provider readback (`IMPLEMENTATION-READY`)

**Objective.** Verify (and harden if needed) that revoked/expired returns a uniform 404, every share response is `no-store`, and capture provider readback that the over-fetch is gone.
**Requirements.** FR-06, API-01.
**Prerequisites.** Phase 1 complete.
**Work packages:**
- WP-4.1: Extend `tests/vitest/share-no-store-invariants.test.ts` to assert `activity/route.ts` carries `no-store` on all branches (already partially covered; make exhaustive).
- WP-4.2: WP-2.1 already covers revoked/expired 404.
- WP-4.3: Provider readback — against a staging D1, run the public activity query (or its repository function) and confirm the SELECT list excludes `author_email`/`email` (via `EXPLAIN` or query log); against a hosted staging route, curl `/activity` and grep the JSON for `email`/`author_email`/raw UUID (expect none).
**Validation.** Existing + extended vitest; provider readback output captured.
**Complexity.** Small-Medium.

---

## Phase 5 — Retention rules for share content (`IMPLEMENTATION-READY` mechanism / `CONDITIONALLY READY` TTLs)

**Objective.** Extend `DEFAULT_RETENTION_RULES` to cover the six share-content tables.
**Requirements.** DATA-01.
**Prerequisites.** Owner signs TTLs (OPEN-RET-01). Mechanism is internal.
**Work packages:**
- WP-5.1: `src/lib/compliance/retention-core.ts:79-143` — add rules for `shared_link_comments`, `shared_link_responses`, `shared_link_recipients`, `project_publications`, `project_publication_events`, `publication_digest_log`. Default recommended TTLs (owner-confirmable): comments/responses 730d; recipients 365d post-revoke; publications/publication_events/digest_log 1095d. Action: `purged` (hard DELETE) — or `anonymized` for recipients (null email/display_name) if preferred.
- WP-5.2: Test (TEST-03) — dry-run `runRetentionPassInD1` with a fake D1 + past-TTL rows; assert rows purged + `data_retention_events` written.
- WP-5.3: Coordinate with `retention-schedule.md` draft (OPEN-DEC-004 counsel sign-off).
**Validation.** `bun test` on the retention test; dry-run log.
**Risks.** TTL values affect real data → owner sign-off mandatory.
**Rollback.** Remove the rules (no data loss beyond what cron already purged; recover from backup).
**Complexity.** Medium. **Decision owner:** Philip (TTLs).

---

## Phase 6 — Cloudflare Turnstile/WAF on open share links (OWNER-GATED OPEN-SEC-03, `CONDITIONALLY READY`)

**Objective.** Add friction to automated scraping of open (non-password) share links.
**Requirements.** SEC-08.
**Prerequisites.** Owner approval (OPEN-SEC-03); Cloudflare Turnstile site/secret provisioned (free tier); WAF custom rules (free tier has limited custom rules — confirm).
**Work packages:**
- WP-6.1: Add a Turnstile server-verify helper; validate the Turnstile token in `GET /api/share/[token]/route.ts` (snapshot) and `GET /api/share/[token]/activity` for open links (skip if password-protected — password gate is the control).
- WP-6.2: Add the Turnstile client widget to `/share/[token]/page.tsx` for open links.
- WP-6.3: Document WAF rule(s) in `13_…md` (dashboard-side).
**Validation.** Browser proof (Turnstile challenge renders + verifies); Cloudflare dashboard proof (WAF rule active).
**Rollback.** Disable Turnstile flag; remove WAF rule.
**Complexity.** Medium-Large (UX friction tradeoff). **Decision owner:** Philip.

---

## Phase 7 — Server-side session revocation (OWNER-GATED OPEN-SEC-04, `CONDITIONALLY READY`)

**Objective.** Invalidate stolen recipient session cookies without rotating the whole publication.
**Requirements.** SEC-09.
**Prerequisites.** Owner approval (OPEN-SEC-04); migration `0038_shared_link_session_generation.sql`.
**Work packages:**
- WP-7.1: Migration `migrations/0038_shared_link_session_generation.sql` (next sequential; latest is `0037_remove_preloaded_component_categories.sql`) — `ALTER TABLE shared_link_recipients ADD COLUMN session_generation INTEGER NOT NULL DEFAULT 0;` (+ optional index).
- WP-7.2: `src/lib/publication/security.ts` session verify — read `session_generation`, bind to cookie, reject mismatch.
- WP-7.3: `src/lib/publication/actions.ts` recipient removal — bump `session_generation`.
- WP-7.4: Test — stale cookie rejected (401/419); re-session works.
**Validation.** Focused vitest + D1 readback `PRAGMA table_info`.
**Rollback.** Drop column (D1 supports `DROP COLUMN` since 3.35).
**Complexity.** Medium. **Decision owner:** Philip.

---

## Phase 8 — Documentation (`IMPLEMENTATION-READY`)

- WP-8.1: DOC-01 — data contract doc (this plan's `06_…md` is the initial home; optionally promote to `.ai/06_specs/`).
- WP-8.2: DOC-02 — runbook entries for Phases 3/6/7 in `13_…md`.
- WP-8.3: Update `security-findings-publication-contracts.test.ts` string assertions if the route text changes (coordinate with WP-1.x).

---

## Task ID index

| Task | Phase | Requirement IDs | Complexity | Status |
|---|---|---|---|---|
| WP-0.1 | 0 | PERF-01 | Small | Ready |
| WP-1.1 | 1 | SEC-01 | Small | Ready |
| WP-1.2 | 1 | SEC-02 | Small | Ready |
| WP-1.3 | 1 | SEC-03 | Medium | Ready (discovery first) |
| WP-1.4 | 1 | FR-01 | Small | Ready |
| WP-1.5 | 1 | SEC-04 | Medium | Ready |
| WP-1.6 | 1 | DATA-02 | Trivial | Ready |
| WP-1.7 | 1 | (cleanup) | Trivial | Ready |
| WP-2.1 | 2 | TEST-01, FR-02..07, SEC-05, SEC-10, API-01/02, REL-01 | Medium-Large | Ready |
| WP-2.2 | 2 | TEST-02, SEC-03 | Small | Ready |
| WP-2.4 | 2 | TEST-04, SEC-04 | Small | Ready |
| WP-3.1..3.3 | 3 | SEC-07 | Medium | Owner-gated |
| WP-4.1..4.3 | 4 | FR-06, API-01 | Small-Medium | Ready |
| WP-5.1..5.3 | 5 | DATA-01 | Medium | Ready (mechanism) / Owner-gated (TTLs) |
| WP-6.1..6.3 | 6 | SEC-08 | Medium-Large | Owner-gated |
| WP-7.1..7.4 | 7 | SEC-09 | Medium | Owner-gated |
| WP-8.1..8.3 | 8 | DOC-01/02 | Small | Ready |

No `DISCOVERY-REQUIRED` blocker except WP-1.3's enumerated discovery (named scope, falsifiable: enumerate current event metadata keys). No `BLOCKED-EXTERNAL` except the owner-gated phases. No `BLOCKED-ARCHITECTURE`. No `BLOCKED-EVIDENCE`.
