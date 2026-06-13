# Priority Findings

Generated from the 2026-06-13 `$improve deep` audit. These are ranked by beta-readiness impact, confidence, and leverage.

## F1 - Ask Flip create-package Apply is not tab-aware

- **Category:** correctness, migration, AI write path
- **Severity:** high
- **Effort:** M
- **Risk:** MED
- **Confidence:** HIGH

### Evidence

- `src/lib/ai/package-builder/apply.ts:1346` still calls `create_project_estimate_package_with_history` for non-`fill_current_estimate` Apply.
- `supabase/migrations/20260528003000_ai_package_builder_apply_rpc.sql:317` inserts `estimate_nodes` without `estimate_tab_id`.
- `supabase/migrations/20260612094734_estimate_tabs_foundation.sql:134` makes `estimate_nodes.estimate_tab_id` `not null`.
- `tests/vitest/ai-package-builder-apply.test.ts:856` still asserts the old RPC call.

### Impact

Any enabled create-package Apply path can fail when it tries to insert estimate nodes against the tabbed schema.

### Recommendation

Route create-package Apply through a tab-aware RPC or flow that creates a default estimate tab and writes all new nodes with that tab id. Add a regression test that proves create-package Apply works after the estimate-tabs migration.

## F2 - Invite accept and sign-out routes need request-authenticity hardening

- **Category:** security, auth
- **Severity:** high
- **Effort:** M
- **Risk:** MED
- **Confidence:** HIGH

### Evidence

- `src/app/invite/[token]/accept/route.ts:71` accepts POST directly into invite acceptance.
- `src/app/invite/[token]/accept/route.ts:105` calls `accept_collaboration_invitation`.
- `src/app/invite/[token]/sign-out/route.ts:21` exposes sign-out over GET.
- `src/app/invite/[token]/sign-out/route.ts:29` calls `supabase.auth.signOut()`.
- Public share POST routes already have a same-origin plus CSRF pattern in `src/lib/publication/security.ts:240`.

### Impact

A browser with an active session can be induced into accepting a bearer invite or signing out without equivalent request-authenticity controls.

### Recommendation

Reuse the existing same-origin/CSRF pattern or introduce a general app CSRF helper for invite mutations. Keep GET routes read-only and make sign-out POST-only behind a tokenized form.

## F3 - Template editor reorder writes are not transactional

- **Category:** correctness, data integrity
- **Severity:** high
- **Effort:** M
- **Risk:** MED
- **Confidence:** HIGH

### Evidence

- `supabase/migrations/20260522091621_component_library_templates.sql:32` defines deferrable unique sort order for template nodes.
- `supabase/migrations/20260522091621_component_library_templates.sql:59` defines deferrable unique sort order for template row items.
- `src/lib/component-library/template-editor-actions.ts:215` reparents a node in one write.
- `src/lib/component-library/template-editor-actions.ts:222` then loops sibling `sort_order` updates one at a time.
- `src/lib/component-library/template-editor-actions.ts:443` loops row reorder updates one at a time.

### Impact

Common swaps can hit unique sort collisions because deferrable constraints only help inside one transaction. Later failures can also leave partial parent/order mutations committed.

### Recommendation

Move template node and row reorders into transaction-backed RPCs, matching the estimate-tree reorder pattern. Add tests for swaps and mid-loop failure rollback.

## F4 - Estimate creation is not atomic

- **Category:** correctness, data integrity
- **Severity:** high
- **Effort:** M
- **Risk:** MED
- **Confidence:** HIGH

### Evidence

- `src/lib/estimates/actions.ts:990` checks sheet-code availability before creation.
- `src/lib/estimates/actions.ts:992` inserts the estimate.
- `src/lib/estimates/actions.ts:1007` inserts the default tab separately.
- `src/lib/estimates/actions.ts:1033` inserts the root group separately.
- `src/lib/estimates/actions.ts:1110` can still fail on the final default area insert.

### Impact

A transient error or constraint failure after estimate creation can leave a persisted estimate with a missing or partial default tab/tree.

### Recommendation

Move default estimate, tab, and starter tree creation into one database transaction or history-aware RPC. Add a failure-path regression that proves no partial estimate remains.

## F5 - Public share comment and decision endpoints can leak backend errors

- **Category:** security, privacy
- **Severity:** high
- **Effort:** S
- **Risk:** LOW
- **Confidence:** HIGH

### Evidence

- `src/lib/publication/public-repository.ts:861` throws raw `insert_client_comment` RPC messages.
- `src/app/api/share/[token]/comment/route.ts:305` reads that message.
- `src/app/api/share/[token]/comment/route.ts:317` returns it as public JSON.
- `src/lib/publication/public-repository.ts:916` throws raw `submit_client_response` RPC messages.
- `src/app/api/share/[token]/decision/route.ts:225` returns the derived message as public JSON.
- `tests/vitest/project-publication-decision.test.tsx:199` only covers friendly not-found style errors, not arbitrary backend internals.

### Impact

Database, RPC, recipient, snapshot, or schema details can leak through public share endpoints.

### Recommendation

Log internal messages server-side only. Return fixed public messages by category: stale snapshot, duplicate decision, rate limit, missing recipient, and generic failure.

## F6 - Sheet-code uniqueness is app-side only

- **Category:** correctness, data integrity
- **Severity:** high
- **Effort:** S
- **Risk:** LOW
- **Confidence:** HIGH

### Evidence

- `src/lib/estimates/actions.ts:916` generates sheet codes from a prior read.
- `src/lib/estimates/actions.ts:931` checks manual availability from a prior read.
- `src/lib/estimates/actions.ts:990` checks availability before insert.
- `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql:26` adds `(id, project_id)` uniqueness only.
- No migration was found for unique `project_id + sheet_code`.

### Impact

Concurrent create, duplicate, or regenerate requests can pass availability checks and commit duplicate sheet codes in one project.

### Recommendation

Add a case-insensitive unique constraint or index for active `project_id + sheet_code`, reconcile existing duplicates, and treat DB unique violations as authoritative conflicts.

## F7 - Active-tab AI reads can drop relevant rows

- **Category:** correctness, AI read context
- **Severity:** medium-high
- **Effort:** S to M
- **Risk:** LOW to MED
- **Confidence:** HIGH

### Evidence

- `src/lib/ai/package-builder/read-tools.ts:217` sets `DEFAULT_ROW_LIMIT = 80`.
- `src/lib/ai/package-builder/read-tools.ts:717` reads rows by estimate id only.
- `src/lib/ai/package-builder/read-tools.ts:722` applies the row limit before active-tab row filtering.
- `src/lib/ai/package-builder/read-tools.ts:730` filters rows in memory to scoped node ids.
- `src/lib/ai/read-context.ts:16` sets `ASK_READ_CONTEXT_CURRENT_ESTIMATE_ROW_LIMIT = 48`.
- `src/lib/ai/read-context.ts:1921` reads rows by estimate id only before tab grouping.

### Impact

If other tabs consume the limited row window first, Ask Flip and package-builder context can miss rows from the active tab.

### Recommendation

Read tab-scoped nodes first, then query rows by scoped node ids, or join/filter by tab at the SQL boundary. Add tests where another tab has enough earlier rows to exhaust the limit.

## F8 - Dependency audit is not clean

- **Category:** dependency, security
- **Severity:** medium-high
- **Effort:** M
- **Risk:** MED
- **Confidence:** HIGH

### Evidence

- `package.json:61` includes runtime dependency `exceljs`.
- `bun.lock:1104` locks `exceljs@4.4.0` with transitive `tmp` and `uuid`.
- `src/lib/proposal-export/create-proposal-workbook.ts:1` imports `ExcelJS` on the server export path.
- `package.json:78`, `package.json:94`, and `package.json:97` include Storybook and Vite tooling.
- `bun.lock:1062` locks `esbuild@0.27.7`.
- Fresh `bun audit` reported:
  - `tmp <0.2.6`, high, via `exceljs`.
  - `esbuild >=0.17.0 <0.28.1`, high and low, via Storybook/Vite.
  - `postcss <8.5.10`, moderate, via Tailwind/Next/Vite.
  - `uuid <11.1.1`, moderate, via `exceljs`.

### Impact

The runtime XLSX export chain and dev/build tooling have active advisories. The runtime reachability of every advisory needs triage, but dependency-health claims are not clean today.

### Recommendation

Split runtime export remediation from dev-tooling remediation. Upgrade or override vulnerable transitives where compatible, then rerun workbook export tests, Storybook validation, build, and `bun audit`.

## F9 - Provider-gated beta flows can look greener than reality

- **Category:** testing, release readiness
- **Severity:** medium-high
- **Effort:** M
- **Risk:** MED
- **Confidence:** HIGH

### Evidence

- `.github/workflows/ci.yml:28` runs `bun run test:e2e`.
- `e2e/project-invite-entry.spec.ts:34` skips unless `ARCHESTIMATOR_E2E_INVITE_ENTRY=1`.
- `e2e/teamspace-collaboration.spec.ts:28` skips unless `ARCHESTIMATOR_E2E_COLLABORATION=1`.
- `e2e/ask-flip-package-builder-live.spec.ts:20` skips unless `ARCHESTIMATOR_E2E_AI_PACKAGE_BUILDER=1`.
- `.ai/10_state/current-state.md:4` keeps linked Supabase, hosted export/deploy, collaboration QA, responsive/browser, bookmark export, and hosted invite/share/publication proof open.

### Impact

High-risk beta flows can remain skipped while CI or local validation appears green.

### Recommendation

Create a staging-safe manual or scheduled evidence lane with isolated test accounts and explicit cleanup. Treat skipped live E2E as open evidence, not green proof.

## F10 - Supabase launch readiness checks omit estimate-tabs readiness

- **Category:** migration, release readiness
- **Severity:** medium
- **Effort:** S to M
- **Risk:** LOW
- **Confidence:** HIGH

### Evidence

- `scripts/check-supabase-migration-readiness.ts:6` lists only older launch migrations.
- `scripts/sql/linked-supabase-launch-readiness.sql:9` required migrations stop at the June 1/2 closed-beta set.
- `supabase/migrations/20260612094734_estimate_tabs_foundation.sql:12` creates `public.estimate_tabs`.
- `.ai/10_state/current-state.md:4` still separates linked Supabase proof from local implementation proof.

### Impact

Linked-readiness checks can appear launch-green while estimate-tabs provider proof is still outside the gate.

### Recommendation

Add estimate-tabs migration, table, function, grant, and policy checks to the readiness script and SQL probe. Keep local and provider proof boundaries explicit.

## F11 - Large unbounded reads will hurt beta-scale workflows

- **Category:** performance
- **Severity:** medium
- **Effort:** M
- **Risk:** MED
- **Confidence:** HIGH

### Evidence

- `src/lib/repositories/workspace-repository.ts:706` starts project-list reads for the projects page.
- `src/lib/repositories/workspace-repository.ts:707` reads owned projects with `select("*")` and no pagination.
- `src/lib/repositories/workspace-repository.ts:787` fetches publication rows for all assembled project items.
- `src/components/workshop/EstimateSheetContent.tsx:722` lazily loads the workspace component library.
- `src/lib/repositories/component-library-repository.ts:537` reads all active `cost_library_items`.
- `src/lib/repositories/component-library-repository.ts:573` then reads price options, versions, history, cost entries, and attachments for all item ids.

### Impact

Server render and interactive sheet actions grow with total workspace data rather than visible page or selected item scope.

### Recommendation

Add paginated/list-summary read boundaries for projects. Split component library loading into lightweight taxonomy/counts plus paged/search item reads and selected-item detail fetches.

## F12 - Current state has stale generated-type blocker wording

- **Category:** docs, source of truth
- **Severity:** medium
- **Effort:** S
- **Risk:** LOW
- **Confidence:** HIGH

### Evidence

- `.ai/10_state/current-state.md:29` says generated Supabase types still lack estimate-tab function entries.
- `src/lib/supabase/types.ts:2064` includes `estimate_tabs`.
- `src/lib/supabase/types.ts:3237` includes estimate-tab RPC entries.
- `.ai/10_state/current-state.md:4` correctly keeps provider/manual proof open.

### Impact

Agents can chase a closed local-type blocker and misreport the real readiness boundary.

### Recommendation

Replace stale generated-type wording with the current boundary: local generated type entries are present, but provider/manual proof remains open.
