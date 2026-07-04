# 16 - Requirements Traceability Matrix

Boundary: docs `22` through `29` plus the active-goal coordination checkpoint in `00` are traceability/evidence inputs only. This matrix does not authorize source/test/runtime/provider edits or native goal completion, including `update_goal({status: "complete"})`, while residual gates remain open.

| Requirement | Phase | Design docs | Test/evidence |
|---|---|---|---|
| FR-001 Google account picker | 1 | `06`, `11`, `22` | Better Auth provider prompt/config test; optional browser proof |
| FR-002 logout semantics | 1 | `06`, `08`, `11`, `22` | sign-out action/session tests; policy docs |
| FR-003 state mismatch recovery | 1 | `05`, `08`, `12`, `22` | redirect/copy/redaction tests |
| FR-004 closed-beta/terms fail closed | 1/3 | `05`, `07`, `08` | closed-beta and legal terms tests |
| FR-005 invite account/token flow | 3/4 | `05`, `07`, `20` | invite route/action tests |
| FR-006 server-side authz | 3 | `06`, `07`, `10`, `14`, `24` | authz matrix tests and caller/import review |
| FR-007 share/app session isolation | 4 | `06`, `07`, `08`, `20`, `25` | middleware/share route tests |
| FR-008 durable publication lockout | 2 | `06`, `09`, `14`, `23` | simulated isolate/global reset test |
| FR-009 provider cleanup classification | 5 | `10`, `21`, `26`, `28`, `29` | cleanup worksheet, classification bridge, current-worktree re-audit, remaining-fixture cleanup buckets, Slice 0 low-risk stale text/scaffold cleanup, Slice A stale proof-utility archive, Slice A2 provider-only proof-test archive, Slice B allowlist proof, file-level provider-string inventory, static scans, the original `60` old-provider keyword baseline, current `44` primary old-provider keyword count, broadened `89` active-surface provider-boundary allowlist count, current `4` active historical type-reference path-reference files with `0` deletion blockers, active caller checks with no direct imports for archived stale proof-utility/test names outside `supabase/**`, `providerCleanupAllowlistReady=true`, `finalProviderCleanupReady=true`, `typeReferenceDeletionReady=true`, and historical `src/lib/supabase/types.ts` retirement; future completion still needs provider-exit proof, hosted/provider-dashboard/operator proof or accepted skip, legal/final-review acceptance, and targeted regressions |
| FR-010 final verification audit | 6 | `00`, `11`, `12`, `14`, `17`, `19`, `27` | tests-run inventory, skipped-proof log, P0/P1 residual-risk matrix, active-goal workflow checkpoint, non-completion verdict |
| SR-001 deny by default | 3/4 | `08`, `14` | denied access tests |
| SR-002 credential taxonomy/redaction | 4 | `08`, `20` | sanitizer/evidence review tests |
| SR-003 session lifecycle | 1 | `06`, `08`, `18` | cookie/session/sign-out tests |
| SR-004 privacy/DSAR/retention | 4/6 | `08`, `13`, `18` | ops runbook review; implementation proof later |
| SR-005 evidence safety | all | `08`, `12`, `19`, `20` | no raw credential examples in evidence |
| UX-001 named auth states | 1/3/4 | `05` | component/route copy tests |
| UX-002 accessible recovery | 1/3/4 | `05`, `12` | focus/live-region/touch-target checks |
| UX-003 recipient recovery | 4 | `05`, `08` | share recipient route/UI tests |
| NFR-001 no global security state | 2 | `06`, `09`, `14` | publication lockout reset test |
| NFR-002 no-store/dynamic sensitive routes | 1/4 | `07`, `09`, `12` | route header tests |
| NFR-003 safe observability | 4/6 | `08`, `09`, `13` | log/redaction tests |
