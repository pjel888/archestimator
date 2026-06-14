# Generated Types And Runtime Drift

> Implementation status, 2026-06-14: this is the pre-repair type-drift audit.
> `src/lib/supabase/types.ts` has since been regenerated from linked provider
> typegen. The remaining differences are documented compatibility patches for
> nullable RPC args and non-schema env helper exports.

## Observed Type File

File:

- `src/lib/supabase/types.ts`

Observed metadata:

- Line count: 3746.
- PostgREST version in generated output: 14.5.
- SHA-256 observed during audit: `6a746d68d06aecf1ff720a6465741de011edfdf58aee1d7a12959dc1ba14fee9`.

## Main Finding

The generated types are ahead of the linked Supabase provider for at least these objects:

- `notification_definitions`
- `notification_deliveries`
- `ai_package_builder_memory_preferences`
- RPCs/functions from local-only migrations

That means TypeScript can approve database calls that the linked remote database cannot execute.

## Local Comments Already Indicate Type Drift

Repository exploration found existing comments and casts that acknowledge generated type mismatch:

- `src/lib/publication/public-repository.ts` comments around client comment / response RPCs state generated types lag local Supabase regeneration.
- `src/lib/ai/package-builder/apply.ts` uses multiple RPC client casts.
- `src/lib/ai/package-builder/memory.ts` uses generic Supabase client casts.
- `src/lib/estimates/actions.ts` has `legacyEstimatePayload as never`.

These are not all current bugs, but they make schema drift harder to see. The notification and AI memory tables are stronger evidence because the generated type surface currently includes provider-missing objects.

## Why This Matters

Generated Supabase types are only reliable when their source database matches the target provider. In this repo today:

- Some types appear generated from a local or future schema.
- The linked provider is missing some objects from that schema.
- Tests can pass against mocked or typed call surfaces while production runtime fails at PostgREST/RPC resolution.

## Recommended Type Policy

1. Treat linked provider schema as the source of truth for deployable types until migration parity is restored.
2. Do not regenerate and commit types from a local database that includes unapplied migrations unless the commit also records which provider target it represents.
3. After migration-ledger reconciliation, regenerate types from the linked Archestimator project and review the diff.
4. For intentionally deferred local features, keep their database types out of the main runtime type surface or guard runtime calls behind feature flags and explicit schema checks.

## Immediate Drift Checklist

Before claiming database parity:

- Confirm whether notification tables should be applied or the notification code should be gated.
- Confirm whether AI package-builder memory remains default-off.
- Confirm whether `delete_library_folder` is required in closed beta.
- Rewrite or defer sibling-order migration after checking the current tab-aware RPC body.
- Regenerate `src/lib/supabase/types.ts` from the reconciled linked provider.
