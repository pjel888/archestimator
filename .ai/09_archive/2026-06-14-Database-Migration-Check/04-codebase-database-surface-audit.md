# Codebase Database Surface Audit

> Implementation status, 2026-06-14: this is the pre-repair app-surface audit.
> Provider now has `delete_library_folder`, `notification_definitions`, and
> `notification_deliveries`. AI package-builder memory and chart bucket RPC are
> intentionally deferred and moved out of `supabase/migrations/`.

## Supabase Client Factories

| File | Role |
| --- | --- |
| `src/lib/supabase/client.ts` | Browser singleton using `createBrowserClient<Database>` with anon key |
| `src/lib/supabase/server.ts` | Server client using `createServerClient<Database>` with SSR cookies |
| `src/lib/supabase/service-role.ts` | Server-only service role client with `createClient<Database>` |
| `src/lib/auth/dev-auth.ts` | Development admin bypass using service-role access and `profiles` |

The split is appropriate. The main audit issue is not client construction; it is that generated types and code paths are ahead of the linked provider schema for several objects.

## Main Database Call Areas

High-use app database surfaces found in repository exploration:

- `src/lib/estimates/actions.ts`
- `src/lib/component-library/actions.ts`
- `src/lib/publication/public-repository.ts`
- `src/lib/notifications/repository.ts`
- `src/lib/notifications/actions.ts`
- `src/lib/ai/audit.ts`
- `src/lib/ai/read-context.ts`
- `src/lib/ai/package-builder/apply.ts`
- `src/lib/ai/package-builder/read-tools.ts`
- `src/lib/ai/package-builder/memory.ts`
- `src/lib/projects/actions.ts`
- `src/lib/account-actions.ts`
- invite, auth, share, export, and publication routes

## App-Facing Missing Remote Objects

### `delete_library_folder`

Local migration:

- `supabase/migrations/20260605113000_transactional_library_folder_delete.sql`

Code reference:

- `src/lib/component-library/actions.ts` calls `supabase.rpc("delete_library_folder", ...)`.

Remote status:

- Function not found in provider function probes.

Risk:

- This is a likely runtime failure for the library folder delete workflow if the current UI path reaches it.

Recommended next action:

- Make this the first app-facing schema reconciliation item after migration-ledger strategy is decided.

### Notification system

Local migration:

- `supabase/migrations/20260606090000_notification_system.sql`

Code references:

- `src/lib/notifications/repository.ts`
- `src/lib/notifications/actions.ts`
- `src/features/notifications/hooks/useNotificationsQuery.ts`
- proof script `scripts/prove-notification-rls-postgres.mjs`

Remote status:

- `notification_definitions` table missing.
- `notification_deliveries` table missing.

Risk:

- Notification code and generated types assume schema that does not exist on the linked provider.

Recommended next action:

- Decide whether notifications are in closed-beta scope now. If yes, apply a provider-proven notification migration and regenerate linked types. If no, gate the UI/actions and remove assumptions that tables exist.

### AI package-builder memory

Local migration:

- `supabase/migrations/20260528103341_ai_package_builder_memory.sql`

Code reference:

- `src/lib/ai/package-builder/memory.ts`

Remote status:

- `ai_package_builder_memory_preferences` table missing.

Risk:

- Mitigated if `AI_PACKAGE_BUILDER_MEMORY_ENABLED` remains default-off.
- Becomes a runtime issue if the flag is enabled before schema reconciliation.

Recommended next action:

- Keep default-off until the migration is applied or the feature is intentionally removed/deferred.

### `get_project_chart_buckets`

Local migration:

- `supabase/migrations/20260614021500_get_project_chart_buckets_rpc.sql`

Code reference:

- `src/lib/repositories/project-charts-repository.ts` currently performs server-side JavaScript aggregation and comments that RPC pushdown is future work.

Remote status:

- RPC missing.

Risk:

- Low current runtime risk because code does not call the RPC.
- The migration itself should be hardened before future apply because it grants authenticated execute without an explicit public/anon revoke pattern.

### Estimate sibling order storage

Local migration:

- `supabase/migrations/20260611031500_estimate_node_sibling_order_stored.sql`

Repo state:

- `.ai/10_state/decisions.md` records this as ready-design and required for the slot-preserving insert contract to fully hold.

Remote status:

- Migration not recorded.
- Remote `create_estimate_node_with_history` exists as a 9-argument tab-aware function, including `target_tab_id`.

Risk:

- The local migration appears older than the current tab-aware RPC signature. Applying it as-is may overwrite newer behavior or fail.

Recommended next action:

- Rewrite the sibling-order migration against the current 9-argument RPC signature and verify it with targeted estimate-node tests before provider apply.

## Proof And Readiness Scripts

Package scripts related to database proof:

- `prove:notification-rls`
- `prove:estimate-tabs-rls`
- `prove:estimate-list-summaries`
- `prove:rls-initplan`
- `prove:unify-kinds`
- `launch:supabase-readiness`
- `launch:check-supabase-backup`
- `launch:check-supabase-migrations`
- `launch:check-supabase-linked-readiness`

Because the CLI pooler hit temporary auth failures during leader-lane advisor/query attempts, some of these should be rerun after CLI auth stabilizes and after migration-ledger repair is planned.

## Codebase Surface Conclusion

The codebase is database-heavy and mostly uses the expected Supabase client surfaces. The current highest-risk issue is not scattered ad hoc client usage; it is that several feature slices crossed into code/types without corresponding linked-provider migrations.
