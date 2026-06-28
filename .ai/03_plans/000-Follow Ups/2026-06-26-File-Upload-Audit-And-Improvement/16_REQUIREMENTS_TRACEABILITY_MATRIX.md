# Requirements Traceability Matrix

| Requirement | Source evidence | Design section | Implementation phase | Validation |
|---|---|---|---|---|
| UPLOAD-REQ-001 | Routes duplicated in `projects/images`, `component-library/images`, `attachments` | `06_ARCHITECTURE...` broker | Phase 1-3 | Policy/route tests |
| UPLOAD-REQ-002 | Service-role route writes in `src/app/api/projects/images/route.ts:127` | `08_SECURITY...` authz | Phase 0 | Viewer/editor denial tests |
| UPLOAD-REQ-003 | Direct storage policies in component image/attachment migrations | `08_SECURITY...` direct writes | Phase 0 containment, Phase 6 final tightening | Provider-backed storage RLS/direct-write proof |
| UPLOAD-REQ-004 | Raw path persistence in `projects/actions.ts` and `component-library/actions.ts` | `07_DATA...` upload records | Phase 2 | Metadata tamper tests |
| UPLOAD-REQ-005 | Attachment route stores raw documents; no scan found | `08_SECURITY...` malicious files | Phase 5, with scanner decision before download/approval rollout | Scan-gate, scanner failure, and override tests |
| UPLOAD-REQ-006 | No download route found; governance has `download_url_issued` | `07_DATA...` API contracts | Phase 5 | Download/audit tests |
| UPLOAD-REQ-007 | Safe names exist but route-specific | `06_ARCHITECTURE...` object keys | Phase 1 | Key-builder tests |
| UPLOAD-REQ-008 | Existing image/document validators and prior OWASP audit | `08_SECURITY...` validation | Phase 0-1 | Malicious fixture tests |
| UPLOAD-REQ-009 | `project-images` private; `component-images` public | `15_DECISIONS...` private default | Phase 6-7, or earlier if product/security decides | Storage proof, migration/backfill plan, and written exception if public |
| UPLOAD-REQ-010 | `publication/image-url.ts` hardcodes Supabase public URLs | `06_ARCHITECTURE...` URL resolver | Phase 7 | URL resolver tests |
| UPLOAD-REQ-011 | UX auditor found fragmented controls/states | `05_UX...` state vocabulary | Phase 4 | DOM state tests |
| UPLOAD-REQ-012 | XHR/fetch lack abort/timeout | `09_PERFORMANCE...` reliability | Phase 4 | Client helper tests |
| UPLOAD-REQ-013 | XHR progress capped at 95; server processing hidden | `05_UX...`, `09_PERFORMANCE...` | Phase 4 | DOM progress tests |
| UPLOAD-REQ-014 | PRODUCT target WCAG 2.1 AA; upload controls lack associations | `05_UX...` a11y | Phase 4 | A11y/DOM tests |
| UPLOAD-REQ-015 | Draft cleanup is best effort; cleanup utility has reporting model | `07_DATA...`, `13_ROLLOUT...` | Phase 2,6 | Cleanup retry tests |
| UPLOAD-REQ-016 | Performance lane budgets and missing telemetry | `09_PERFORMANCE...` | Phase 7 | Metrics/evaluator tests |
| UPLOAD-REQ-017 | Existing UI expects current response shapes | `11_IMPLEMENTATION...` compatibility | Phase 3 | Contract regression tests |
| UPLOAD-REQ-018 | Supabase docs recommend TUS for larger/unstable uploads | `06_ARCHITECTURE...` signed flow | Phase 7 after adapter contract and finalization controls | Adapter/resumable/finalization tests |
| UPLOAD-REQ-019 | Provider lock-in in Next/image config and URL normalizer | `15_DECISIONS...` alternatives | Phase 7 | Adapter parity tests |
| UPLOAD-REQ-020 | Component archive returns no storage targets | `13_ROLLOUT...` operations | Phase 6 | Retention/cleanup tests |
| UPLOAD-REQ-021 | New upload tables contain sensitive object/session/event metadata | `07_DATA...` Postgres RLS and grants | Phase 2 | Upload-table RLS/grant denial proof |
| UPLOAD-REQ-022 | Upload endpoints can consume Sharp/storage/scanner capacity | `08_SECURITY...` authenticated abuse, `09_PERFORMANCE...` quotas | Phase 0 caps, production gate before rollout | Rate-limit, quota, active-session, and scanner-backpressure tests |
| UPLOAD-REQ-023 | `upload_events` is append-only but access/retention must be governed | `07_DATA...` events, `13_ROLLOUT...` audit incident runbook | Phase 2 and production ops gate | RLS/grant, append-only, retention/runbook checks |
| UPLOAD-REQ-024 | Reviewers found beta and production scope conflated | `02_FEATURE...` readiness cutlines | Phase 0 and every release review | Release readiness checklist |
| UPLOAD-REQ-025 | Estimate-row `Reference image` modal posts to component image route and persists row snapshot URLs | `06_ARCHITECTURE...` surface registry, `07_DATA...` auth matrix | Phase 0 coverage, Phase 2 row asset target, Phase 3/4 migration | DOM modal, row update, projection resolver, and authz denial tests |

## Requirement Coverage Summary

- P0 foundation/security requirements: UPLOAD-REQ-001, 002, 003, 004, 005, 006, 007, 008, 021, 022, 025.
- P1 privacy/URL/UX/reliability/performance/release requirements: UPLOAD-REQ-009, 010, 011, 012, 013, 014, 015, 016, 017, 018, 023, 024.
- P2 portability/future-proofing requirements: UPLOAD-REQ-019, 020.

## Unresolved Decision Gates

- Whether to grant a public-derivative exception for component images.
- Malware scanning/CDR provider.
- Retention policy for archived component assets and reviewed attachments.
- Resumable upload threshold.
- Whether to normalize project image metadata into columns or continue metadata JSON with asset IDs.
- Exact upload quota values after Phase 0 runtime profiling.
- Upload event retention/legal hold duration.
