# 13 Adversarial QA Scenario Matrix

This matrix stress-tests the plan pack. It is planning QA, not provider or
browser proof.

## Score After Hardening

| Dimension | Score | Basis |
|---|---:|---|
| Strategy | 100% | Variant A is explicit, Auth is preserved, destructive authority is split into preparation and execution gates, and default-preserve decisions are named. |
| Document quality | 100% | Contradictory Storage/Auth/manifest gates are resolved through canonical docs and cross-file references. |
| Implementation readiness | 100% | Future executor has manifest templates, dry-run shape, UX contract, go/no-go gates, and verification matrix. This is not execution proof. |

## Adversarial Scenarios

| Scenario | Failure mode being tested | Required guard | Evidence that must exist before execution |
|---|---|---|---|
| Wrong Supabase project | reset runs against another provider project | project ref `ebxxqidacheyapmmzavr` checked at Gate 1 and Gate 2 | provider project list and local temp ref |
| Branch ambiguity | SQL targets branch or environment unexpectedly | ambiguous branch/provider state is no-go | branch/status note or alternate target proof |
| Owner says "reset database" | overly broad authority interpreted as approval | broad wording rejected | fresh instruction matching `10-FRESH-AUTHORIZATION-AND-OPERATOR-CHECKLIST.md` |
| Auth deletion included | users and profiles lost | Auth/managed schemas negative-manifest only | manifest with no destructive `auth.*` action |
| `profiles` deleted | roles/default workspace lost | Variant A preserves `profiles` | pre/post profile count and column checks |
| Workspace delete breaks profile state | stale `default_workspace_id` remains | dry run verifies null or post-reset workspace only | dry-run invariant query |
| Legal/security evidence erased | audit/legal continuity lost | preserve by default | preserve-table row counts and sample hashes |
| Decision-required table unresolved | future executor guesses | unresolved decision is no-go | decision resolution table |
| Narrow `CASCADE` hides blast radius | unlisted tables deleted | every reached table must be in manifest | FK blast-radius review |
| `TRUNCATE` skips needed triggers | audit/cleanup behavior missed | ordered `DELETE` default | method justification per table |
| Lock wait stalls app | reset blocks normal traffic | operational budgets and maintenance window | dry-run timing and execution budget |
| Dataset grows after planning | current assumptions stale | live counts regenerate before execution | fresh row/object counts |
| Backup exists but cannot restore | rollback is theoretical | restore rehearsal required | local/throwaway restore proof |
| Storage export incomplete | media cannot recover | incomplete export removes object from delete scope | object manifest with export statuses |
| Direct `storage.objects` mutation | managed metadata corrupted | Storage API/tooling only | cleanup tool review and report |
| Unknown Storage path deleted | unrelated object loss | DB-derived/allow-listed paths only | allow-list verdict per object |
| Storage cleanup partially fails | orphaned media remains | resumable failed/rejected/missing report | cleanup report and retry plan |
| Function count unchanged but grants drift | privilege exposure missed | function baseline includes owner/search_path/grants/hash | pre/post baseline comparison |
| RLS disabled accidentally | data exposure | RLS baseline comparison | post-reset RLS proof |
| Pending migrations slip in | data reset becomes schema change | migration work prohibited | migration status and no source/migration diff |
| Seed reintroduces demo data | not a clean slate | linked provider not reseeded by default | post-counts match zero/approved seed counts |
| Old share link exposes data | reset privacy failure | stale-link contract | share route proof |
| Old invite token leaks metadata | reset privacy failure | stale invite state | invite route proof |
| Empty workspace crashes UI | Auth works but app unusable | UX contract and app smoke | workshop proof |
| Library empty state insufficient | core estimating flow blocked | create folder/component/price option required | library proof |
| Storage upload broken after cleanup | app cannot create new media | upload/read/delete smoke | Storage proof |
| App code changes needed | scope silently expands | return to planning | blocker note and separate plan |
| Browser proof skipped incorrectly | user-flow claims unproven | manual or automated real-surface proof for Auth/share/invite/upload | app smoke evidence |
| Secrets committed | credentials/data leak | raw dumps/tokens outside repo | secret/path scan and evidence hygiene |
| Backup retained forever | unnecessary sensitive data exposure | retention/deletion date required | custodian and retention metadata |

## Residual Risk Classification

Residual risk remains acceptable only because destructive execution is future
gated. The pack is planning-ready when it forces the future executor to prove
fresh provider facts, backup/restore, manifest deltas, and app behavior before
destruction.

Residual risks that remain no-go until execution evidence exists:

- current provider state may differ from 2026-06-22;
- backup/export tools may change;
- row/object counts may grow;
- UI behavior may require code changes;
- Supabase branch/status calls may still be ambiguous.
