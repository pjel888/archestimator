# Blast Radius and Risk Analysis

## Affected user flows

| Flow | Current behavior | Future impact |
| --- | --- | --- |
| Login/OAuth/magic link | `/login` notice links Terms/Privacy; `/auth/callback` redirects to `/workshop`. | Post-auth users may route through acceptance before protected app. |
| Protected workshop | `/workshop/*` requires Supabase user + closed-beta allowlist. | Adds Terms-current check; risk of app-wide lockout if wrong. |
| Existing beta users | No Terms acceptance records exist. | First access after rollout may require acceptance or grace path. |
| Old Terms version | No version comparison. | Required version changes trigger re-acceptance. |
| Invite/share | Public invite/share routes remain separate. | Must avoid accidental gate on invite/share recipients unless approved. |
| Settings/support/legal | Settings links exist; no acceptance status. | Add acceptance status and support/legal evidence path. |
| Future billing | No billing now. | Future checkout/subscription must require Terms acceptance and cancellation/refund disclosures. |

## Affected modules/files

- `src/proxy.ts` — public/protected route exemptions; avoid heavy DB checks.
- `src/app/auth/callback/route.ts` — optional redirect to acceptance path after session establishment.
- `src/lib/auth/session.ts` — candidate protected boundary for user + acceptance status.
- `src/app/login/page.tsx` — legal links/notice.
- `src/app/terms/page.tsx`, `src/app/privacy/page.tsx` — legal content metadata.
- `src/app/workshop/*`, `src/components/workshop/*`, `src/components/ui/*` — acceptance UI/shell/settings.
- `src/lib/supabase/types.ts`, `supabase/migrations/*` — acceptance schema/types/RLS.
- Tests under `tests/unit`, `tests/vitest`, `e2e`.

## Possible regressions and mitigations

| Risk | Severity | Likelihood | Mitigation | Rollback |
| --- | --- | --- | --- | --- |
| Users blocked from app due to acceptance bug | High | Medium | Gate behind feature flag/config; E2E new/returning/old-version tests; exempt legal/auth routes. | Disable gate or revert UI route while preserving table. |
| Existing users without acceptance records all blocked unexpectedly | High | Medium | Choose explicit hard-gate vs grace policy; beta cohort smoke before rollout. | Disable hard gate; keep banner only. |
| Users who accepted old version not re-prompted | High | Medium | Required version constant + tests; append-only history. | Raise required version after fix; re-run acceptance checks. |
| Failed Supabase write after signup | Medium | Medium | Recoverable error/retry; do not silently enter app if hard gate required. | Disable gate or fallback to support contact. |
| Auth/session mismatch | High | Low-Medium | Use `getUser()` not unverified client state; derive user server-side. | Revert redirect/gate integration. |
| RLS prevents own acceptance reads/writes | High | Medium | SQL tests; explicit grants + RLS; Supabase changelog grant awareness. | Migration fix; app gate stays off until fixed. |
| RLS allows cross-user acceptance access | Critical | Low-Medium | RLS deny tests and review; no broad anon/auth grants; admin only server-side. | Revoke grants/policies, disable retrieval UI. |
| Duplicate acceptance records | Low-Medium | Medium | Unique `(user_id, terms_key, version)` and idempotent insert/upsert; append-only per version. | Dedupe migration if needed. |
| Race condition on first login/double-click | Medium | Medium | Idempotency key/unique constraint; pending UI state. | Retry after conflict; no data loss. |
| Billing access after Terms change | High future | Low now | Billing remains inactive; future checkout gate requires current Terms. | Stop checkout launch. |
| Legal copy deployed without final approval | High | Medium | Legal approval gate in implementation prompt/release checklist; status metadata. | Roll back Terms copy and required version; incident note. |
| Overbroad liability claims misleading/unenforceable | High | Medium | No “zero liability”; counsel review; careful no-professional-advice/product-tool copy. | Replace copy and re-accept if material. |
| Privacy risk from IP/user-agent | Medium-High | Medium | Hash/omit by default; legal/privacy decision; retention policy. | Stop collecting raw metadata; redact/anonymize if legally permitted. |
| Migration rollback complexity | Medium | Medium | DB-first/app-second/gate-last; migration reversible plan; no gate until migration proven. | Disable app gate; keep table or controlled rollback migration. |
| Merge conflicts around auth/protected routes | Medium | High | Scoped branch, minimal files, rebase before PR, graph impact analysis. | Rebase/resolve; avoid unrelated edits. |

## Affected tests

- Existing auth tests: `auth-callback-route.test.ts`, `auth-magic-link.test.ts`, `auth-entry-ui-contract.test.ts`, auth redirect/onboarding/settings tests.
- Existing design-system lint.
- New Terms acceptance unit/DOM/E2E/RLS tests.
- Potential Playwright auth/protected-route tests.

## Affected build/runtime behavior

- New DB query to determine acceptance status in protected app path.
- New protected UI route/sheet/page.
- Potential redirect after auth callback or protected layout render.
- No impact to public legal/marketing/share/invite routes if scoped correctly.

## Edge cases

- User opens `/workshop/projects?next=...` while not accepted.
- User accepts in two tabs concurrently.
- User's session expires while on acceptance page.
- Legal version changes while user is mid-acceptance.
- DB migration missing on linked environment but app gate deployed.
- Acceptance save succeeds but redirect fails.
- Support admin looks up acceptance history for deleted/anonymized user.
- Public share recipient has no account.
- Dev auth bypass local route checks.

## Concurrency and merge-conflict risks

- Auth/proxy/session files are high-touch due closed-beta launch work.
- Settings/workshop shell files are high-touch for product changes.
- Generated types create large diffs; branch freshness and staging discipline matter.
- Feature branch/PR default remains the repo decision; do not auto-merge to main unless Philip explicitly authorizes it.

## GitNexus/code-review-graph implementation requirements

- Before editing any symbol, run impact analysis on the symbol/file: code-review-graph `get_impact_radius`/`detect_changes`, and GitNexus `gitnexus_impact` if available.
- If impact returns HIGH/CRITICAL, warn Philip before editing.
- Before commit, run code-review-graph `detect_changes` and GitNexus `gitnexus_detect_changes()` if exposed.
- For docs-only current plan, code-review-graph found low risk because only `.ai` docs are intended.

## Rollback strategy

1. If Terms copy issue only: deploy previous content version and leave acceptance table; require re-acceptance only if counsel says material.
2. If app gate issue: disable feature flag or revert protected gate; keep public Terms page.
3. If migration issue before gate: fix migration/RLS/grants before enabling app code.
4. If migration succeeds but app fails: leave table unused; app rollback does not lose acceptance records.
5. If privacy metadata concern: stop collecting raw metadata, hash/anonymize future records, consult counsel about existing records.
