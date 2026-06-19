# Evidence: Shared-Link Response Recipient SET NULL

## Preflight

Local-only proof harness runs the AC-MOD-04 preflight query against a temp Postgres instance:

```sql
SELECT count(*) AS decisions_at_risk
FROM public.shared_link_responses
WHERE recipient_id IS NOT NULL;
```

Result before migration: `1` (the proof fixture).

## Commands

### 1. Local Postgres proof harness

```bash
bun run prove:shared-link-response-recipient-set-null
```

Output:

```json
{
  "ok": true,
  "proof": "shared_link_responses_recipient_set_null",
  "checks": [
    "pre-migration decisions_at_risk = 1",
    "response row survives recipient hard-delete",
    "surviving row has recipient_id = NULL",
    "decision, note, and snapshot_version_at_decision are preserved",
    "FK delete action is SET NULL (confdeltype = 'n')",
    "post-delete decisions_at_risk = 0"
  ]
}
```

Exit code: `0`.

### 2. Targeted publication-actions test

```bash
bun test tests/vitest/project-publication-actions.test.ts
```

Output: `17 pass, 0 fail`.

### 3. Diff whitespace check

```bash
git diff --check
```

Exit code: `0`.

### 4. Type-check

```bash
bun run type-check
```

Exit code: `0`.

```text
$ tsc --noEmit
```

### 5. Recipient-email-composer test

```bash
bunx vitest run tests/vitest/recipient-email-composer.test.tsx --maxWorkers=1
```

Output: `13 passed (13)`.

## Proof boundary

`local-only` — the verification used a local temp Postgres instance and local Vitest runs. No linked or hosted provider was mutated or checked.

## Post-check

The proof harness asserts the FK delete action after migration is `n` (`SET NULL`) by querying `pg_constraint.confdeltype`. The retained response row has `recipient_id = NULL` and preserves `decision`, `note`, and `snapshot_version_at_decision`.

## Skipped checks

- Provider apply and post-check on project `ebxxqidacheyapmmzavr` were skipped because provider apply is OFF for this run.
