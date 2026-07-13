# 20 — Audit and Revision Log (Improve-Plan pass)

This document records the Improve-Plan-Prompt audit: inventory, baseline scorecard, adversarial findings, drift verification, and the revision actions taken. It is the evidence trail for the revised readiness scores in `17`.

`verification_mode: emulated` for this audit (no native independent verifier lane available). The codebase-verification lane was a real delegated read-only Explore agent with separate output; its findings are cited below as independent evidence for the technical claims, but the overall package verification remains emulated because document authorship and final verification are the same agent.

## 1. Source authority and verification scope

| Source | Authority | Used for |
|---|---|---|
| `PROMPT.md` | brief (product goal, constraints, stop condition) | scope |
| `AGENTS.md` | repo instructions (stack, Cloudflare mandate, verification policy) | reality |
| `.ai/10_state/current-state.md` fast path + relevant lines | repo instructions (stage, migration drift, provider-exit gates) | reality |
| `.ai/10_state/decisions.md` | repo decisions | data model history |
| Current source/migrations/tests (independently re-verified) | repo evidence | technical claims |
| Supabase governance migration | repo evidence (reference only) | parity contract |
| Next.js 16 local docs `node_modules/next/dist/docs/` | official docs | consulted at implementation (cache/Server Action behavior) |

## 2. Codebase re-verification (delegated independent lane — all findings CONFIRMED against current main)

| Claim | Result | Evidence |
|---|---|---|
| G1 dual persistence drift | CONFIRMED | `actions.ts` 0 refs; Supabase migration 17 refs; governance test L81 asserts the split |
| G3 dead `source-changed` | CONFIRMED | 10 write sites of `link_state`/`linkState`; none write `source-changed`; library-update paths write only `unlinked` echoes |
| G5 authz helper gap | CONFIRMED | `d1-access.ts` exports 11 fns; no `isWorkspaceAdminInD1`/`isCostLibraryGovernanceAdminInD1` |
| Quota constants | CONFIRMED | `actions.ts:378-379` `LIBRARY_COMPONENT_CAP=10_000`, `LIBRARY_TEMPLATE_CAP=2_000` |
| Trust gate behavior | CONFIRMED | blocks `archived` only; warns on the rest; no review-state handling |
| Stale constants | CONFIRMED | `source-trust-model.ts:4-5` 90/180 |
| Repo column constant | CONFIRMED | `component-library-repository.ts:264` lists pricing/confidence/lifecycle; no review columns |
| **G2 D1 schema gap** | **CONFIRMED but citation DRIFT** | D1 table created in `0028_component_library_action_support.sql:65`, NOT `0026`. Gap is D1-only (Supabase already has all 9 columns via `20260622143000:53-64`). |
| **Next migration number `0037`** | **REFUTED — DRIFT** | `0037_remove_preloaded_component_categories.sql` taken today. Next free = **`0038`**. |

## 3. P0 drift repairs (required before implementation-ready)

| ID | Drift | Repair action | Docs affected |
|---|---|---|---|
| DRIFT-1 | Migration `0037` taken | Renumber proposed migration → `0038_cost_library_cost_review_governance.sql` everywhere | `07`,`11`,`13`,`16`,`17`,`README`,`03` |
| DRIFT-2 | D1 table cited as `0026` | Correct to `0028_component_library_action_support.sql:65` (D1 tree) | `03`,`07` |
| DRIFT-3 | G2 not scoped to D1 | Scope G2 strictly to D1; note Supabase already has the columns | `03`,`07`,`14` |
| DRIFT-4 | Migration-tree conflation | Add explicit D1 (`migrations/`, `00xx`) vs Supabase (`supabase/migrations/`, timestamps) note | `03`,`07`,`18` |

## 4. Baseline scorecard (per directive §2 categories)

Headline scores **before** this Improve-Plan pass. Per-document detail follows in §5.

| Category | Baseline | Cap reason (if <100) |
|---|---|---|
| Strategy & Product Value | 96 | external `OPEN-1` seed decision |
| Requirements Quality | 90 | traceability matrix schema not matching directive; missing proof-contract rows |
| React/Next Technical | 88 | missing route-specific App Router boundary/cache contract table |
| Architecture & Code Quality | 94 | clean; minor D1-citation drift |
| Data/API/Integration | 82 | DRIFT-1..4 (migration number, table citation, G2 scope, tree conflation); missing access-path proof |
| Security/Privacy | 88 | threat model present; missing Attack Surface Inventory table |
| UX/Accessibility | 82 | states present; missing action-level a11y proof matrix |
| Performance/Scalability | 90 | evaluators present; missing D1/Cloudflare per-resource budget row |
| Reliability/Ops | 92 | solid; minor runbook gaps |
| Testing/QA | 86 | matrix present; missing proof-contract rows; known-red posture not fully recorded |
| Rollout/Governance | 90 | solid; migration drift affects sequencing |
| **Overall (emulated cap 97)** | **86** | drift + missing directive-required artifacts |

## 5. Adversarial findings (P0/P1) and resolutions

| ID | Finding | Severity | Resolution |
|---|---|---|---|
| ADV-1 | Migration `0037` collides with a migration created today → implementation would fail at apply | P0 | Renumber to `0038` (DRIFT-1) |
| ADV-2 | D1 table citation `0026` is wrong → migration blueprint may target the wrong table ancestry | P0 | Correct to `0028` (DRIFT-2) |
| ADV-3 | G2 not scoped D1-only → plan reads as if Supabase also lacks the columns, hiding that Supabase is the parity reference that already has them | P1 | Scope G2 to D1 (DRIFT-3) |
| ADV-4 | No route-specific App Router boundary/cache contract → implementer may guess cache/revalidation per route | P1 | Add route contract table to `06`/`18` |
| ADV-5 | No Attack Surface Inventory table for new Server Actions → DTO minimization + abuse posture not enforced | P1 | Add to `08` |
| ADV-6 | Traceability matrix uses non-directive schema → source-strength column missing, gap/decision column missing | P1 | Rewrite `16` to required schema |
| ADV-7 | No proof-contract rows → tests not tied to implementation unit + red/green expectation | P1 | Add to `12` |
| ADV-8 | No action-level a11y proof matrix → keyboard/focus/live-region not proven per action | P1 | Add to `05` |
| ADV-9 | No D1/Cloudflare per-resource cost row → free-tier budget not enumerated | P2 | Add to `09` |
| ADV-10 | `source-changed` computed-on-read compare basis unspecified (version number vs price snapshot vs timestamp) → false-positive/negative risk | P1 | Pin to version-number + price-hash compare in `06`/`11` |
| ADV-11 | Supabase governance test will need updating but plan doesn't specify the exact new assertion shape | P2 | Add explicit test-update spec in `12` |
| ADV-12 | RISK-7 (audit tampering, D1 no-RLS) residual = Medium with no concrete mitigation beyond "no UPDATE/DELETE path" | P2 | Add D1 access-governance mitigation (read-only service role for audit table) |
| ADV-13 | Import path lacks explicit streaming-lib choice and Worker CPU/memory ceiling proof | P2 | Name streaming approach + cap proof in `07`/`09` |
| ADV-14 | Currency `DEFAULT 'PHP'` hardcoded — `OPEN-2` region/currency not reflected in migration columns | P2 | Already noted; add migration column for currency on variant entries (mirror price_options) |

No P0 finding remains unresolved after the repairs in §6.

## 6. Revision actions taken (Phase 3)

| Doc | Revision |
|---|---|
| `03` | Fix D1 table citation (`0028` not `0026`); scope G2 to D1; add migration-tree note |
| `05` | Add action-level accessibility proof matrix |
| `06` | Add route-specific App Router boundary/cache contract table; pin `source-changed` compare basis |
| `07` | Renumber migration to `0038`; correct table ancestry; scope G2 to D1; add streaming/CPU ceiling; add currency column on variant entries |
| `08` | Add Attack Surface Inventory table; strengthen RISK-7 mitigation |
| `09` | Add D1/Cloudflare per-resource budget row |
| `11` | Renumber migration references; pin compare basis in stale-propagation tasks |
| `12` | Add proof-contract rows; specify Supabase governance test update; record known-red posture |
| `13` | Renumber migration; update rollback for `0038` |
| `16` | Rewrite to directive-required traceability column schema |
| `17` | Refresh scores + verification matrix + drift evidence |
| `18` | Add migration-tree note; reaffirm cache contract |
| `README` | Renumber migration; refresh status summary |

## 7. Items NOT changed (intentional)

- No application code, tests, migrations, configs, or provider state modified (planning-only).
- The 6 emulated workstream + adversarial + final-verification structure in `00` remains valid; this audit adds evidence rather than restructuring governance.
- `DEC-1..6`, `OPEN-1..6` unchanged (still owner/external).
