# Remediation Plan

This is a planning artifact only. It intentionally does not apply migrations or change provider state.

## Principle

Repair the ledger first, then apply missing app-facing schema, then harden grants/functions/RLS, then regenerate types. Do not mix these steps into one database push.

## Phase 0: Freeze Unsafe Paths

Until migration parity is resolved:

- Do not run blind `supabase db push`.
- Do not mass-apply all local-only migrations.
- Do not commit the untracked P6 migration as canonical without reconciling it to remote SQL.
- Keep `AI_PACKAGE_BUILDER_MEMORY_ENABLED` off unless its table is applied.
- Treat notification UI/actions as unsafe against linked provider until notification tables are applied or code is gated.

## Phase 1: Build The Migration Ledger Map

Create a formal mapping of:

- local migration version;
- local migration name;
- remote migration version;
- remote migration name;
- whether body/effect is equivalent;
- whether repair should use file rename, migration repair, or a new superseding migration.

Required checks:

1. Compare timestamp-alias migrations by name and object effect.
2. Query function definitions for RPC migrations before marking aliases equivalent.
3. Verify the actual SQL/effect of remote P6 and reconcile the untracked local P6 file.
4. Decide whether the repository should preserve remote timestamps or repair remote history to local timestamps.

Only after this mapping should `supabase migration repair` be considered.

## Phase 2: Fix App-Facing Missing Objects

Recommended order:

1. `delete_library_folder` RPC.
   - Reason: app code calls it directly.
   - Validation: targeted component-library folder delete test plus provider RPC existence check.
2. Notification tables.
   - Reason: code/types reference them.
   - Decision gate: if notifications are closed-beta scope, apply; if not, gate/remove runtime calls.
   - Validation: `prove:notification-rls` after provider apply.
3. AI package-builder memory table.
   - Reason: feature-flagged, lower immediate risk.
   - Decision gate: apply only if memory feature will be enabled.
4. Estimate sibling-order storage.
   - Reason: `.ai/10_state/decisions.md` says this is needed for full slot-preserving insert contract.
   - Required change: rewrite against the current tab-aware `create_estimate_node_with_history` signature.
   - Validation: targeted estimate-node create/reorder tests and provider function-body check.
5. Seed/data repair migrations.
   - Reason: local deterministic seed IDs do not match current remote evidence.
   - Decision gate: confirm whether exact Lewis Residence deterministic IDs still matter.
6. `get_project_chart_buckets`.
   - Reason: future optimization only.
   - Required change: add explicit public/anon execute revokes before apply.
   - Validation: route chart tests after code is wired to use the RPC.

## Phase 3: Security And RLS Hardening

Run after ledger and app-facing schema are stable:

1. Re-run official Supabase advisors with updated CLI.
2. Classify all security-definer functions into private helper, authenticated RPC, or anonymous RPC.
3. Move private helpers out of exposed schemas or revoke broad execute.
4. Review the five RLS-enabled tables with no policies and document whether they are intentionally service-role only.
5. Tighten unnecessary `anon` grants.
6. Finish remaining auth initplan policy rewrites.
7. Fix mutable search-path advisor warnings for ordinary functions.

## Phase 4: Regenerate Types And Prove Runtime

After provider state is reconciled:

1. Regenerate `src/lib/supabase/types.ts` from the linked Archestimator project.
2. Review the generated diff for removed local-only objects.
3. Run targeted database proof scripts:
   - `bun run prove:estimate-list-summaries`
   - `bun run prove:estimate-tabs-rls`
   - `bun run prove:rls-initplan`
   - `bun run prove:unify-kinds`
   - `bun run prove:notification-rls` if notifications are applied
4. Run the launch Supabase readiness checks once CLI auth stabilizes:
   - `bun run launch:check-supabase-migrations`
   - `bun run launch:check-supabase-linked-readiness`
   - `bun run launch:supabase-readiness`

## Phase 5: Update Durable State

After repair:

- Update `.ai/10_state/current-state.md`.
- Update `.ai/10_state/decisions.md` for any apply/defer decisions.
- Add a dated closeout log with provider evidence and exact migration versions.
- Mark stale dated inventories as superseded if they conflict with provider truth.

## Definition Of Done For Future Repair

Database repair is done only when:

- local and remote migration ledgers are intentionally reconciled;
- app code has no required calls to missing provider objects;
- generated types match linked provider state;
- official advisors are rerun or a documented blocker remains;
- targeted proof scripts pass against the linked project;
- `.ai/10_state` reflects the new provider truth.
