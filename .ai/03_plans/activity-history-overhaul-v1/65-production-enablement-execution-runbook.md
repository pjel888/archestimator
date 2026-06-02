# 65 — Production Enablement Execution Runbook

**Date:** 2026-06-02
**Purpose:** Exact step-by-step execution path from planning readiness to actual production readiness for access telemetry.
**Status:** Runbook ready — awaiting execution.

---

## Phase 0 — Preconditions

**Exit criteria**: All preconditions confirmed before any operational action begins.

| # | Precondition | Owner | Verification | Status |
|---|-------------|-------|-------------|--------|
| P0-1 | PR 7 (access telemetry) implemented and code merged to `main` | Engineer | `git log --oneline main` shows PR 7 merge commit | ❌ Pending |
| P0-2 | PR 8B (retention hardening) implemented OR operator-run retention path documented per doc 55 | Engineer | PR 8B merged OR retention procedure documented | ❌ Pending |
| P0-3 | Feature flag exists: `ACCESS_TELEMETRY_ENABLED` env var | Engineer | `grep ACCESS_TELEMETRY_ENABLED` returns env var definition | ❌ Pending |
| P0-4 | Feature flag confirmed `false` in production Vercel env | Engineer / Owner | Vercel dashboard → Environment Variables → `ACCESS_TELEMETRY_ENABLED=false` | ❌ Pending |
| P0-5 | All 39 tests exist (from doc 57) | Engineer | Test files present at specified paths | ❌ Pending |
| P0-6 | Doc 63 (vendor DPA worksheet) reviewed | Owner | Worksheet reviewed, no blockers identified | ❌ Pending |
| P0-7 | Doc 64 (evidence ledger) ready for tracking | Owner | Ledger exists, all items Missing | ✅ Complete (this pass) |

---

## Phase 1 — Privacy Artifacts

**Exit criteria**: Privacy notice live, in-product disclosure implemented, evidence captured in doc 64.

| # | Action | Owner | Commands / Steps | Evidence required | Status |
|---|--------|-------|-----------------|-------------------|--------|
| P1-1 | Publish privacy notice with access telemetry disclosure | Owner | Use approved copy from doc 52 §2. Update `/privacy` page. Verify live at production URL. | E-001: URL of live privacy page with disclosure visible | ❌ Pending |
| P1-2 | Add disclosure to shared page footer | Engineer | Implement disclosure component per doc 52 §3. Place in shared page footer (above copyright). | E-002: Screenshot of shared page showing disclosure text | ❌ Pending |
| P1-3 | Add disclosure to password gate | Engineer | Implement disclosure text per doc 52 §4. Place above/before password input. | E-003: Screenshot of password gate showing disclosure | ❌ Pending |
| P1-4 | Capture screenshots for evidence ledger | QA / Owner | Screenshot shared page (desktop + mobile), screenshot password gate (desktop + mobile) | E-002, E-003 updated with screenshot paths | ❌ Pending |
| P1-5 | Update evidence ledger | Owner | Update doc 64: E-001 → Complete, E-002 → Complete, E-003 → Complete | E-001, E-002, E-003 status changed | ❌ Pending |

---

## Phase 2 — DPO / NPC / DPS

**Exit criteria**: DPO designated, NPCRS triage completed, DPS inventory completed, evidence captured.

| # | Action | Owner | Commands / Steps | Evidence required | Status |
|---|--------|-------|-----------------|-------------------|--------|
| P2-1 | Designate DPO / privacy officer | Owner | Formal designation (document or email). See doc 53 §2 for template. | E-004: Designation artifact | ❌ Pending |
| P2-2 | Complete NPCRS registration triage | Owner / DPO | Use NPCRS triage worksheet from doc 53 §4. Determine: registration required / exempt / voluntary. | E-005: Completed triage worksheet | ❌ Pending |
| P2-3 | Complete DPS inventory | Owner / DPO | Use DPS inventory template from doc 53 §5. Document all processing systems. | E-006: Completed DPS inventory | ❌ Pending |
| P2-4 | Determine registration path | Owner / DPO | Based on triage result: register with NPC, claim exemption, or voluntary register. Follow doc 48 §6. | Documented decision and path forward | ❌ Pending |
| P2-5 | Update evidence ledger | Owner / DPO | Update doc 64: E-004, E-005, E-006 | Evidence status updated | ❌ Pending |

---

## Phase 3 — Operational Processes

**Exit criteria**: DSR and breach response processes operationalized, internal owner assigned, SLAs defined.

| # | Action | Owner | Commands / Steps | Evidence required | Status |
|---|--------|-------|-----------------|-------------------|--------|
| P3-1 | Operationalize DSR intake process | Owner / DPO | Set up DSR intake channel (email/form). Use templates from doc 54 §3. Define response SLA. | E-007: DSR process document with intake channel and SLA | ❌ Pending |
| P3-2 | Operationalize breach response process | Owner / DPO | Document breach response procedure. Use playbook from doc 54 §4. Assign incident response team. | E-008: Breach response document with team and procedure | ❌ Pending |
| P3-3 | Assign internal privacy owner | Owner | Designate who handles DSR/breach intake. Define escalation path. | E-004 may cover this if DPO is internal owner | ❌ Pending |
| P3-4 | Define SLAs | Owner / DPO | DSR response SLA (e.g., 30 days per Philippine DPA). Breach notification SLA (e.g., 72 hours per NPC Circular). | SLAs documented in E-007 and E-008 | ❌ Pending |
| P3-5 | Update evidence ledger | Owner / DPO | Update doc 64: E-007, E-008 | Evidence status updated | ❌ Pending |

---

## Phase 4 — Vendor / Processor

**Exit criteria**: Vendor DPAs reviewed, evidence captured.

| # | Action | Owner | Commands / Steps | Evidence required | Status |
|---|--------|-------|-----------------|-------------------|--------|
| P4-1 | Review Supabase DPA | Owner | Visit https://supabase.com/legal/dpa. Review per doc 63 §3 checklist. Accept/sign if acceptable. | E-009: DPA review evidence for Supabase | ❌ Pending |
| P4-2 | Review Vercel DPA | Owner | Visit https://vercel.com/legal/dpa. Review per doc 63 §3 checklist. Accept/sign if acceptable. | E-009: DPA review evidence for Vercel | ❌ Pending |
| P4-3 | Review Resend DPA (advisory) | Owner | Visit https://resend.com/legal/dpa. Advisory review only — access telemetry data not sent to Resend. | Document review outcome | ❌ Pending |
| P4-4 | Document subprocessor status | Owner | Review subprocessor lists for Supabase and Vercel per doc 63 §4. | Subprocessor list documented | ❌ Pending |
| P4-5 | Update evidence ledger | Owner | Update doc 64: E-009 | Evidence status updated | ❌ Pending |

---

## Phase 5 — Retention

**Exit criteria**: Retention path operational, dry-run completed, proof captured.

| # | Action | Owner | Commands / Steps | Evidence required | Status |
|---|--------|-------|-----------------|-------------------|--------|
| P5-1 | Choose retention path | Owner / Engineer | Select from doc 55 options: A (automated cron), B (operator-run SQL), or C (feature-flagged). | Retention path documented | ❌ Pending |
| P5-2 | Run dry-run | Engineer | Execute dry-run query from doc 55 §3. Verify correct count of rows >90 days. | Dry-run output captured | ❌ Pending |
| P5-3 | Schedule automated cleanup OR document operator procedure | Engineer | If automated: set up cron job. If operator: document exact SQL and schedule. | E-010: Cleanup proof (cron config or documented procedure) | ❌ Pending |
| P5-4 | Verify retention does not affect estimate audit events | Engineer | Run test R3 from doc 57. Verify estimate events preserved. | Test output | ❌ Pending |
| P5-5 | Update evidence ledger | Owner / Engineer | Update doc 64: E-010 | Evidence status updated | ❌ Pending |

---

## Phase 6 — Test Evidence

**Exit criteria**: All 39 tests pass, manual QA completed, evidence captured.

| # | Action | Owner | Commands / Steps | Evidence required | Status |
|---|--------|-------|-----------------|-------------------|--------|
| P6-1 | Run data safety tests (DS1-DS10) | Engineer | `bun run test:dom -- tests/vitest/access-telemetry-safety.test.ts` | E-012: Test output showing 10/10 pass | ❌ Pending |
| P6-2 | Run behavior tests (B1-B5) | Engineer | `bun run test:dom -- tests/vitest/access-telemetry-behavior.test.ts` | E-012: Test output showing 5/5 pass | ❌ Pending |
| P6-3 | Run visibility tests (V1-V5) | Engineer | `bun run test:dom -- tests/vitest/access-telemetry-visibility.test.ts` | E-012: Test output showing 5/5 pass | ❌ Pending |
| P6-4 | Run disclosure UI tests (U1-U4) | Engineer | `bun run test:dom -- tests/vitest/access-telemetry-disclosure.test.tsx` | E-012: Test output showing 4/4 pass | ❌ Pending |
| P6-5 | Run retention tests (R1-R3) | Engineer | `bun run test:dom -- tests/vitest/access-telemetry-retention.test.ts` | E-012: Test output showing 3/3 pass | ❌ Pending |
| P6-6 | Run feature flag tests (F1-F3) | Engineer | `bun run test:dom -- tests/vitest/access-telemetry-feature-flag.test.ts` | E-012: Test output showing 3/3 pass | ❌ Pending |
| P6-7 | Run full test suite | Engineer | `bun run validate` — all existing tests still pass | Full suite output | ❌ Pending |
| P6-8 | Complete manual QA (M1-M9) | QA / Engineer | Execute all 9 items from doc 57 §7. Capture screenshots/logs. | E-013: Manual QA report with all 9 items checked | ❌ Pending |
| P6-9 | Update evidence ledger | Engineer | Update doc 64: E-012, E-013 | Evidence status updated | ❌ Pending |

---

## Phase 7 — Staged Rollout

**Exit criteria**: Telemetry enabled through all rollout stages, monitoring confirmed, no issues.

| # | Action | Owner | Commands / Steps | Evidence required | Status |
|---|--------|-------|-----------------|-------------------|--------|
| P7-1 | Enable in local dev | Engineer | Set `ACCESS_TELEMETRY_ENABLED=true` in `.env.local`. Verify telemetry writes. | Dev telemetry working | ❌ Pending |
| P7-2 | Enable in staging (Vercel Preview) | Engineer | Set env var in Vercel Preview. Deploy preview. Verify telemetry writes to staging DB. | Staging telemetry working | ❌ Pending |
| P7-3 | Internal owner-only rollout | Owner / Engineer | Set `ACCESS_TELEMETRY_ENABLED=true` in production Vercel env. Owner only tests. Monitor for 24-48 hours. | No errors, expected telemetry data | ❌ Pending |
| P7-4 | Selected beta rollout | Owner | Expand to limited beta users if applicable. Monitor. | No issues reported | ❌ Pending |
| P7-5 | Monitor telemetry volume | Engineer | Check Supabase: `SELECT count(*) FROM shared_link_events WHERE metadata_json->>'access_stage' IS NOT NULL` | Expected volume, no anomalies | ❌ Pending |
| P7-6 | Verify rollback capability | Engineer | Test: set `ACCESS_TELEMETRY_ENABLED=false` → confirm telemetry stops. Re-enable. | Rollback tested | ❌ Pending |
| P7-7 | Update evidence ledger | Owner / Engineer | Update doc 64: E-014 | Evidence status updated | ❌ Pending |

---

## Phase 8 — Final Sign-Off

**Exit criteria**: All gates passed, doc 58 completed, production readiness declared GO.

| # | Action | Owner | Commands / Steps | Evidence required | Status |
|---|--------|-------|-----------------|-------------------|--------|
| P8-1 | Complete doc 58 (production sign-off template) | Owner | Fill in all sections. Attach evidence references from doc 64. | Completed doc 58 | ❌ Pending |
| P8-2 | Verify all blocking evidence items (E-001 through E-015) are Complete | Owner | Review doc 64. Confirm all 15 blocking items are Complete. | All 15 evidence items Complete | ❌ Pending |
| P8-3 | Final production GO declaration | Owner | Sign doc 58. Update doc 64: E-015 → Complete. | E-015: Final production sign-off | ❌ Pending |
| P8-4 | Update doc 67 (final scorecard) | Owner | Update Domain C from 0% to 100% | Scorecard updated | ❌ Pending |
| P8-5 | Archive planning pack | Owner | Move from active planning to archive. Update `.ai/10_state/current-state.md`. | Planning pack archived | ❌ Pending |

---

## Execution Summary

| Phase | Items | Blocking? | Dependencies |
|-------|------:|-----------|-------------|
| Phase 0 — Preconditions | 7 | ✅ YES (blocks all phases) | PR 7 + PR 8B implementation |
| Phase 1 — Privacy Artifacts | 5 | ✅ YES | Phase 0 complete |
| Phase 2 — DPO / NPC / DPS | 5 | ✅ YES | Phase 0 complete |
| Phase 3 — Operational Processes | 5 | ✅ YES | Phase 2 (DPO designated) |
| Phase 4 — Vendor / Processor | 5 | ✅ YES | Phase 0 complete |
| Phase 5 — Retention | 5 | ✅ YES | Phase 0 complete (PR 8B or operator path) |
| Phase 6 — Test Evidence | 9 | ✅ YES | Phase 0 complete (tests exist) |
| Phase 7 — Staged Rollout | 7 | ✅ YES | Phases 1-6 complete |
| Phase 8 — Final Sign-Off | 5 | ✅ YES | Phases 1-7 complete |

**Total items across all phases: 53**
**Current completion: 1 (P0-7: evidence ledger ready)**

---

## Cross-References

- `51-access-telemetry-production-enablement-checklist.md` — Master checklist
- `52-privacy-notice-and-disclosure-copy-pack.md` — Approved copy (Phase 1)
- `53-dpo-npcrs-and-dps-registration-triage.md` — DPO/NPCRS templates (Phase 2)
- `54-data-subject-request-and-breach-response-playbook.md` — DSR/breach playbook (Phase 3)
- `55-access-telemetry-retention-runbook.md` — Retention options (Phase 5)
- `56-access-telemetry-feature-flag-and-rollout-plan.md` — Rollout plan (Phase 7)
- `57-access-telemetry-test-evidence-matrix.md` — Test evidence (Phase 6)
- `58-production-enablement-final-go-template.md` — Sign-off template (Phase 8)
- `63-vendor-processor-dpa-evidence-worksheet.md` — Vendor DPAs (Phase 4)
- `64-access-telemetry-production-evidence-ledger.md` — Evidence tracking
- `66-production-readiness-final-gate-matrix.md` — Gate matrix
