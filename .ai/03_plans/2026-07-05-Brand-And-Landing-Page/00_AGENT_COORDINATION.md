# 00 — Agent Coordination

**Plan:** Brand & Landing Page (2026-07-05)
**Lead:** Sisyphus (OpenCode orchestrator agent)
**Founder/owner:** Philip
**Verification mode:** `emulated` — no independent verifier available; readiness capped at `CONDITIONALLY READY`.

---

## 1. Master `/goal`

Convert Archestimator's public surface from a "founder searching for design partners" posture into a "real product that ships today" posture — without inventing customers, metrics, compliance badges, or roadmap features that do not exist, and without recasting the `MASTER §10.2` "earn every claim" voice principle.

**User outcome:** A serious AEC buyer landing on `archestimator.com` reads the page as a legitimate product, not a hypothesis.

**Business outcome:** The landing stops being a filter that repels serious buyers and starts being an asset that earns the next click.

**Planning scope:** `/`, `/pricing`, `/features`, `/about`, `/contact`, landing-shared components, landing metadata.

**Non-goals:**
- Will NOT touch `/workshop/**`, `/share/[token]`, `/api/**`, auth flows, Cloudflare bindings, migrations, or `package.json`.
- Will NOT recast the brand promise, tagline, or category stack without founder sign-off.
- Will NOT begin implementation in this planning pass.

**Stop condition:** All 20 numbered docs written; cross-references resolve; readiness recorded in `17`; OPEN-DECs registered in `15`; background research/audit tasks either complete or marked as integration-deferred.

**Blocker condition:** Founder rejects the hero-preservation invariant or the product-voice premise. Individual default rejections block only the affected surface.

---

## 2. Lane map and verification mode

Per `Multi-Agent-Execution-Directive.md` §2, the smallest lane set that covers the task's risk and dependency shape.

| Lane | Role | Status | Verification |
|---|---|---|---|
| Lead coordinator | Sisyphus (OpenCode) — scope, sequencing, integration, final claim | ✅ Active | Self |
| Source/codebase analyst | Sisyphus (emulated) — file-by-file audit of public surface | ✅ Complete (`03`) | emulated |
| Brand + voice strategist | Sisyphus (emulated) — voice recasts, anti-beta-wording policy | ✅ Complete (`06`) | emulated |
| Section/UX architect | Sisyphus (emulated) — target section architecture | ✅ Complete (`07`) | emulated |
| Product definer | Sisyphus (emulated) — product nailed down | ✅ Complete (`08`) | emulated |
| Design system reviewer | Sisyphus (emulated) — landing tokens, illustration, motion | ✅ Complete (`09`) | emulated |
| Competitive analyst | Sisyphus (emulated) + background librarian (`bg_57b2df9e`, pending) | ⚠️ Pending — emulated synthesis from `MASTER §2` is sufficient for planning | emulated |
| Risk + decisions registrar | Sisyphus (emulated) | ✅ Complete (`14`, `15`) | emulated |
| Beta-wording auditor | Background explore (`bg_2aafffb3`) — **CANCELLED after 24+ min timeout**; lead's direct `rg` + file reads substituted | ✅ Complete (lead-direct `rg` output captured into `03` §3) | emulated |
| Adversarial reviewer | Sisyphus (emulated) — assumptions challenged in `14`, `15`, `17` | ✅ Complete | emulated |
| Independent final verifier | None available in this environment | ⛔ `verification_mode: emulated` — caps readiness at `CONDITIONALLY READY` per `Multi-Agent-Execution-Directive.md` §2 | emulated |

**Caps applied (per `Multi-Agent-Execution-Directive.md` §2):**
- `verification_mode: emulated` caps readiness at `97`.
- For high-blast-radius planning packages, also caps package status at `CONDITIONALLY READY` unless an independent reviewer or owner accepts the final package.
- Brand + voice recasts are not high-blast-radius in the `exhaustive` sense (no provider/data/auth/security/release impact), but they touch the founder's canon; this package therefore records itself as `CONDITIONALLY READY` pending founder sign-off on the 12 OPEN-DECs in `15`.

---

## 3. Coordination ledger

| Lane | `/goal` | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Lead coordinator | Author + integrate 20-doc plan pack | Whole pack | This file + `README.md` | None | See `01`, `03`, `20` | None | Active |
| Source analyst | File-by-file audit of public surface | `src/app/{/,pricing,features,about,contact,trust}/page.tsx`, `src/components/landing-v3/**`, `src/components/landing/**` | `03_SOURCE_AND_CODEBASE_AUDIT.md` | None | 4 headline findings (`01` §3) | None | ✅ Complete |
| Beta-wording auditor | Line-level inventory of beta/hedge/pre-launch language | Same scope + structured-data file | `03` §3 (table) | Source analyst | 23 critical-line findings, 7 hedge-word findings | None | ✅ Complete (lead-direct `rg`, background explore cancelled) |
| Brand + voice strategist | Anti-beta-wording policy + voice recasts | Voice canon (`MASTER §10.2`), all surface copy | `06_BRAND_AND_COPY_DIRECTION.md` | Source analyst | Voice recast table in `01` §4 + `06` §4 | None — proposals defer to founder via OPEN-DECs | ✅ Complete |
| Section/UX architect | Target section architecture | All 13 sections of `ArchestimatorLandingPage.tsx` | `07_LANDING_PAGE_SECTIONS.md` | Brand strategist | New altitude graph in `07` §2 + cross-section visual treatment in `07` §3 | None | ✅ Complete |
| Product definer | One-source-of-truth product definition | Whole product | `08_PRODUCT_DEFINITION_AND_FEATURES.md` | Source analyst | Live/Building/Planned feature matrix in `08` §3 | None | ✅ Complete |
| Design system reviewer | Landing tokens, illustration, motion, screenshot capture plan | `DESIGN.md`, `globals.css`, landing components | `09_DESIGN_SYSTEM_AND_VISUAL_DIRECTION.md` | Section architect | Token alignment plan in `09` | None | ✅ Complete |
| High-end visual auditor | Typography, buttons, nav, card architecture, motion choreography | `src/components/landing-v3/ArchestimatorLandingPage.tsx`, `landing-v3.module.css`, `09` | `20_DESIGN_AUDIT_AND_VISUAL_DIRECTION.md` | Design system reviewer | 10 audit findings + target archetype + token/component/motion direction | None | ✅ Complete |
| Competitive analyst | Competitive map + positioning matrix | AEC estimating tooling market | `10_COMPETITIVE_AND_MARKET_POSITIONING.md` | Source analyst | 4-wedge positioning in `10` §3 (from `MASTER §2`) | None — `MASTER §2` is canon | ⚠️ Emulated (librarian pending) |
| Risk + decisions registrar | Risk register + decisions + OPEN-DECs | Whole pack | `14_RISK_REGISTER.md`, `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | All lanes | 12 OPEN-DECs in `15` | None — conflicts become OPEN-DECs | ✅ Complete |
| Adversarial reviewer | Challenge assumptions, find omissions | Whole pack | `14` §2 (adversarial matrix), `17` §3 (residual gates) | All lanes | 8 risks, 12 OPEN-DECs, 2 residual gates | None | ✅ Complete |
| Independent final verifier | Requirement-by-requirement completion audit | Whole pack | `17_FINAL_READINESS_REVIEW.md` | All lanes | Verification mode = emulated; readiness = `CONDITIONALLY READY` | None | ⛔ Not independent (emulated by lead) |

**Inter-lane communication:** all lanes were emulated by the lead; no inter-lane messaging channel was used. The lead integrated findings into `01` (executive summary) and `17` (final readiness).

---

## 4. Skills discovered, used, and rejected

Per `Creating-Plan-Prompt.md` §4, the planning agent must inspect available skills and use each whose current instructions materially improve evidence, correctness, or implementation readiness.

### 4.1 Skills loaded and materially used

| Skill | Source | How it shaped this plan |
|---|---|---|
| `ecc:deep-research` | `/ecc:deep-research` slash command (active) | Workflow structure for the parallel librarian research; quality rules (every claim needs a source) applied to `18_RESEARCH_AND_EVIDENCE.md`. |
| `impeccable` | User-installed project skill | Frontend critique lens applied to `03` §1 section-by-section audit and `09_DESIGN_SYSTEM_AND_VISUAL_DIRECTION.md`. |
| `hallmark` | User-installed project skill | Anti-AI-slop / "no templated defaults" lens applied to `06_BRAND_AND_COPY_DIRECTION.md` voice recasts and `07` section architecture. |
| `high-end-visual-design` | User-installed user skill | "Premium SaaS feel" lens applied to `09` design-system direction and `20_DESIGN_AUDIT_AND_VISUAL_DIRECTION.md`. |
| `gpt-taste` | User-installed user skill | Editorial typography + AIDA page structure lens applied to `07` section ordering and `09` typographic rhythm. |
| `frontend` / `frontend-design` | User-installed + plugin skill | React/Next.js boundary discipline + landing-exempt token rules applied to `09` and `11`. |
| `ecc:design-system` | Plugin skill | Design-system audit lens applied to `03` §4 (brand asset inventory) and `09`. |
| `design` | OMX project skill | `DESIGN.md` as canonical UI decision source — respected as alpha-stage per `DESIGN.md` line 322. |
| `visual-qa` | OMX/builtin skill | Visual-QA evidence rules (screenshot + diff) noted as Phase 6 validation gate in `12` and `13`. |
| `dispatching-parallel-agents` | Superpowers project skill | Anti-Duplication Rule + parallel-safe lane classification applied to `11` (Phase 1A–1D parallel classification). |
| `requesting-code-review` + `receiving-code-review` | Superpowers project skill | Reviewer Gate discipline applied to `12` §3 (adversarial QA matrix). |
| `verification-before-completion` | Superpowers project skill | "Evidence before assertions" applied to `17_FINAL_READINESS_REVIEW.md` and to every claim in this pack. |
| `domain-modeling` | Compound Engineering project skill | Used implicitly to keep product-definition terms consistent across `08`, `06`, and `19`. |
| `writing-plans` | Superpowers project skill | Plan-document discipline applied across the whole pack. |
| `ponytail` | User-installed skill (level: full, active) | Lazy-senior-dev lens: smallest correct change wins, no unrequested abstractions, deletion over addition. Applied to `11` (each phase is atomic + minimal-diff) and to `19` (no over-engineered copy structures). |
| `customize-opencode` | Built-in (conditional) | Not triggered — this plan does not edit OpenCode config. |

### 4.2 Skills considered but not materially used

| Skill | Reason rejected |
|---|---|
| `team` | OMX tmux-based orchestration. Not needed for a planning-only single-agent pass. |
| `multi-frontend` | Plugin workflow for multi-model frontend implementation. Not needed for planning. |
| `ecc:gan-design` | Generator/evaluator design loop for frontend. Useful for Phase 5 visual refresh; deferred to implementation pass. |
| `visual-ralph` | Visual Ralph orchestration for frontend UI from references. Deferred to implementation pass. |
| `autopilot` | Strict autonomous loop (clarify→plan→execute→review→QA). Plan-only phase doesn't need execution/QA loops. |
| `ultrawork` | Parallel execution engine. Not used — planning is single-threaded. |
| `ultragoal` | Durable goal/ledger execution over Codex goal mode. Not used — no Codex goal in this pass. |
| `ultraqa` | Adversarial e2e QA. Deferred to implementation pass (recorded in `12`). |
| `ce-frontend-design` | Compound Engineering frontend design skill. Largely overlaps with `impeccable` + `hallmark` + `high-end-visual-design` already used. |
| `agents-sdk`, `cloudflare*`, `wrangler`, `workers-best-practices`, `durable-objects`, `supabase*` | Provider/platform skills. Not in scope — no provider/code changes. |
| `playwright` | Browser automation. Deferred to Phase 6 (A/B test + analytics validation). |
| `ce-debug`, `debugging`, `systematic-debugging` | Debug skills. No bugs to debug in planning. |
| `tdd`, `test-driven-development`, `tdd-workflow` | TDD skills. Deferred to implementation pass; this is planning-only. |
| `lsp-setup`, `programming`, `refactor`, `code-review`, `git-master` | Code-work skills. No code changes in this pass. |
| `ce-plan`, `ce-brainstorm`, `ce-ideate`, `ce-doc-review`, `ce-product-pulse`, `ce-proof`, `ce-promote`, `ce-commit*`, `ce-release-notes`, `ce-compound`, `ce-resolve-pr-feedback` | CE lifecycle skills. Either not relevant to a planning pass or duplicate the OMX/builtin equivalents already used. |
| Other skills (talent, content, ops, Slack, image-gen, demo, lifecycle) | Out of scope for a planning-only pass. |

### 4.3 Skill discovery honesty

- **No fabricated skill use.** Every skill in §4.1 was actually loaded and materially shaped a doc in this pack.
- **No skill name used as proof of work.** The work product is in the docs; the skills are the lens.
- **Unavailable capabilities recorded.** No independent final verifier was available → `verification_mode: emulated` → readiness capped at `CONDITIONALLY READY`. The background librarian (bg_57b2df9e) was launched for cited external research; if it does not return usable output before this pack closes, `18_RESEARCH_AND_EVIDENCE.md` documents the substitute (emulated synthesis from `MASTER §2`).

---

## 5. Workflow contracts and skill integration

Per `Creating-Plan-Prompt.md` §4A, the planning package must reflect canonical workflow discipline.

### 5.1 Autopilot delivery shape (clarify → consensus → execute → review → QA)

For this planning task: do not implement. Instead, document how the future implementation should satisfy the sequence.

- **Clarified requirements already available:** User's verbatim request (in `02` §1) + `MASTER` canon + `03` audit findings.
- **Planning assumptions remaining:** Surfacing of campaign tagline, brand promise, hero CTA copy, founder-bio slot treatment — all in OPEN-DECs.
- **Implementation goals to create:** See `11_IMPLEMENTATION_PLAN.md` (Phase 1–6 WP-* goals).
- **Review gates to be clean before QA:** `bun run validate`, `bun run lint:design-system`, targeted Playwright landing-page audits (`12`).
- **QA gates to pass before release:** Phase 6 adversarial QA matrix (`12` §3).
- **Findings that return to planning:** OPEN-DEC rejections, beta-wording regression (lint catches new occurrences), design-system drift.

### 5.2 Ultragoal-style durable goal ledger

Every implementation phase in `11_IMPLEMENTATION_PLAN.md` includes:
- Goal ID (`WP-*`)
- Objective
- Scope
- Requirements covered (REQ-*)
- Required evidence
- Completion audit
- Checkpoint artifacts
- Stop condition
- Blocker condition
- Review gate
- QA gate

### 5.3 Ultrawork-style parallelization

`11_IMPLEMENTATION_PLAN.md` §3 classifies each phase as:
- Parallel-safe (Phase 1A–1D — different file scopes)
- Sequential because of dependency order (Phase 2A → 2B → 2C — shared landing-content.ts)
- Sequential because of shared-file risk (Phase 5 visual refresh)
- Not worth delegating (Phase 0 OPEN-DEC sign-off; Phase 6 A/B test analysis)

### 5.4 Autoresearch-style evidence

Where external or current best-practice research materially shapes the plan (`10` competitive positioning), it is validator-gated:
- Research question named.
- Primary sources identified (`MASTER §2`, README, current source code).
- Current official guidance distinguished from community convention (where applicable).
- Plan decisions the research changed: see `15` DEC-A (drop "earn every claim" from conversion surfaces) and DEC-C (expand AEC role map from 3 to 7).
- Citations + dates recorded in `18_RESEARCH_AND_EVIDENCE.md`.
- Substitute evidence documented where librarian (bg_57b2df9e) does not return.

### 5.5 Compound engineering plan quality

- Stable IDs: REQ-*, WP-*, AC-*, DEC-*, ASSUMP-*, RISK-*, TEST-*, GATE-*, OPEN-DEC-*.
- Repo-relative paths in plan content.
- Load-bearing technical decisions in `15` with rationale + rejected alternatives.
- Independently landable work packages in `11`.
- Test file paths for behavior-bearing units in `12`.
- Diagrams used where they clarify (README Mermaid dependency graph; `03` §2 altitude graph; `07` §2 target altitude graph).
- No code snippets, imports, or signatures unless essential to explain the design.
- Contradictions resolved in place; no addenda stacked.

### 5.6 React/Next best-practice review

`11_IMPLEMENTATION_PLAN.md` §4 includes a React/Next review gate that checks:
- `"use client"` scoped to the smallest interactive boundary (Hero metric card tooltips, mobile menu, scroll-reveal).
- Server-only data (auth state via `getLandingAuthState`) stays out of client bundles.
- TanStack Query not introduced on the public surface (it's an authenticated-app concern).
- URL state semantics (`#workflow`, `#specialties` anchors) reproduce the same visible state on reload.
- Images use `next/image` with `priority` for the hero, lazy for below-the-fold.
- Fonts use `next/font` (already configured per DESIGN.md).
- Metadata uses `buildLandingMetadata` consistently.

### 5.7 Performance-goal contract

Not heavily applicable to a planning pass. Phase 6 (`13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`) defines Core Web Vitals budgets (LCP, INP, CLS) and an analytics instrumentation plan.

### 5.8 UltraQA-style adversarial QA

`12_TEST_AND_VALIDATION_STRATEGY.md` §3 includes an adversarial scenario matrix covering:
- Empty search results in /features filter.
- Mobile nav collapse + keyboard trap.
- Screen-reader navigation through Claims Ledger (Live/Building/Planned/NotUs).
- Reduced-motion behavior of HeroMountMotion + HeroImageZoom.
- Stale A/B variant assignment after cookie clear.
- Cross-tenant proof: a logged-in user viewing the public landing should still see public copy, not authenticated state.

### 5.9 Superpowers-style skill discipline

Every skill relied on (§4.1) was verified to exist in this environment. No unavailable capability was named as proof of work.

---

## 6. Concurrent repository safety

Per `Multi-Agent-Execution-Directive.md` §6, assume other humans and agents may be working in the repository simultaneously.

**For this planning pass:**
- All writes were confined to `.ai/03_plans/2026-07-05-Brand-And-Landing-Page/**`.
- No source code, tests, migrations, or config touched.
- No git operations performed (no commit, no branch, no push).
- Rechecked git state before each write — the plan directory was empty before this run.

**For the future implementation pass:**
- The executor must `git status --short --branch` before each phase.
- The executor must re-read each affected file before editing (landing copy drifts fast).
- The executor must declare file-ownership intent in a coordination ledger if multiple agents are running.
- The executor must preserve unrelated dirty files in the worktree.
- Branch isolation is recommended for Phase 2A onward (when sequential edits to `landing-content.ts` begin).
- `git diff --check` after each edit is the minimum diff-review discipline.

---

## 7. Final report (planning pass)

See `17_FINAL_READINESS_REVIEW.md` for the canonical completion audit.

**Plan status:** `CONDITIONALLY READY`.
**Verification mode:** `emulated`.
**Reason for cap:** No independent verifier available; founder sign-off on OPEN-DEC-001..005 required before implementation begins.

**Plan deliverables:** 20 numbered docs + README + this file. All paths resolve. All cross-references resolve. Audit inventory line numbers match current `git HEAD`.

**Implementation deliverables (deferred):** Phased rollout per `11`. Each phase has a Goal ID, scope, evidence, and stop condition.

**Post-implementation closeout:** Recasts reflected back into `.ai/00_corpus/ARCHESTIMATOR_MASTER.md` + `.ai/10_state/current-state.md` append-only entry.
