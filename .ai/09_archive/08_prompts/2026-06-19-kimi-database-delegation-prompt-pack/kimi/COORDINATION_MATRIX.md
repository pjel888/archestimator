# Coordination Matrix

Use this file before launching more than one Kimi task in the same checkout. The safest default is one active task per lane.

## Lanes

| Lane | Tasks | Rule |
| --- | --- | --- |
| RPC rollout and payload | `01-workspace-homebase-rpc-fallback`, then `05-workspace-homebase-rpc-payload-guards` | Serialize `01 -> 05`; both touch `src/lib/repositories/workspace-repository.ts` and `tests/vitest/workshop-homebase-summary-rpc-contract.test.ts`. |
| RPC proof | `04-workspace-homebase-rls-proof` | Can run while `01/05` are idle. If it needs the RPC contract test file, pause and coordinate with the RPC lane. |
| Publication migration prep | `02-one-published-publication-per-project` | Independent from shared-link work unless a coordinator combines provider-apply scheduling. |
| Shared-link migration prep | `03-shared-link-response-recipient-set-null`, then `07-t4-shared-link-db-hygiene` | Prefer `03 -> 07`; both reason about shared-link/publication database hygiene and provider gates. |
| Evidence workflow | `06-live-db-performance-evidence-workflow` | Independent. It must not create index/RPC migrations from static evidence. |
| Executable DB proofs | `08-executable-schema-rls-proofs` | Independent, but reuse proof patterns from `04` after reading current files. |
| Chart proof hygiene | `09-project-charts-proof-hygiene` | Independent. |

## Same-file conflict map

| File or area | Tasks that may touch it | Coordination rule |
| --- | --- | --- |
| `src/lib/repositories/workspace-repository.ts` | `01`, `05` | Never edit concurrently. Run `01` before `05` unless the coordinator explicitly assigns the reverse order. |
| `tests/vitest/workshop-homebase-summary-rpc-contract.test.ts` | `01`, `05` | Never edit concurrently. |
| `scripts/prove-workshop-homebase-summary-postgres.mjs` | `04`, possibly `08` | If `08` copies the pattern, read after `04` settles or keep `08` to a new proof file. |
| `supabase/migrations-pending-review/*shared*` | `03`, `07` | Prefer `03` first so T4 sequencing sees the current recipient-deletion decision. |
| Provider SQL/apply state | `02`, `03`, `07`, `06` evidence collection | Provider apply is off unless the launch `/goal` explicitly includes `provider-apply` and project `ebxxqidacheyapmmzavr`. |

## Coordinator checklist

1. Pick one lane or a set of lanes with no shared files.
2. Confirm current `git status --short`.
3. Launch one task prompt per agent.
4. Tell each agent to keep reports in its current task folder.
5. When a task returns, review `PASS_STATUS.md`, `PASS_HISTORY.md`, `EVIDENCE.md`, and folder prefix before launching a dependent task.
