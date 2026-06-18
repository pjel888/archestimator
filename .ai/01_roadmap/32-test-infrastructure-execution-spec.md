# Test Infrastructure Execution Spec

**Last updated:** 2026-05-30
**Purpose:** Precise test infrastructure plan to fix ambiguity around RLS/storage/API tests. This does NOT create test files — it documents what Codex should create and how.

> **RECONCILIATION NOTE (2026-06-18, code-verified):** The *staging-Supabase + `RUN_STAGING_TESTS`* approach proposed below was **NOT adopted** as written. No `tests/integration/` or `tests/performance/` directory exists, and none of the proposed gate env vars (`RUN_STAGING_TESTS`, `SUPABASE_STAGING_URL`, `ARCHESTIMATOR_STAGING_TESTS`, `RUN_MUTATING_E2E`, `SKIP_STAGING_TESTS`) are referenced anywhere in the repo. The **actual** shipped RLS/parity proof mechanism is the ephemeral-local-Postgres harness set under `scripts/prove-*-postgres.mjs` (5 scripts, wired as `prove:*` in `package.json`) — these spin up a temp PG cluster, apply real `supabase/migrations/`, and assert access decisions / RPC parity. They are NOT in CI (`.github/workflows/ci.yml`) and require local Postgres binaries. The "Future Test File Paths" at the bottom of this doc are all still **absent** (none created). Treat Sections 2–13 below as the original (now-superseded) proposal; the prove-harness reality is the current truth. See "Actual implemented state" callouts inline.

---

## Canonical Test Approach

```
RLS/storage integration tests: Vitest or Bun test using @supabase/supabase-js against staging Supabase.
Browser/user-flow tests: Playwright.
Mocked auth is NOT acceptable for RLS proof.
Service role may be used only for setup/teardown, NEVER for assertions.
Assertions must use authenticated user clients.
```

---

## 1. Test Runner Recommendation

| Test Type | Runner | Rationale |
|-----------|--------|-----------|
| Unit tests | Bun test (`bun run test`) | Already configured under `tests/unit/` |
| DOM/component tests | Vitest + jsdom (`bun run test:dom`) | Already configured under `tests/vitest/` — ~350 test files (361 incl. subdirs) as of 2026-06-18 [was: 115; evidence: `find tests/vitest -name '*.test.ts*'`] |
| Integration (RLS/storage/API) | Vitest or Bun test with direct Supabase client | Needs real Supabase connection; recommend Vitest for consistency with existing DOM tests. **[NOT BUILT as proposed — `tests/integration/` does not exist; actual RLS proof shipped as `scripts/prove-*-postgres.mjs`, see reconciliation note]** |
| E2E (browser flows) | Playwright (`bun run test:e2e`) | Already configured — 18 spec files under `e2e/` as of 2026-06-18 [was: 7; evidence: `ls e2e/*.spec.ts`]. Note: 16 of 18 are env-gated (`ARCHESTIMATOR_E2E_*` / `PLAYWRIGHT_STORAGE_STATE`), so only `auth.spec.ts` + `landing-audit.spec.ts` run ungated. |
| Performance | Custom benchmarks (Vitest or standalone scripts) | Use `performance.now()` instrumentation or Lighthouse CLI |

## 2. Environment Requirements

### Staging Supabase (required for security/RPC/integration tests):

- Separate Supabase project (NOT `ebxxqidacheyapmmzavr`)
- All migrations applied — **110 migration files** in `supabase/migrations/` as of 2026-06-18 [was: 48; evidence: `ls supabase/migrations/*.sql`]. (Whether they are applied to any hosted/staging project is an EXTERNAL fact this doc cannot prove; readiness is checked by `scripts/check-supabase-migration-readiness.ts`.)
- Separate auth users, service-role keys, storage buckets
- Seed data script for test accounts and workspaces

### Local Supabase (fallback):

- `npx supabase start` for local Docker Supabase
- Can run RLS denial tests locally
- Cannot test email, OAuth, or Vercel-deployed behaviors

### Test Environment Variables:

```bash
# Staging tests (real Supabase)
SUPABASE_STAGING_URL=https://[staging-project].supabase.co
SUPABASE_STAGING_ANON_KEY=[staging-anon-key]
SUPABASE_STAGING_SERVICE_ROLE_KEY=[staging-service-role-key]

# Test gate flags
RUN_STAGING_TESTS=1           # Set to enable staging-dependent tests
RUN_MUTATING_E2E=1            # Set to enable mutating Playwright specs
SKIP_STAGING_TESTS=1          # Set to skip staging tests (local-only CI)
```

### Required Environment Variables (PROPOSED)

> **Note:** These variable names are PROPOSED and may differ from existing conventions.
> Existing conventions use `SUPABASE_STAGING_URL` / `RUN_STAGING_TESTS` / `SKIP_STAGING_TESTS`.
> Final names must be reconciled before Codex creates test files that reference these.

```bash
# Staging test gate
ARCHESTIMATOR_STAGING_TESTS=1

# Staging Supabase connection
NEXT_PUBLIC_SUPABASE_STAGING_URL=
NEXT_PUBLIC_SUPABASE_STAGING_ANON_KEY=
SUPABASE_STAGING_SERVICE_ROLE_KEY=

# Test user credentials (created in staging Supabase Auth)
ARCHESTIMATOR_TEST_USER_A_EMAIL=
ARCHESTIMATOR_TEST_USER_A_PASSWORD=
ARCHESTIMATOR_TEST_USER_B_EMAIL=
ARCHESTIMATOR_TEST_USER_B_PASSWORD=

# Test workspace prefix (avoids collision with real data)
ARCHESTIMATOR_TEST_WORKSPACE_PREFIX=ae_test_
```

### Test Accounts:

Create dedicated test accounts in staging:
- `EMAIL_PLACEHOLDER` — Workspace A owner
- `EMAIL_PLACEHOLDER` — Workspace B owner
- `EMAIL_PLACEHOLDER` — Invited collaborator
- `EMAIL_PLACEHOLDER` — Read-only access

Do NOT use real user accounts for testing.

## 3. Staging Supabase Test Strategy

**Golden rule:** No test should ever touch production Supabase.

| Test Category | Environment | Gate |
|--------------|-------------|------|
| RLS denial tests | Staging Supabase (or local fallback) | `RUN_STAGING_TESTS=1` or local |
| Storage denial tests | Staging Supabase (or local fallback) | `RUN_STAGING_TESTS=1` or local |
| API auth audit | Any environment (reads source, not DB) | Always runs |
| Invite lifecycle E2E | Staging Supabase + staging Vercel | `RUN_STAGING_TESTS=1` |
| Shared-link boundary E2E | Staging Supabase + staging Vercel | `RUN_STAGING_TESTS=1` |
| Performance smoke | Staging Vercel (realistic environment) | `RUN_STAGING_TESTS=1` |

## 4. Local Supabase Fallback

For CI or offline development:

```bash
# Start local Supabase
npx supabase start

# Run RLS tests locally
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_ANON_KEY=[local-anon-key] \
SUPABASE_SERVICE_ROLE_KEY=[local-service-role-key] \
bun run test tests/integration/rls-isolation.test.ts
```

## 5. Why Docker/Local Supabase May Be Blocked

- Docker may not be installed or running on some development machines
- CI runners may not support Docker (GitHub Actions macOS runners)
- Local Supabase may not have all migrations applied (drift risk)
- Local Supabase may not support Realtime channels needed for some tests

**Mitigation:**
- All staging-dependent tests are gated behind `RUN_STAGING_TESTS=1`
- Local fallback works when Docker is available
- CI can run a subset of tests (unit + DOM + API audit) without Docker
- Full security test suite requires staging Supabase (external setup)

## 6. Gating Tests with Env Vars

```typescript
// tests/integration/rls-isolation.test.ts
const RUN_STAGING = process.env.RUN_STAGING_TESTS === '1'

if (!RUN_STAGING) {
  describe.skip('RLS denial tests (requires staging Supabase)')
} else {
  describe('RLS denial tests', () => {
    // Real Supabase client with staging credentials
    const supabaseA = createClient(
      process.env.SUPABASE_STAGING_URL!,
      process.env.SUPABASE_STAGING_ANON_KEY!
    )
    // ... tests
  })
}
```

## 7. RLS Denial Test Architecture

Pattern for every RLS-protected table:

```typescript
describe('RLS: [table_name]', () => {
  beforeAll(async () => {
    // Sign in as Workspace A user
    await supabaseA.auth.signInWithPassword({ email: testEmailA, password: testPassword })
    // Sign in as Workspace B user
    await supabaseB.auth.signInWithPassword({ email: testEmailB, password: testPassword })
    // Seed data in Workspace A
    await seedDataInWorkspaceA(supabaseA)
  })

  afterAll(async () => {
    // Clean up seeded data
    await cleanupWorkspaceAData(supabaseA)
  })

  test('user B cannot READ rows from Workspace A', async () => {
    const { data, error } = await supabaseB
      .from('[table_name]')
      .select('*')
      .eq('workspace_id', workspaceAId)

    // Must return empty (RLS filters out) or error (RLS denies)
    expect(data).toHaveLength(0)
  })

  test('user B cannot WRITE rows to Workspace A', async () => {
    const { error } = await supabaseB
      .from('[table_name]')
      .insert({ workspace_id: workspaceAId, /* ... */ })

    // Must return RLS policy error
    expect(error).not.toBeNull()
  })

  test('user B cannot UPDATE rows in Workspace A', async () => {
    const { error } = await supabaseB
      .from('[table_name]')
      .update({ name: 'hacked' })
      .eq('workspace_id', workspaceAId)

    expect(error).not.toBeNull()
  })

  test('user B cannot DELETE rows in Workspace A', async () => {
    const { error } = await supabaseB
      .from('[table_name]')
      .delete()
      .eq('workspace_id', workspaceAId)

    expect(error).not.toBeNull()
  })
})
```

**Tables to cover:** workspaces, projects, estimate_sheets, estimate_nodes, estimate_row_items, cost_library_items, project_members, collaboration_invitations, project_publications, shared_link_recipients, shared_link_comments, estimate_sheet_versions, cost_library_item_versions, workspace_profiles, project_cover_images, component_library_attachments, component_library_images.

**Coverage target:** 100% of user-data tables.

## 8. Storage Denial Test Architecture

```typescript
describe('Storage: cross-workspace access denial', () => {
  test('user B cannot download Workspace A file', async () => {
    // Upload file as Workspace A
    const { data: uploadData } = await supabaseA.storage
      .from('component-library-attachments')
      .upload(`workspace-${workspaceAId}/test.pdf`, testFile)

    // Attempt download as Workspace B
    const { data, error } = await supabaseB.storage
      .from('component-library-attachments')
      .download(`workspace-${workspaceAId}/test.pdf`)

    expect(error).not.toBeNull()
  })

  test('user B cannot list Workspace A bucket contents', async () => {
    const { data, error } = await supabaseB.storage
      .from('component-library-attachments')
      .list(`workspace-${workspaceAId}`)

    expect(data).toHaveLength(0)
  })
})
```

**Buckets to cover:** component-library-attachments, component-library-images, project-cover-images.

## 9. API/Server-Action Auth Audit Architecture

```typescript
describe('API route auth audit', () => {
  // Enumerate all /api/* routes
  const apiRoutes = [
    '/api/ai/ask',
    '/api/ai/package-builder',
    '/api/component-library/attachments',
    '/api/component-library/images',
    '/api/projects/images',
    '/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx',
    '/api/share/[token]',
    '/api/share/[token]/password',
    // ... all routes from src/app/api/
  ]

  for (const route of apiRoutes) {
    test(`${route} rejects unauthenticated requests`, async () => {
      const res = await fetch(`${baseUrl}${route}`, { method: 'POST' })
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500) // 401 or 403, not 500
    })
  }
})
```

**Also audit manually:** Every server action in `src/lib/*/actions.ts` must check `getSession()` or `verifyUser()` before data access.

## 10. Playwright Multi-Session Architecture

For invite lifecycle and shared-link boundary tests:

```typescript
// tests/e2e/staging-invite-lifecycle.spec.ts
test('full invite lifecycle', async ({ browser }) => {
  // Create two isolated browser contexts (simulating two users)
  const ownerContext = await browser.newContext()
  const inviteeContext = await browser.newContext()

  const ownerPage = await ownerContext.newPage()
  const inviteePage = await inviteeContext.newPage()

  // Sign in as owner
  await ownerPage.goto(stagingUrl + '/login')
  // ... authenticate as workspace owner

  // Create invite
  await ownerPage.goto(stagingUrl + '/workshop/settings/workspace')
  // ... issue invitation

  // Copy invite link and navigate as invitee
  // ... accept invite, verify redirect

  // Clean up
  await ownerContext.close()
  await inviteeContext.close()
})
```

## 11. Test Data Setup/Teardown Strategy

```typescript
// tests/integration/setup.ts
export async function setupTestWorkspace(supabase: SupabaseClient, suffix: string) {
  // Create test workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .insert({ name: `test-workspace-${suffix}` })
    .select()
    .single()

  // Create test project
  const { data: project } = await supabase
    .from('projects')
    .insert({ workspace_id: workspace.id, name: `test-project-${suffix}` })
    .select()
    .single()

  return { workspace, project }
}

export async function cleanupTestData(supabase: SupabaseClient, workspaceId: string) {
  // Delete in reverse dependency order
  await supabase.from('estimate_row_items').delete().eq('workspace_id', workspaceId)
  await supabase.from('estimate_nodes').delete().eq('workspace_id', workspaceId)
  await supabase.from('estimate_sheets').delete().eq('workspace_id', workspaceId)
  await supabase.from('projects').delete().eq('workspace_id', workspaceId)
  await supabase.from('workspaces').delete().eq('id', workspaceId)
}
```

**Cleanup rule:** Always clean up in `afterAll()`. Use a unique suffix (timestamp or UUID) to avoid collisions. Log any cleanup failures — do NOT silently fail.

### Test Data Rules

1. **Test data must be prefixed** with `ae_test_[goal_id]_[timestamp]` (e.g., `ae_test_BETA-P0-SEC-001B_2026-05-30T14-00-00Z`).
2. **Setup must create two independent users/workspaces/projects/estimates** — one for Workspace A, one for Workspace B — to exercise cross-tenant RLS boundaries.
3. **Teardown must remove all test-created rows and storage objects.** Delete in reverse dependency order (leaf tables first, then parents).
4. **Tests must fail closed if teardown fails** — log the failure, mark the test suite as incomplete, do NOT silently pass.
5. **Tests must never use the owner's real workspace** as a test target. All test data is isolated to dedicated staging test accounts.
6. **Tests must never use production Supabase** (`ebxxqidacheyapmmzavr`). Staging only.
7. **Tests must skip cleanly when staging env vars are missing**, but **skipped tests do NOT count as evidence.** A skipped test suite is not a passing test suite.

## 12. Evidence Artifact Requirements

Every test run must save evidence to:
```
.ai/09_archive/store/YYYY-MM-DD-[goal-id]/
  01-validation-output.md     — Full test output
  04-security-notes.md        — RLS/storage/auth test results
```

**Required evidence per test suite:**
- Test run output (pass/fail per test, coverage percentage)
- Any failed tests with error messages
- Table/bucket coverage report (which tables/buckets were tested)
- CI job URL if running in CI

## 13. Commands to Add Later

After test files are created:

```bash
# RLS denial tests (staging)
bun run test tests/integration/rls-isolation.test.ts

# Storage denial tests (staging)
bun run test tests/integration/storage-isolation.test.ts

# API auth audit
bun run test tests/integration/api-auth-audit.test.ts

# Full security suite (all integration tests)
bun run test tests/integration/

# Staging E2E (requires RUN_MUTATING_E2E=1)
bun run test:e2e tests/e2e/staging-invite-lifecycle.spec.ts
bun run test:e2e tests/e2e/staging-shared-link-boundary.spec.ts

# Performance smoke
bun run test tests/performance/core-performance-smoke.test.ts

# Full pre-beta validation
bun run validate && bun run test tests/integration/ && bun run test:e2e
```

## 14. What NOT to Test Yet

| Area | Why Not Now |
|------|------------|
| PDF export correctness | PDF not required for beta |
| Immutable snapshot integrity | Immutable proposals not required for beta |
| Billing/payment flows | No payment during beta |
| Offline mutation queue | Post-MVP |
| i18n/localization | Post-MVP |
| Full accessibility (WCAG 2.1 AA) | Enterprise MVP |
| Full cross-browser matrix | Enterprise MVP |
| Load testing (> 50 concurrent users) | Public launch |
| Penetration testing (third-party) | Post-beta |

---

## Future Test File Paths (Documented — Do NOT Create Now)

```
tests/integration/rls/core-hierarchy-denial.test.ts
tests/integration/rls/collaboration-denial.test.ts
tests/integration/rls/publication-denial.test.ts
tests/integration/rls/component-library-denial.test.ts
tests/integration/storage/component-images-denial.test.ts
tests/integration/storage/component-attachments-denial.test.ts
tests/integration/api/api-auth-audit.test.ts
tests/e2e/staging/invite-lifecycle.spec.ts
tests/e2e/staging/shared-link-boundary.spec.ts
tests/performance/core-performance-smoke.test.ts
```

**Note:** These are DOCUMENTATION ONLY — do not create these files now. These paths are documented for Codex to create when executing corresponding goal cards. They are implementation artifacts for future Codex runs.

> **STATUS (2026-06-18, code-verified):** NONE of the file paths above have been created — all are still absent (checked: `tests/integration/rls/`, `tests/integration/storage/`, `tests/integration/api/`, `tests/e2e/staging/`, `tests/performance/` do not exist). The RLS/parity coverage that *did* ship instead lives at:
> - `scripts/prove-rls-initplan-postgres.mjs` (auth.uid() initplan rewrite is access-decision-neutral)
> - `scripts/prove-notification-rls-postgres.mjs` (notification RLS)
> - `scripts/prove-estimate-tabs-postgres.mjs` (estimate_tabs RLS)
> - `scripts/prove-estimate-list-summaries-postgres.mjs` (RPC vs JS-oracle byte parity)
> - `scripts/prove-unify-estimate-node-kinds-postgres.mjs` (node-kind unification semantics)
>
> These run against an ephemeral local Postgres (require local PG binaries) and are NOT in CI. So the doc's planned integration/storage/api/staging-e2e/perf test files remain GHOSTS (planned, never built); the prove-harnesses are the actual implemented substitute. Storage-denial and full per-table RLS-denial matrix tests (Sections 7–8) are still not implemented in any form.

---

*This spec unblocks BETA-P0-SEC-001, SEC-002, SEC-003, SEC-004, and PERF-001 by providing precise implementation guidance. The ambiguity around "how to test RLS/storage/API" is now resolved.*
