# 14 — Risk Register

| ID | Risk | Likelihood | Impact | Severity | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| RISK-01 | 6-source fan-out creates too many concurrent Supabase connections under load | Low (closed-beta scale) | Medium | Medium | `Promise.all` over only 5 sources (publication lookup is one query); hard `LIMIT 50+1` per source; Supabase pool absorbs | Impl agent | Open |
| RISK-02 | Recipient display name collisions cause user confusion | Medium | Low | Low | Dropdown disambiguates with non-PII context; timeline uses display_name only; no email DTO | Impl agent | Open |
| RISK-03 | Cursor drift during rapid "Load more" | Low | Low | Low | Per-source cursor; rapid clicks deduped in loader/client state; URL unchanged | Impl agent | Open |
| RISK-04 | URL params injection causes weird filters | Low | Low | Low | URL-state helper validates against allowlists; bad values ignored | Impl agent | Open |
| RISK-05 | Existing dashboard preview card regresses when a sibling repository is added | Low | Medium | Low | `listProjectActivityPage` is untouched; `readPublisherWorkspaceActivity` is untouched | Impl agent | Open |
| RISK-06 | Performance budget blown by collaboration-audit RPC/index path or exact count reads | Medium | Medium | Medium | EXPLAIN the RPC and count paths; add/adjust narrow index only with evidence; authenticated perf evaluator | Impl agent | Open |
| RISK-07 | Implementation pulls in estimate-sheet activity-history helpers and bloats the client bundle | Low | Medium | Low | Pattern-reference only; never import. WP-14 verifies bundle size | Impl agent | Open |
| RISK-08 | User expectation mismatch: "Deletions" doesn't show project-level deletes (which live in `mass_deletion_events`) | Medium | Low | Low | Out of scope per non-goals; empty-state copy is honest; v2 decision | Product (Philip) | Open |
| RISK-09 | Surfacing `account_security_events` or `ai_action_runs` accidentally leaks account-level info into a project page | Low | High | Medium | v1 strictly excludes these tables; code review verifies no such import | Impl agent | Open |
| RISK-10 | Recipient email PII leak via logs | Low | High | Medium | Logs use `[project-activity]` labels with no PII; review log statements | Impl agent | Open |
| RISK-11 | Cross-project IDOR via URL filter values | Low | High | Medium | Server-side scoping is unconditional; URL filter values only filter within scope; denial test | Impl agent | Open |
| RISK-12 | Browser back/forward produces inconsistent filter state | Low | Low | Low | URL is canonical; RSC navigation re-fetches | Impl agent | Open |
| RISK-13 | Accessibility regressions (focus trap, screen-reader semantics) | Low | High | Medium | axe assertions + manual a11y pass | Impl agent | Open |
| RISK-14 | The 920-line `ProjectDashboardClient.tsx` is a reference but copying it blindly introduces tight coupling | Low | Medium | Low | Read-only adaptation reference; do not import | Impl agent | Open |
| RISK-15 | Owner-delegated product defaults do not match Philip's later preference | Low | Low | Low | ODD-01..ODD-12 are documented, reversible v1 choices | Product (Philip) | Accepted for planning |
| RISK-16 | Pre-existing red test files in `bun run validate` block the v1 gate | High (per current-state FAST PATH) | Medium | Medium | Use focused Vitest matrices; document pre-existing reds as unrelated | Impl agent | Open |
| RISK-17 | Phase 4 (client component) is XL-complexity and may need to split | Medium | Medium | Medium | Decompose into 13 subcomponents per WP-7; split across PRs if scope pressure emerges | Impl agent | Open |
| RISK-18 | "Edited by me" preset requires current-user ID plumbing | Low | Low | Low | Server Component passes `currentUserId`; client resolves `me` → that ID | Impl agent | Open |
| RISK-19 | Estimate scope wrongly includes publications that no longer contain that estimate after a re-publish | Medium | Low | Low | Use `activity_target_labels_json -> 'estimateLabels'` membership at query time | Impl agent | Open |
| RISK-20 | The closed-beta has only one active project (Lewis Residence) so most fixtures are synthetic | High | Low | Low | Tests use deterministic fixtures; provider-readback not required for v1 | Impl agent | Open |
| RISK-21 | Collaboration audit direct table access is denied but implementation uses direct Supabase read anyway | Medium | High | High | WP-0 scoped RPC migration; grep/code review forbids direct `.from("collaboration_audit_events")` in new repository except tests proving denial | Impl agent | Open |
| RISK-22 | Count summary shows misleading totals when one source fails | Medium | Medium | Medium | Count contract marks partial results; partial banner required; tests cover count failure path | Impl agent | Open |

## Top-3 risks to watch

1. **RISK-21** — collaboration audit RPC/direct-deny mistake. Migration proof and denial tests are non-negotiable.
2. **RISK-09** — accidentally surfacing account-level audit tables. Code review gate is non-negotiable.
3. **RISK-11** — cross-project IDOR. Server-side scoping + denial tests are non-negotiable.

## Risk acceptance

Risks marked Low severity may be accepted without escalation. Medium and High risks must be resolved or explicitly accepted by the implementer + reviewer before declaring v1 done.
