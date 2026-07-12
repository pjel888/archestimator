# UNIT-002 D1 Schema Receipt

## Scope and status

- **Unit:** `UNIT-002`
- **Run scope:** `IMPLEMENT_LOCAL`
- **Result:** additive migration authored and executed successfully against local `ARCH_DB`; no hosted D1 database was mutated.
- **Source revision:** `6b59648a70c485cd54bad8f3659b3ec454621530`
- **Migration:** `migrations/0068_client_portal_foundation.sql`
- **Validation:** static SQL/diff review plus `bunx wrangler d1 execute ARCH_DB --local --file migrations/0068_client_portal_foundation.sql`. Wrangler executed 42 commands successfully against the local database with the existing migration history. A `sqlite_master` query confirmed all 19 v2 tables, the legacy-preflight view, and the issue-recipient active-decision partial index.
- **Follow-up validation:** a fresh isolated local D1 apply after the section-registry and publish work confirmed canonical `estimate_browser` constraints plus per-portal issue `idempotency_key` uniqueness.

## Delivered schema

`0068_client_portal_foundation.sql` adds these v2 entities without altering `project_publications`, `shared_link_recipients`, `shared_link_comments`, or `shared_link_responses`:

- `client_portals`, `client_portal_sections`, `client_portal_issues`, and `client_portal_issue_sections` separate stable portal identity, draft configuration, immutable issue metadata, and per-section payloads.
- `client_portal_assets` and `client_portal_brand_profiles` hold protected asset metadata and versionable brand inputs.
- `client_portal_recipients`, credentials, and sparse grants preserve stable recipient identity across reissues and credential rotation.
- Threads, messages, reads, subscriptions, and mentions establish a durable collaboration record.
- `client_portal_decisions` fixes the first-release formal scope to `issue`, stores the signed issue hash context, has idempotency, and rejects active duplicate decisions with a partial unique index.
- Audit, privacy-governed analytics, and transactional notification-outbox tables support later publisher, activity, and operations work.
- `client_portal_legacy_mappings` and `client_portal_legacy_preflight` provide the compatibility bridge and row-count/checkpoint surface for `UNIT-018`.

## Constraint and index review

| Invariant | Migration evidence | Result |
|---|---|---|
| Multiple portals per project | `client_portals` indexes `project_id` but has no unique project constraint. | PASS |
| Stable portal versus immutable issue | Portal token/current issue and issue `(portal_id, issue_number)` are separate; issue payloads are non-cascading. | PASS |
| Issued records are retained | Every v2 relation uses `ON DELETE RESTRICT`; no new issued record is project-cascaded. | PASS |
| Draft and issue sections are distinct | `client_portal_sections` and `client_portal_issue_sections` have separate keys, payloads, and indexes. | PASS |
| Public payload boundary is explicit | Issue sections use D1 JSON or an R2 object key, never an implicit live-source reference. | PASS |
| Active formal decision is issue-wide | `scope_kind` and `scope_key` are both constrained to `issue`; `idx_client_portal_decisions_active_issue_recipient` is partial on `voided_at IS NULL`. | PASS |
| Recipient continuity and credential rotation | Membership, credentials, and grants are distinct tables; recipient email is unique per portal, not per issue. | PASS |
| Global grant duplication is blocked | Separate partial unique indexes cover `section_id IS NULL` and `section_id IS NOT NULL`; this avoids SQLite `NULL` uniqueness gaps. | PASS |
| Thread target has a stable public identity | Non-portal threads require `target_public_id`; contextual target kind is constrained to the canonical first-release taxonomy. | PASS |
| Legacy migration has a preflight surface | `client_portal_legacy_preflight` joins legacy publication, recipient, comment, response, and mapping data without mutating it. | PASS |

## Compatibility and recovery

- Legacy `/share/[token]` reads and legacy publication tables remain untouched. No route cutover, data import, or token remapping occurs in this migration.
- Before a backfill, `client_portal_legacy_preflight` must report the legacy publication rows and related recipient/comment/response counts used by `UNIT-018` reconciliation.
- Before the migration is applied, recovery is simply not applying the migration. After it is applied, use a forward-only follow-up migration; do not drop v2 tables while issued portals, audit records, or mappings exist.
- A failure while applying `0068` must stop dependent v2 code, preserve legacy behavior, capture the D1 error, and repair forward in the next ordered migration. The current migration intentionally avoids destructive rebuilds and writes no legacy rows.

## Remaining proof boundary

Hosted D1 apply/readback, legacy backfill reconciliation, and route cutover are intentionally deferred to their owned implementation/release units. The local result proves D1 compatibility for this migration file, not hosted rollout completion.

## Next unit

`UNIT-003` owns the central policy evaluator. It must enforce the role/capability and same-portal relationship rules that D1 foreign keys alone cannot express.
