# 14 — Risk Register

> **PASS-2 AUDIT BANNER (2026-06-25).** Add the following HIGH/CRITICAL risks recorded in `18_AUDIT_FINDINGS_AND_CORRECTIONS_2026-06-25.md`:
>
> | ID | Risk | Probability | Impact | Mitigation | Owner |
> |---|---|---|---|---|---|
> | R-PASS2-01 | Implementation AI acts on fabricated action names (FAB-A01) — calls `publishProjectPublication` which doesn't exist | HIGH (cited 7 times in plan) | CRITICAL (build break) | Use corrected action list from 18_ + audit-banner on §07 | Plan author |
> | R-PASS2-02 | Roster function added to workspace-repository.ts conflicts with Ponytail T2.3 split (FAB-A09) | MED | HIGH (rework) | Place in new `src/lib/publisher/roster-repository.ts` | Phase 1 implementer |
> | R-PASS2-03 | Rotate-token race condition causes recipient lockout (ARCH-DEFECT-03) | LOW | HIGH (user-facing failure) | D-ARCH-05 resolved: DB-level per-publication rotate serialization/lock | Phase 2 implementer |
> | R-PASS2-04 | Bulk recipient add triggers Resend blast (ARCH-DEFECT-05) | MED | HIGH (email abuse) | FR-07 cap at 50 emails per action | Plan author |
> | R-PASS2-05 | Sheet-selection change invalidates all recipient cookies (ARCH-DEFECT-11) | MED | HIGH (UX regression) | D-ARCH-08 resolved: bump `snapshot_version`, keep access cookies valid, refresh view-token state | Plan author |
> | R-PASS2-06 | Philippines DPA non-compliance (OWASP-GAP-04) | MED | HIGH (regulatory) | Add 4-element NPC coverage in §08 | Plan author |
> | R-PASS2-07 | SEC-02 token leak in logs unresolved (OWASP-GAP-08) | MED | HIGH (token compromise) | Specify fallback path in §08 + Phase 1.5 | Plan author |
> | R-PASS2-08 | Launch-Readiness-Audit references point at non-existent paths (ARCH-DEFECT-07) | HIGH (4 references) | CRITICAL (release-blocking dependency claim unverified) | Locate actual paths or inline gate criteria | Plan author |
> | R-PASS2-09 | Optimistic rotate UI flashes old token (ARCH-DEFECT-04) | MED | MED (UX) | Add flash test in §12 | Phase 1 implementer |
> | R-PASS2-10 | 768px tablet users excluded by UX-04 floor (ARCH-DEFECT-13) | MED | MED (PH/SEA market) | Test at 768px in §13 | Plan author |
>
> Read doc 18_ for full evidence and corrections.

---

## Risk scoring

- **Probability**: 1 (rare) → 5 (almost certain)
- **Impact**: 1 (negligible) → 5 (catastrophic)
- **Severity**: Probability × Impact (1–25)
- **Severity band**: 1–4 LOW · 5–12 MED · 13–25 HIGH

## Risks

### R-SEC-01 · Privilege escalation via roster aggregation
- **Description.** The unified workspace roster aggregates publications from multiple projects; a bug in the rollup query could leak publications across workspace or role boundaries.
- **Trigger.** Incorrect `workspace_id` predicate in `readWorkspacePublicationsRoster`; missing RLS check; client-side filter fetches privileged superset.
- **Probability.** 2.
- **Impact.** 5.
- **Severity.** 10 (MED-HIGH).
- **Affected areas.** `src/lib/publisher/roster-repository.ts` (new function), `src/app/workshop/publisher/page.tsx`, all `src/components/workshop/publisher/*`.
- **Detection.** `tests/vitest/publisher-rbac.test.ts` (viewer/editor/admin/cross-workspace assertions). Manual OWASP ZAP scan.
- **Prevention.** ARCH-01 (RSC-first), SEC-01 (RLS end-to-end), SEC-05 (no client-side privileged filter).
- **Mitigation.** If detected: RUNBOOK-006 (disable Publisher) + RUNBOOK-007 (investigate).
- **Contingency.** Revert to stub; forensic audit; re-design rollup with explicit per-workspace RPC.
- **Owner.** Lead + CE security-reviewer.
- **Residual risk.** Low after SEC-01 + TEST-02 enforcement.

### R-SEC-02 · Token leak via logs / source maps / error messages
- **Description.** Raw share-link tokens accidentally captured in Vercel logs, error messages, or client bundles.
- **Trigger.** Verbose error logging; URL params in request logs; source map exposure.
- **Probability.** 2.
- **Impact.** 4.
- **Severity.** 8 (MED).
- **Detection.** `rg "token=" logs/` post-deploy; security-contract tests for log redaction.
- **Prevention.** SEC-02; verify Next.js logging config redacts `?token=` query params.
- **Mitigation.** Rotate all publications with suspected leaks; audit row written.
- **Contingency.** Disable Publisher; full forensic review.
- **Owner.** Lead.
- **Residual risk.** Low after SEC-02 contract test added.

### R-SEC-03 · Missing audit row on manager action
- **Description.** A manager action bypasses the audit INSERT, leaving a security gap.
- **Trigger.** Code path that throws before audit INSERT; transaction rollback that swallows audit.
- **Probability.** 2.
- **Impact.** 4.
- **Severity.** 8 (MED).
- **Detection.** Extend `tests/vitest/security-findings-publication-contracts.test.ts` to assert audit row count per action.
- **Prevention.** DATA-05; SEC-07.
- **Mitigation.** Add audit INSERT in failing path; backfill from action log.
- **Owner.** Implementation AI.
- **Residual risk.** Low after contract test enforced.

### R-PERF-01 · Roster render slower than 1.2s p95 at scale
- **Description.** Application-layer loop over per-project publication summaries becomes slow beyond 50 projects.
- **Trigger.** Workspace with 50+ projects each with publications.
- **Probability.** 3.
- **Impact.** 3.
- **Severity.** 9 (MED).
- **Detection.** Vercel Analytics p95; Playwright trace.
- **Prevention.** PERF-01 budget; batched queries.
- **Mitigation.** Phase 2 RPC `workspace_publications_summary` (SQL-side rollup).
- **Contingency.** Cap roster at 50 rows with "Load more" pagination.
- **Owner.** Implementation AI.
- **Residual risk.** Medium until RPC lands.

### R-PERF-02 · Drawer lazy-chunk > 30KB gzipped
- **Description.** Drawer client bundle bloats from over-importing UI primitives.
- **Trigger.** Direct import of `dropdown-menu` full suite when only `DropdownMenu` is needed; D3 pulled in by accident.
- **Probability.** 3.
- **Impact.** 2.
- **Severity.** 6 (MED-LOW).
- **Detection.** `bun run build` bundle report.
- **Prevention.** ARCH-06 (no new mega-file); tree-shake friendly imports.
- **Mitigation.** Refactor imports to per-component.
- **Owner.** Implementation AI.
- **Residual risk.** Low.

### R-PERF-03 · Activity feed N+1 across 5 audit tables
- **Description.** Application-layer union fires 5 separate queries per page render.
- **Trigger.** Default Phase 1 implementation.
- **Probability.** 4.
- **Impact.** 2.
- **Severity.** 8 (MED).
- **Detection.** Supabase `pg_stat_statements`; Playwright trace.
- **Prevention.** Batched queries; PERF-04 pagination.
- **Mitigation.** Phase 2 `workspace_activity_feed` RPC.
- **Contingency.** Cache first page for 60s.
- **Owner.** Implementation AI.
- **Residual risk.** Medium until RPC lands.

### R-CONC-01 · Sidebar branch collision
- **Description.** `feat/sidebar-redesign` branch edits `MainSidebar.tsx`; Publisher needs to add 1 nav item.
- **Trigger.** Concurrent merge of both branches.
- **Probability.** 4.
- **Impact.** 2.
- **Severity.** 8 (MED).
- **Detection.** `git status` during Phase 1.0 pre-flight.
- **Prevention.** Coordinate merge order; Publisher branch rebases on sidebar first.
- **Mitigation.** Manual merge resolution.
- **Contingency.** Defer Publisher sidebar item until sidebar branch lands.
- **Owner.** Lead.
- **Residual risk.** Low.

### R-CONC-02 · Project-delete branch cascade change
- **Description.** `codex/fix-project-delete` modifies `project_publications` cascade behavior.
- **Trigger.** Concurrent edits to `project_publications` RLS or FK.
- **Probability.** 2.
- **Impact.** 3.
- **Severity.** 6 (MED-LOW).
- **Detection.** Phase 0 pre-flight git status.
- **Prevention.** Publisher does NOT edit `project_publications` schema or RLS.
- **Mitigation.** Rebase after `codex/fix-project-delete` lands.
- **Owner.** Lead.
- **Residual risk.** Low.

### R-UX-01 · Modal coexistence confusion
- **Description.** Builders see both the old `ProjectPublicationHeader` modal AND the new Publisher drawer; confusion about which to use.
- **Trigger.** Phase 1–3 ships without Phase 4 consolidation.
- **Probability.** 4.
- **Impact.** 2.
- **Severity.** 8 (MED).
- **Detection.** User feedback.
- **Prevention.** In-app banner on modal: "Try the new Publisher".
- **Mitigation.** Phase 4 consolidation.
- **Contingency.** Deprecate modals earlier.
- **Owner.** Philip (D4 decision).
- **Residual risk.** Medium until Phase 4.

### R-UX-02 · Mobile users blocked
- **Description.** Builder opens `/workshop/publisher` on phone; sees empty-state redirect; frustration.
- **Trigger.** Mobile viewport.
- **Probability.** 3.
- **Impact.** 2.
- **Severity.** 6 (MED-LOW).
- **Detection.** Vercel Analytics device breakdown.
- **Prevention.** UX-04 responsive floor at 1024px; branded empty state at < 768px.
- **Mitigation.** Future: responsive Publisher (Phase 5+).
- **Owner.** Philip.
- **Residual risk.** Low (builder persona is desktop-first).

### R-RELIABILITY-01 · Resend digest pipeline overload
- **Description.** Bulk recipient add triggers many digest emails; Resend rate-limits.
- **Trigger.** Manager adds 20+ recipients at once.
- **Probability.** 2.
- **Impact.** 2.
- **Severity.** 4 (LOW).
- **Detection.** Resend API logs; existing digest slot throttle.
- **Prevention.** Existing `atomic_publish_and_digest_slot` RPC handles throttling.
- **Mitigation.** Queue digests; existing behavior.
- **Owner.** Existing infrastructure.
- **Residual risk.** Low.

### R-DOC-01 · Spec docs drift after Phase 1
- **Description.** `.ai/06_specs/shared-link-and-publication-spec.md` not updated; future agents miss the Publisher surface.
- **Trigger.** Phase 1 ships without doc update.
- **Probability.** 3.
- **Impact.** 2.
- **Severity.** 6 (MED-LOW).
- **Detection.** Reviewer gate.
- **Prevention.** DOC-01..05 requirements; reviewer checklist.
- **Mitigation.** Post-Phase-1 doc sprint.
- **Owner.** Implementation AI.
- **Residual risk.** Low.

### R-EXT-01 · Launch-Readiness-Audit blockers persist
- **Description.** Publisher cannot ship to external users because `Share-Routes-And-Proxy-Self-Gating` audit gates are not closed.
- **Trigger.** External/public launch decision.
- **Probability.** 5.
- **Impact.** 4.
- **Severity.** 20 (HIGH).
- **Detection.** `2026-06-19-Launch-Readiness-Audit/` status.
- **Prevention.** Publisher explicitly does NOT release-gate on this; closed-beta internal use is fine.
- **Mitigation.** Coordinate launch with audit closure.
- **Contingency.** Delay Publisher public launch until audit closes.
- **Owner.** Philip + Launch-Readiness-Audit leads.
- **Residual risk.** HIGH until audit closes.

### R-EXT-02 · Supabase project boundary violation
- **Description.** Agent accidentally mutates a different Supabase project (e.g., `archestimator` instead of `ebxxqidacheyapmmzavr`).
- **Trigger.** Wrong project ID in migration script.
- **Probability.** 1.
- **Impact.** 5.
- **Severity.** 5 (MED).
- **Detection.** Migration file review; `supabase status` check.
- **Prevention.** AGENTS.md mandate: `ebxxqidacheyapmmzavr` only.
- **Mitigation.** Restore from backup; file incident.
- **Owner.** Lead.
- **Residual risk.** Low (mandate is explicit).

### R-PROC-01 · Implementation AI skips plan
- **Description.** Future implementation AI ignores this plan pack and free-forms the implementation.
- **Trigger.** New agent session without context.
- **Probability.** 3.
- **Impact.** 3.
- **Severity.** 9 (MED).
- **Detection.** Code review against plan traceability matrix.
- **Prevention.** Plan pack is the canonical source; AGENTS.md mandates reading.
- **Mitigation.** Re-trace work against `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`.
- **Owner.** Lead.
- **Residual risk.** Medium.

## Risk summary

| Severity band | Count |
|---|---|
| HIGH (13–25) | 1 (R-EXT-01) |
| MED (5–12) | 9 |
| LOW (1–4) | 4 |
| **Total** | **14** |

## Top 3 risks to watch

1. **R-EXT-01** Launch-Readiness-Audit blockers (HIGH) — externally blocked; coordinate.
2. **R-SEC-01** Privilege escalation (MED-HIGH) — internal controls in place via SEC-01/TEST-02.
3. **R-PERF-01** Roster render at scale (MED) — Phase 2 RPC is the escape valve.

## Risk review cadence

- Per-phase: lead reviews top 3 risks.
- Monthly: full risk register review while Publisher is in active development.
- Post-launch: incident-driven review.
