# Implementation Sequence

> Future implementation only. This planning task made no production source changes.

## What not to touch without explicit scope

- Do not modify unrelated estimating, proposal export, share, AI, collaboration, component-library, or billing code.
- Do not add dependencies.
- Do not touch secrets or provider dashboards.
- Do not touch archestimator resources.
- Do not broad-run `supabase db push`.
- Do not mark feature implemented in `.ai` until validation is complete.

## Sequence overview

### Phase 0 — Re-verify live reality

**Files/commands:** `AGENTS.md`, `.ai/README.md`, `.ai/00_system/*`, `.ai/10_state/*`, `DESIGN.md`, `package.json`, route tree, migrations.

- [ ] Run safety commands from `02_CODEBASE_RESEARCH.md`.
- [ ] Confirm branch/worktree and no unrelated dirty files.
- [ ] Use code-review-graph/GitNexus impact analysis before editing symbols.
- [ ] Re-read local Next docs if editing Proxy, route handlers, `cookies()`, `headers()`, redirects, server actions, or App Router conventions.
- [ ] Re-check Supabase changelog/docs before migrations/RLS.

**Validation:** evidence recorded in implementation log.
**Rollback point:** no changes yet.

### Phase 1 — Confirm legal/product requirements and final approved Terms copy

**Files likely involved:** `.ai/10_state/decisions.md`, `.ai/10_state/current-state.md`, this plan folder, legal copy source file later.

- [ ] Obtain counsel-reviewed Terms and Privacy copy or explicit instruction to implement infrastructure only.
- [ ] Resolve open decisions: entity name, governing law, notices contact/address, arbitration/class waiver, consumer/B2B positioning, refund/cancellation policy, IP/user-agent retention, re-acceptance policy.
- [ ] Record decisions in `.ai/10_state/decisions.md`.
- [ ] Do not deploy production Terms text unless legal approval is recorded.

**Validation:** legal approval artifact/path/reference exists; no unsupported legal claims.
**Rollback point:** keep existing `/terms` copy and stop.

### Phase 2 — Add versioned Terms content source

**Likely files:** `src/lib/legal/terms-content.ts`, `src/app/terms/page.tsx`, `src/app/privacy/page.tsx` if Privacy metadata changes.

- [ ] Add `CURRENT_TERMS` metadata: key, version, effectiveDate, contentHash, legalReviewReference, privacyVersion.
- [ ] Render Terms page from reviewed content or structured sections.
- [ ] Show version and effective date.
- [ ] Keep Privacy link visible.
- [ ] Preserve public access and marketing/public page shell.

**Validation:** unit test content metadata; DOM smoke for `/terms`; `bun run lint:design-system` if app/workshop UI touched; `git diff --check`.
**Rollback point:** revert content/source files; no DB changes yet.

### Phase 3 — Add Supabase schema/migration for acceptance tracking

**Likely files:** `supabase/migrations/<generated>_terms_acceptance.sql`, `src/lib/supabase/types.ts`, SQL tests/contracts.

- [ ] Run `supabase --help` and `supabase migration new terms_acceptance` per repo rules.
- [ ] Create table(s) with append-only acceptance history.
- [ ] Add explicit grants required by Supabase Data API behavior.
- [ ] Enable RLS and policies.
- [ ] Add indexes and constraints for idempotency and latest-version lookup.
- [ ] Avoid raw IP/UA unless approved; prefer hashes if collecting.
- [ ] Update generated Supabase types using repo-approved command.

**Validation:** local migration apply/list if environment is available; RLS denial tests; typecheck.
**Rollback point:** do not enable app gate until migration is applied and proven.

### Phase 4 — Add server-side acceptance persistence path

**Likely files:** `src/lib/legal/terms-acceptance.ts`, `src/app/api/legal/terms-acceptance/route.ts` or server action, tests.

- [ ] Derive authenticated user via verified Supabase server client.
- [ ] Validate requested version against `CURRENT_TERMS` server-side.
- [ ] Stamp `accepted_at`, user id, version, context, and optional hashed metadata server-side.
- [ ] Make duplicate accept idempotent.
- [ ] Return safe error messages without DB/provider leakage.

**Validation:** unit/route tests for success, duplicate, unauthenticated, wrong version, DB failure.
**Rollback point:** persistence path can exist unused while gate remains off.

### Phase 5 — Add read path for acceptance status

**Likely files:** `src/lib/legal/terms-acceptance.ts`, possibly `src/lib/auth/session.ts` or new helper.

- [ ] Query latest current-user acceptance for required Terms key/version.
- [ ] Return explicit status object.
- [ ] Avoid broad data queries and avoid Proxy hot path unless measured.
- [ ] Treat read failure as protected-app fail-safe with recoverable UI.

**Validation:** unit tests for current, missing, old-version, duplicate rows.
**Rollback point:** status helper unused until UI gate is enabled.

### Phase 6 — Add signup/onboarding/protected-route/account UI flow

**Likely files:** `src/app/login/page.tsx`, protected acceptance page/sheet, workshop shell/page, settings page/card, components under `src/components/workshop`.

- [ ] Keep login Terms/Privacy notice links.
- [ ] Add post-auth first protected access acceptance gate tied to user id.
- [ ] Use explicit checkbox/button copy: user acknowledges reviewed Terms and responsibility to verify outputs.
- [ ] Add settings/account legal link/status.
- [ ] Ensure `/terms`/`/privacy`/`/login`/`/auth/callback`/`/beta`/`/invite`/`/share` remain accessible.
- [ ] Use shared primitives and app/workshop design constraints.

**Validation:** DOM tests and E2E for new user, accepted user, old-version user, keyboard/focus, save failure; `bun run lint:design-system`; `bun run test:e2e`.
**Rollback point:** feature flag/gate can be disabled while routes/content remain.

### Phase 7 — Add re-acceptance behavior for material Terms changes

**Likely files:** Terms version constants, acceptance status helper, protected UI gate.

- [ ] Implement required-version comparison.
- [ ] Implement legal/product-approved hard gate or grace period.
- [ ] Show summary of material update and link to full Terms.
- [ ] Record acceptance context as `reacceptance`.

**Validation:** tests for old version triggers, current version not repeated, grace/hard-gate behavior.
**Rollback point:** revert required version constant or disable hard gate by feature flag if legal copy issue arises.

### Phase 8 — Add tests

**Required coverage:**

- [ ] Unit: content metadata, status helper, duplicate idempotency, validation.
- [ ] Route/action: acceptance save success/failure/auth/version.
- [ ] DOM: component states and accessibility.
- [ ] E2E: new user acceptance, returning user, old-version reacceptance, save failure.
- [ ] RLS: user A cannot read/write user B acceptance rows.

**Validation:** `bun run validate`, targeted tests, `bun run test:e2e`.

### Phase 9 — Full validation

Run:

```bash
git status --short --branch
git diff --check
bun run validate
bun run build
bun run test:e2e
bun run lint:design-system
```

Supabase/provider validation only after migration and under safety rules:

- local migration list/apply proof.
- linked migration parity only for ArchEstimator project `ebxxqidacheyapmmzavr`.
- RLS/grant proof and advisory checks.

### Phase 10 — Update `.ai`

- [ ] Update `.ai/10_state/current-state.md` with implementation status and evidence.
- [ ] Update `.ai/10_state/decisions.md` with legal/product decisions and version metadata.
- [ ] Update `.ai/04_tasks` and `.ai/05_logs` with validation and rollout evidence.
- [ ] Create `.ai/15_Bugs` entries for any defects or blockers.
- [ ] Do not mark launch-ready until legal/provider/manual gates are actually complete.

### Phase 11 — Archive plan after implementation

- [ ] Move/copy final implementation evidence to `.ai/09_archive` under existing archive conventions.
- [ ] Leave a pointer from `.ai/03_plans/README.md`.
- [ ] Commit/push on scoped branch and open PR unless Philip explicitly authorized main merge.

## Dependencies between steps

- Legal approval must precede production Terms copy.
- Schema/migration must precede active gate.
- Generated types must follow schema changes before TypeScript validation.
- Server persistence/status paths must precede UI gate.
- Tests must accompany each behavioral phase.
- `.ai` updates and plan archive occur only after verified implementation.
