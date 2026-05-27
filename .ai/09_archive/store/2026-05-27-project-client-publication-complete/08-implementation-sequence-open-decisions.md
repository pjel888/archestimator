# Implementation Sequence And Open Decisions

**Date:** 2026-05-27
**Status:** Implemented sequence record. Use this for remaining hardening and archive follow-through.

## Execution Model

Use staged implementation after this plan is approved. Keep each slice independently testable and reversible.

Recommended execution lanes:

1. Decision and test-contract lock.
2. Schema/RLS/security foundation.
3. Snapshot/view-model builder.
4. Manager actions and repository.
5. Header UI and settings modal.
6. Receiver route/password gate.
7. Open tracking summary.
8. Browser QA, remote verification, rollback rehearsal, and code review.

## Phase 0: Decision Lock And Red Test Plan

Inputs:

- `00-v1-decision-record.md`
- `07-tdd-qa-readiness-and-release-gates.md`
- `09-receiver-view-model-and-field-whitelist.md`
- `10-content-mode-snapshot-and-export-contract.md`

Tasks:

- Confirm V1 defaults.
- Create red tests for schema, actions, receiver resolver, header placement, Teamspaces naming, snapshot behavior, security headers, and tracking.
- Run graph/GitNexus impact analysis for exact symbols before code edits.

Exit criteria:

- Decision record is unchanged or explicitly updated.
- Red tests fail for expected missing behavior.
- New product code should not be added without a failing test.

## Phase 1: Schema/RLS/Security Foundation

Inputs:

- `11-schema-rls-migration-and-rollback-runbook.md`
- `12-security-rate-limit-and-session-runbook.md`

Tasks:

- Add publication tables and RLS.
- Add explicit grants/revokes.
- Add generated types.
- Add token/password hashing helpers after package/runtime decision.
- Add rate-limit store or reuse an approved existing mechanism.

Exit criteria:

- Schema tests pass.
- RLS remains enabled.
- Anon direct table reads remain blocked.
- Raw token/password columns do not exist.
- Linked remote verification plan is ready before any remote update claim.

## Phase 2: Snapshot Builder And Safe View Model

Inputs:

- `09-receiver-view-model-and-field-whitelist.md`
- `10-content-mode-snapshot-and-export-contract.md`

Tasks:

- Build sanitized publication DTOs.
- Build project snapshot generation for selected estimate sheets.
- Preserve total formula alignment with current estimate/charts/proposal logic.
- Exclude member/collaboration/internal metadata.
- Store payload schema version and content hash.

Exit criteria:

- Snapshot tests pass.
- Later project/estimate edits do not mutate receiver output.
- Safe payload excludes all listed private fields.

## Phase 3: Manager Actions And Repository

Recommended future files:

```txt
src/lib/publication/actions.ts
src/lib/publication/repository.ts
src/lib/publication/types.ts
src/lib/publication/snapshot.ts
```

Tasks:

- Create publication.
- Save settings.
- Set/replace password.
- Revoke.
- Create new public link.
- Update public page.
- Load publication summary for manager UI.

Exit criteria:

- Owner/admin tests pass.
- Editor/viewer rejection tests pass.
- Raw token returns only on create/rotate.
- Teamspaces action tests still pass.

## Phase 4: Header And Modal UI

Recommended future files:

```txt
src/components/workshop/ProjectPublicationHeader.tsx
src/components/workshop/ProjectPublicationSettingsDialog.tsx
src/components/workshop/ProjectPublicationStatusSummary.tsx
```

Tasks:

- Add `Publish` group left of Teamspaces.
- Rename Teamspaces private link copy.
- Add settings modal states.
- Add copy, preview, unpublish, rotate, republish controls.
- Keep estimate metadata strip and project code geometry unchanged.

Exit criteria:

- Header tests pass.
- Teamspaces remains rightmost.
- No UI component violates `DESIGN.md` product-system rules.

## Phase 5: Receiver Route And Password Gate

Recommended future route:

```txt
src/app/share/[token]/page.tsx
```

Tasks:

- Add receiver route outside `/workshop`.
- Add generic unavailable page.
- Add password gate.
- Add snapshot receiver view.
- Add noindex/no-store/referrer controls.

Exit criteria:

- Receiver resolver tests pass.
- Route/proxy tests pass.
- Password gate hides all project data before validation.
- No Workshop shell is rendered.

## Phase 6: Open Tracking And Manager Summary

Tasks:

- Record best-effort open event after successful receiver resolution.
- Do not count manager preview as receiver open.
- Store hashed/sanitized event metadata only.
- Show open count/latest-open in manager UI.
- Show tracking unavailable when event write fails.

Exit criteria:

- Open-tracking tests pass.
- Event retention behavior is represented.
- Copy avoids review/approval/acceptance claims.

## Phase 7: Release Evidence And Code Review

Inputs:

- `13-fixtures-browser-qa-and-release-evidence.md`
- `14-agent-execution-handoff.md`

Tasks:

- Run targeted Vitest tests.
- Run `bun run validate`.
- Run `bun run build`.
- Run `git diff --check`.
- Run browser smoke.
- Verify linked remote migration/RLS state if schema changed.
- Run code-review and address findings.

Exit criteria:

- All tests/checks pass or gaps are explicitly documented.
- No release blocker remains.
- Code review is clean.

## Parallelizable Work After Approval

These can run independently if write scopes are separated:

- Schema/RLS tests and migration.
- Header UI red tests.
- Receiver resolver red tests.
- Snapshot DTO tests.
- Security/header/redaction tests.
- Privacy/open-tracking copy and runbook.
- Browser QA script.

Do not parallelize two agents editing the same header component, same migration file, same snapshot builder, or same publication action module.

## Remaining Owner Gates

These are not unresolved defaults; they are launch gates:

| Gate | Default | What must happen before launch |
| --- | --- | --- |
| Legal/privacy | Pending-review pages block public launch | Reviewed Privacy/Terms replace status pages |
| Hashing package | Prefer platform/runtime support | Pick package/runtime before implementation |
| Rate-limit store | Must exist | Choose implementation that works on local/Vercel/Supabase path |
| Remote DB change | Not done by plan | Apply and verify only during approved implementation |
| Feature flag | Recommended | Decide whether to hide publication until launch proof |

## Risk Register

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Anonymous route leaks internal data | Critical | Server-only resolver, snapshot whitelist, no direct anon grants |
| Public link confused with collaborator invite | High | Separate UI, route, schema, and naming |
| Password brute force | High | Rate limits, generic failures, server-side validation |
| Revoked link works from cache | High | no-store and revocation check on every request |
| Tracking overclaims review | Medium | Copy says opened, not reviewed or approved |
| Mutable estimate changes after client receives link | High | Immutable snapshot plus explicit republish |
| Teamspaces regression | Medium | Placement and modal separation tests |
| Broad scope creep | Medium | staged phases and explicit V1 non-goals |

## Handoff Checklist

- [ ] Phase 0 decisions confirmed.
- [ ] Red tests created before code.
- [ ] Impact analysis run against exact symbols to be edited.
- [ ] Supabase migration plan reviewed for RLS and anon grants.
- [ ] Privacy/open-tracking copy reviewed.
- [ ] Browser QA target URL and auth bypass setup documented.
- [ ] Rollback plan exists for schema and public route launch.
- [ ] Code-review findings are clean before merge/release.
