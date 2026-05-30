# Ralph Loop Execution Protocol

**Last updated:** 2026-05-30
**Purpose:** Operating protocol for all future Ralph Loop / Codex implementation runs. This ensures every agent follows the same safe, bounded execution pattern.

---

## Core Rule

> **Ralph Loop must not run a broad implementation against the entire roadmap. It must execute one goal card at a time.**

---

## Ralph Loop Cardinal Rules

1. Execute one atomic goal card only.
2. Do not execute epics. If a card is marked EPIC / SPLIT REQUIRED, report it and pick an atomic sub-card.
3. Do not use superseded docs as source of truth. Check 34-roadmap-consistency-index.md.
4. Do not trust merged transport files as canonical.
5. Do not mark DONE without evidence artifact path in .ai/09_archive/store/.
6. Do not mark a skipped test as evidence.
7. Do not make external service changes (Supabase, Vercel, npm publish) unless goal explicitly authorizes them.
8. Stop if an external credential is missing. Report the block.
9. Stop if the goal card is larger than 1-3 hours of work and mark it EPIC / SPLIT REQUIRED.
10. Every implementation must include performance, security, and UX regression notes.

---

## Ralph Loop Required Phases

1. Read compact start pack (35-codex-goal-start-pack.md)
2. Read selected goal card from 26-codex-goal-cards.md
3. Verify card is atomic (not an EPIC)
4. Verify dependencies are satisfied
5. Inspect relevant code using graph tools (GitNexus, code-review-graph)
6. Build minimal implementation plan
7. Implement smallest safe packet
8. Validate (type-check, lint, test)
9. Capture evidence
10. Update roadmap status
11. Stop or continue only within the same card

---

## Stop Conditions

The agent MUST stop immediately and report the block if:

| Stop Condition | Action |
|---------------|--------|
| Unknown owner decision encountered | Report: "Blocked on unknown decision [ID]. Philip must decide." |
| Missing external credentials required | Report: "Blocked — needs [credential]. Cannot proceed without it." |
| Production secret exposure risk | Report: "BLOCKED — secret exposure risk in [file/location]." |
| Migration or destructive database action needed | Report: "BLOCKED — migration/destructive action required at [location]. Philip must authorize." |
| Unresolved test failure outside scope | Report: "Pre-existing test failure in [file]. Cannot proceed until resolved." |
| Performance regression above budget | Report: "Performance regression: [metric] degraded from [before] to [after]. Budget is [budget]." |
| Design-system violation | Report: "Design-system violation: [violation]. Run `bun run lint:design-system`." |
| Security uncertainty on tenant boundaries | Report: "Security uncertainty: [boundary] may be compromised. Needs security review before proceeding." |

---

## Owner Decision Escalation

If the agent encounters an unresolved owner decision:

1. **Stop implementation immediately.**
2. **Do NOT assume a default.** Even if recommended defaults exist.
3. **Report:** "Blocked on decision [ID]: [description]. Philip must answer before implementation can proceed."
4. **Document** the block in the goal card and dashboard.
5. **Move to the next unblocked card.**

---

## Performance Regression Check

Before marking any goal card DONE:

- [ ] Run `bun run build` and check bundle size (main chunk < 200KB gzipped)
- [ ] If goal touches workshop routes, verify route transitions < 200ms
- [ ] If goal touches estimate sheet, verify row edit latency not regressed
- [ ] If goal adds dependencies, verify bundle impact < 50KB gzipped
- [ ] Run `bun run lint:design-system` and confirm pass
- [ ] Run `bun run type-check` and confirm pass

If any check fails, do NOT mark DONE. Fix or document as `ACCEPTED RISK` with Philip approval.

---

## Security Regression Check

Before marking any goal card DONE:

- [ ] New routes/actions have auth checks (verified via code review)
- [ ] New data access respects RLS boundaries
- [ ] No secrets in client bundle (verify with grep)
- [ ] No new `dangerouslySetInnerHTML` without sanitization
- [ ] No new `eval()` or `new Function()`
- [ ] Error messages do not leak internal paths or stack traces

If any check fails, do NOT mark DONE.

---

## UX/Design-System Regression Check

Before marking any goal card DONE (for UI changes):

- [ ] All loading states use Skeleton component
- [ ] All empty states have clear CTAs
- [ ] All error states show recovery paths
- [ ] Font: SF Pro only, 12px max in app, xs radius only, zero letter-spacing
- [ ] Colors: neutral palette only, no raw Tailwind colors in app
- [ ] Icons: Phosphor regular weight outline only
- [ ] No duplicated feature-local controls; reuse shared UI primitives

---

## What Agents Must NEVER Do

1. Run a broad implementation against the entire roadmap
2. Execute multiple goal cards simultaneously
3. Make owner decisions — report the block, do not proceed
4. Deploy to production without Philip approval
5. Change Supabase/RLS policies without corresponding denial tests
6. Add new npm dependencies without bundle-impact analysis
7. Remove or disable design-system linting
8. Modify AGENTS.md without Philip approval
9. Claim "DONE" without evidence artifact paths
10. Run external service commands (Supabase, Vercel, npm publish) unless explicitly authorized by the goal card
11. Execute an EPIC / SPLIT REQUIRED card without first splitting it
12. Reference superseded docs (action-plan.md, status-tracker.md, production-readiness-audit.md)
13. Reference transport/merged artifacts as canonical
14. Trust old counts without verifying from 26-codex-goal-cards.md
15. Skip reading 35-codex-goal-start-pack.md before implementation

---

## Wave Execution Order

```
Wave 0 — Owner defaults codified (DONE — this roadmap pass)
Wave 1 — Environment/staging foundation
Wave 2 — Security evidence foundation
Wave 3 — Observability and performance foundation
Wave 4 — Core UX/onboarding activation
Wave 5 — Share/export/AI validation
Wave 6 — Enterprise MVP features
Wave 7 — Controlled beta go/no-go
Wave 8 — Public/paid launch hardening
```

**Current wave:** Wave 0 is complete. Next: Wave 1 (Environment/staging foundation).

**First Wave 1 card:** `BETA-P0-INF-001` — Staging/environment separation

---

*This protocol applies to all future implementation runs. Agents: read this first before any implementation work.*
