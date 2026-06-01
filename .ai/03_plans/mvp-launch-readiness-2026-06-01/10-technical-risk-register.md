# Technical Risk Register

## Third-Pass Risk Register

Commit audited: `681c95e64864f283950a88dba304eaffe8f2f8b3`. Risks below supersede second-pass severity where they conflict.

| Risk | Domain | Signal | Mitigation | Contingency | Owner | Due phase | Status | Debt/blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ask Flip visible/callable while deferred | Product/Security/Cost | UI appears; `/api/ai/*` returns handler response | `AI-001` global disable flags and tests | Flags false + redeploy | Eng | PR-1 | Open | P0 blocker |
| DOM tests red | QA | `bun run test:dom` fails 3 tests | Fix tests/contracts; add no-provider tests | No launch | QA/Eng | PR-1 | Open | P0 blocker |
| Excel export raw/static | Product/Domain | Workbook lacks bid form/formulas | `EXP-001` workbook rewrite | Disable export CTA | Eng/Product | PR-5 | Open | P0 blocker |
| Unlink mutates library or confuses user | Data/Product | Source library row changes after project edit | `UNLINK-001` RPC/action/UI tests | Disable detach | Eng | PR-4 | Open | P0 blocker |
| Hosted auth fails | Auth/Ops | Callback/redirect error in prod | `ONB-001` + env proof | Pause invites/CTA | Eng/Release | PR-2 | Open | P0 blocker |
| RLS/storage gap | Security/Data | Cross-workspace or public access works incorrectly | `SEC-001` allow/deny proof | Disable route/policy rollback | Security | PR-6 | Open | P0 blocker |
| Legal pages misleading | Legal/Product | Public page says pending/incorrect terms | `LEGAL-001` reviewed copy | Closed beta only/no public launch | Legal/Product | PR-7 | Open | P0 blocker |
| Resend mock-success masks email failure | Ops/UX | User sees sent but no delivery | `INFRA-002` fail-loud/proof | Hide email sends | Release | PR-6 | Open | P0 if email visible |
| Missing observability/support | Ops | Error or user issue has no owner | `OBS-001` | Pause beta | Ops | PR-7 | Open | P0 blocker |
| No backup/restore proof | Data/Ops | Migration/data corruption incident | `DATA-001` | Freeze writes/restore | Ops/DB | PR-8 | Open | P0 blocker |
| Redis/rate limiting insufficient | Performance/Security | Public abuse, Postgres limiter latency | `PERF-001`; Upstash/Vercel KV if thresholds fail | Disable public routes | Eng | PR-5/6 | Open | P1/P0 threshold |
| Route transition perf proof stale | Performance/Demo | Demo navigation stutters | Baseline route perf in staging/prod | Demo fallback screenshots | Eng/QA | PR-8/9 | Open | P1 |
| Investor demo data weak | Product/Investor | Seed data looks fake | `DEMO-001` | Use screenshots only | Product | PR-9 | Open | P0 for demo |

## Launch Blockers

| Risk | Impact | Trigger | Detection signal | Mitigation | Contingency | Owner | Due phase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AI route leakage | Provider spend, privacy, unfinished UX exposure. | Missing/incorrect AI disabled flag. | Provider/context/audit mocks called in disabled tests; production provider logs. | Route-level gates before handlers. | Set env false, redeploy, inspect logs. | Eng | PR 1 |
| Ask Flip visible by default | Launch shows deferred feature. | `WorkshopPageShell` renders assistant without flag. | DOM/smoke sees Ask Flip trigger. | Client-public flag default false. | Redeploy with footer hidden. | Eng | PR 1 |
| Schema-invalid unlink migration | Data corruption or failed deploy. | Reusing first-pass invalid SQL. | Migration/test failure; references `area_node_id` or invalid event columns. | Use `17` contract; migration tests; linked proof. | Drop function, hide UI. | Eng | PR 2 |
| Row revision conflict mishandled | Lost updates. | Concurrent row edits/unlink. | Conflict test fails; stale revision accepted. | Match existing RPC conflict behavior. | Disable unlink UI. | Eng | PR 2 |
| History event invalid | Activity/version history broken. | Wrong `estimate_sheet_events` insert. | SQL/action test fails; row activity missing. | Insert only real columns with old/new snapshots. | Disable unlink history or rollback function. | Eng | PR 2 |
| Export formula incorrect | Client receives wrong bid totals. | Formula ranges/status handling wrong. | ExcelJS formula assertions or manual QA mismatch. | Formula tests and manual QA across apps. | Disable export/download or revert workbook. | Eng/Product | PR 6 |
| VAT/contingency double-count | Over/under quote. | Row contingency plus summary contingency both applied. | Test mismatch; manual review. | Owner decision: row-level or summary-level contingency. | Default summary contingency 0 until approved. | Philip | Before PR 6 |
| `test:dom` failure ignored | False launch confidence. | Treating source-contract failures as non-blocking without evidence. | CI remains red. | Fix or formally triage before launch. | No launch. | Eng | PR 7 |
| Supabase migration drift | Remote schema differs from generated types. | Pending migrations or stale remote. | Linked SQL verify mismatch. | Exact-file apply and direct SQL verify. | Repair migration history or rollback function. | Eng | PR 7 |
| Vercel env mismatch | Production differs from tested build. | Missing AI flags or Supabase vars. | Env audit/smoke failure. | Vercel env checklist. | Redeploy with corrected env. | Eng | PR 7 |

## Security/RLS Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Unlink RPC bypasses workspace membership | Cross-workspace row mutation. | Use `resolve_estimate_workspace` and existing RLS/grant conventions. |
| Acting user null misuse | Audit attribution gaps. | Follow existing action conventions; reject when user context unavailable except vetted dev paths. |
| Public export route exposure | Unauthorized workbook download. | Keep existing route auth/project access checks; route tests. |
| AI audit writes while disabled | Privacy and false audit records. | Disabled route returns before handler. |

## Performance Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Workbook generation too slow for large estimates | Timeout or poor UX. | Use streaming/buffer only after model limits measured; test large fixture. |
| Template preview renders deep trees poorly | Slow route. | Cap preview depth/rows and lazy expand. |
| Library trust fields bloat cards | Visual density loss. | Responsive truncation and visual QA. |

## Legal/Privacy Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Export commercial terms imply legal commitments. | Client dispute. | Owner-approved defaults; editable post-MVP path documented. |
| Warranty/validity/payment terms wrong. | Commercial risk. | Owner sign-off before launch. |
| AI disabled route returns detailed internal info. | Endpoint disclosure. | Simple 403 message, no stack/details. |

## Test Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Source-contract tests become brittle. | CI false negatives. | Test behavior and handler boundaries, not only source strings. |
| ExcelJS formulas not verified by recalculation. | Hidden workbook errors. | Assert formulas and manual recalc in Excel/Numbers/LibreOffice/Sheets. |
| Focused tests pass while full DOM fails. | False confidence. | Full `bun run test:dom` must pass before launch. |

## Accepted Debt

| Debt | Reason | Review point |
| --- | --- | --- |
| Labor cost compatibility mode | Current schema consolidated labor/supplementary into `misc_cost`. | Post-MVP costing model. |
| Template route has no authoring UI | MVP only needs seeded reusable structure browsing and estimate insertion path. | Post-launch template management. |
| AI deferred rather than removed | Preserves future implementation while preventing launch leakage. | Post-MVP AI readiness plan. |
| Export commercial defaults may be static | MVP needs professional output; configurable terms can follow. | Owner feedback after first launch exports. |
