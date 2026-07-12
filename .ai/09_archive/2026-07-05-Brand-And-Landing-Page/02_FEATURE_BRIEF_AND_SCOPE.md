# 02 — Feature Brief and Scope

**Source:** User request, 2026-07-05
**Plan profile:** `standard`
**Plan kind:** Planning-only

---

## 1. The feature brief (verbatim, normalized)

> "We need to deeply improve our branding and landing page.
>
> We need to present our landing page, specifically the copy, that we are a legitimate app and so like no beta wording and all.
>
> The good thing about our landing page is the hero section but other than that, it really lacks a lot of things.
>
> We need to be able to nail down our product. list down our features and all and be able to sell it.
>
> And so we must audit our current landing page and then list down the good and the bad and then plan for it comprehensively.
>
> This is a planning task and not a coding/implementation task."

Reference paths supplied by the user:
- Output directory: `/Users/philiplewis/Documents/archestimator/.ai/03_plans/2026-07-05-Brand-And-Landing-Page`
- Planning template: `.ai/08_prompts/000_Planning Prompts/Creating-Plan-Prompt.md`
- Execution directive: `.ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md`

The user also stacked skill-name triggers (`/dispatching-parallel-agents /team /multi-frontend /frontend-design /frontend /ecc:design-system /gpt-taste /ecc:gan-design /high-end-visual-design /visual-ralph /visual-qa /design /autopilot /ultrawork /ultragoal /ultraqa`) and the `/ecc:deep-research` slash command. These signal the breadth of skill coverage the user wants the plan to leverage, not a mandate to execute every skill. Skill selection rationale is recorded in `00_AGENT_COORDINATION.md`.

---

## 2. Master goal (operating contract)

**Outcome:** A planning package that converts the public surface from a "founder searching for design partners" posture into a "real product that ships today" posture — without inventing proof the company does not have.

**Problem being solved:**
1. The current landing page reads as pre-product despite shipping a Live MVP.
2. The hero is strong; the rest of the page is thin and abstract.
3. The product itself has never been written down in one place outside Notion (per `MASTER §0`: "Notion remains canonical for live trackers and decided items"). The plan must compile it.
4. Beta-stage language is scattered across the public surface (audit inventory in `03_SOURCE_AND_CODEBASE_AUDIT.md` §3).
5. The /pricing, /features, /about, /contact pages each undermine legitimacy in their first screen.

**Intended feature behavior (post-implementation):**
- A landing page whose sections earn the user's attention step-by-step: hook → problem → product proof → workflow → specialties → comparison → real proof → objection-handling → close.
- A copy register that reads as confident-but-honest, never as early-product.
- A claims discipline that keeps the `MASTER §10.2` "earn every claim" rule but moves "what we are NOT" claims off conversion surfaces.
- A product definition artifact that any future implementation agent or marketer can use as ground truth.

**Planning scope (in scope):**
- `/` landing page (hero, all sections, footer, nav, audience banner).
- `/pricing` page.
- `/features` page (Claims Ledger surface).
- `/about` page (mission, founder slot, limitations).
- `/contact` page.
- Landing-shared: `src/components/landing/**`, `src/components/landing-v3/**`, `src/lib/landing/**`.
- SEO/metadata surface: `src/app/layout.tsx`, `src/lib/landing/seo-metadata.ts`, `src/app/sitemap.ts`.
- `DESIGN.md` extensions for landing-specific tokens.
- Brand voice recast proposals (deferred to founder sign-off via OPEN-DECs).

**Planning scope (out of scope):**
- The authenticated `/workshop` app, all `/workshop/**` routes.
- The `/share/[token]` publication viewer.
- The `/invite/[token]` invite flow.
- Auth flows (`/login`, `/signup`, `/auth/**`).
- All `/api/**` routes.
- The Cloudflare Worker, D1, R2, DO, Queue, Email bindings and `wrangler.jsonc`.
- All `migrations/**` and `supabase/**`.
- `package.json` and `bun.lockb`.
- The founder master corpus (`MASTER §x`) — proposals go to `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md`, not direct edits.

**Non-goals (explicit refusals):**
- Will NOT invent customer logos, testimonials, adoption metrics, partner names, or compliance badges.
- Will NOT claim roadmap items are shipped.
- Will NOT delete the Claims Ledger system. The system stays; its surfacing changes.
- Will NOT recast `MASTER §10.2` "earn every claim." The principle stays; where the claims appear on public surfaces changes.
- Will NOT commit to a launch date or pricing numbers (those remain gated by `MASTER §9.3`).
- Will NOT touch the authenticated workshop, the publication viewer, the auth flow, the API routes, or the Cloudflare bindings.
- Will NOT begin implementation in this planning pass.

**Required codebase analysis:**
- File-by-file audit of every public-surface React component and route entrypoint under `src/app/{/,pricing,features,about,contact}/` and `src/components/landing*/**`.
- Line-by-line beta-wording inventory across the same scope.
- Brand asset inventory (logo, tagline, brand promise, brand-orange usage).
- Claims Ledger audit (`src/components/landing/claims-ledger/claims-data.ts`).
- `DESIGN.md` landing-specific token review (lines 487–525, "Public landing" section).
- Cross-reference with `.ai/00_corpus/ARCHESTIMATOR_MASTER.md` v4.3 for canon consistency.

**Required specialist workstreams (lane map):**

| Lane | Role | Status |
|---|---|---|
| Lead coordinator | Sisyphus (OpenCode) | Active |
| Source/codebase analyst | Sisyphus (emulated) | ✅ Complete (file-by-file) |
| Brand + voice strategist | Sisyphus (emulated) | ✅ Complete (`06`) |
| Section/UX architect | Sisyphus (emulated) | ✅ Complete (`07`) |
| Product definer | Sisyphus (emulated) | ✅ Complete (`08`) |
| Design system reviewer | Sisyphus (emulated) | ✅ Complete (`09`) |
| Competitive analyst | Sisyphus (emulated) + background librarian (bg_57b2df9e) | ⚠️ Librarian pending; emulated synthesis from `MASTER §2` is sufficient for planning |
| Risk + decisions registrar | Sisyphus (emulated) | ✅ Complete (`14`, `15`) |
| Beta-wording auditor | Background explore (bg_2aafffb3) | ⛔ Pending — will be integrated into `03` and `18` when complete; current `03` uses lead's direct file reads |
| Adversarial reviewer | Sisyphus (emulated) | ✅ Complete — see `14` and `17` |
| Independent final verifier | None available | ⛔ `verification_mode: emulated` — caps readiness at `CONDITIONALLY READY` |

**Implementation-readiness criteria (for the eventual implementation pass):**
- All 12 OPEN-DECs resolved by founder (see `15`).
- `bun run lint:design-system` green before edits.
- `git status --short --branch` clean on the chosen branch.
- The `claims-matrix-check` gate still reconciles `claims-data.ts` against the live Feature Inventory.

**Validation criteria (for this planning pass):**
- All 20 numbered docs created.
- Cross-references resolve (every `*.md` link points at a real file).
- No source code, tests, migrations, or config touched.
- Audit inventory line numbers match the actual `git rev-parse HEAD` source.
- Every requirement has a source (`SRC-*`), an acceptance criterion (`AC-*`), and a work package (`WP-*`).

**Final planning deliverables:**
- `README.md` (entrypoint, status, dependency graph).
- `00_AGENT_COORDINATION.md` through `19_COPY_DEPLOYABLE_PACK.md` (20 numbered docs).
- This file (`02_FEATURE_BRIEF_AND_SCOPE.md`).

---

## 3. Plan profile selection rationale

Per `Creating-Plan-Prompt.md` §9, three plan profiles exist: `compact`, `standard`, `exhaustive`.

**Selected profile: `standard`.**

Rationale:
- This is not a `compact` task. It touches 16+ source files across 5 routes, the brand voice canon, and the founder's strategic posture. A single-page plan would leave the implementation agent rediscovering context.
- This is not `exhaustive` either. The exhaustive profile is reserved for "high-blast-radius, security/data/auth/provider/release, cross-cutting" work. Brand + landing page work is **user-visible but not provider-bearing, not data-bearing, not security-bearing** (the authenticated app and the API are out of scope). No migrations. No Cloudflare binding changes. No auth changes.
- The `standard` profile permits a focused doc set covering coordination, source map, requirements, architecture, implementation plan, test/validation, risk/decisions, and final readiness. This plan adds extra docs (`06` Brand, `07` Sections, `08` Product, `09` Design System, `10` Competitive, `19` Copy Pack) because the breadth of the request justifies them, but skips the exhaustive profile's `07_DATA_DATABASE_API_NETWORK_PLAN.md`, `08_SECURITY_PRIVACY_THREAT_MODEL.md`, `20_COST_MODEL_AND_PRICING_INPUTS.md`, `21_PROVIDER_PARITY_MATRIX.md` — none of those apply.

---

## 4. Boundary contract with the founder

This plan is **subordinate to**:
- `AGENTS.md`
- `.ai/00_corpus/ARCHESTIMATOR_MASTER.md` v4.3
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/10_state/current-state.md`
- Current source files in `src/components/landing-v3/`, `src/app/{pricing,features,about,contact}/`

If the plan and the MASTER corpus conflict, the MASTER wins. The plan will either align with the MASTER or escalate the conflict as an OPEN-DEC.

The plan does NOT:
- Recast the brand promise ("You never start from zero again. Your numbers hold up.") without founder sign-off.
- Recast the campaign tagline ("From cost proposal to client approval.") without founder sign-off.
- Recast the category stack ("cost intelligence layer" hook, "construction cost estimating platform" plain anchor) without founder sign-off.
- Recast `MASTER §10.2` voice principles (lead with the change; plain words + one idea; calm conviction; attack the workflow not the user; earn every claim).

The plan **does** propose:
- A reframing of where the honesty anchors surface (lower in the page, on dedicated trust/limitations surfaces, not on the hero or the pricing page top).
- A copy register recast from "early product / hypothesis" to "real product that ships today" — without overclaiming.
- A section architecture reorder — Live proof above the fold, claims discipline in a dedicated area.
- An expansion of the AEC role map from 3 specialties to 7 (matching the README + MASTER §6.2).
- A high-end visual direction refresh that fixes the font, button, nav, card, and motion issues surfaced in `20_DESIGN_AUDIT_AND_VISUAL_DIRECTION.md` (tokens, type scale, precision frames, shared CTA geometry, contained/floating nav treatment, restrained motion).

All five of those are proposed, not executed. Founder sign-off required via the OPEN-DECs in `15`.

---

## 5. Stop conditions

The planning pass stops when:
- All 20 numbered docs are written.
- Cross-references resolve.
- The readiness status is recorded in `17_FINAL_READINESS_REVIEW.md`.
- The OPEN-DECs are registered in `15`.
- The background research/audit tasks (bg_57b2df9e, bg_2aafffb3) are either complete or marked as integration-deferred in `18_RESEARCH_AND_EVIDENCE.md`.

The implementation pass (separate from this plan) stops when:
- All Phase 1–6 work packages are complete.
- Every REQ-* in `04` is `proven` or `deferred_with_rationale`.
- The founder has signed off on the final surfaced copy.
- The targeted validation for each phase passes; full `bun run validate`, build, and targeted browser audits run only where release or risk warrants them.
- Post-impl recasts are reflected back into the MASTER corpus and current-state log.

---

## 6. Blocker conditions

The plan is **blocked** if:
- The founder rejects the hero-preservation invariant or the product-voice premise. A rejection of an individual default blocks only that affected surface.
- The current source code drifts so far that the audit's file:line references no longer resolve (the executor must re-verify on implementation pass).
- A concurrent agent is editing `src/components/landing-v3/**` or `src/app/{pricing,features,about,contact}/page.tsx` at the same time as the implementation pass (the executor must coordinate via `00_AGENT_COORDINATION.md`).

The plan is **NOT blocked** by:
- The background librarian (bg_57b2df9e) timing out. The `MASTER §2` competitive research is sufficient.
- The background explore (bg_2aafffb3) timing out. The lead's direct file reads for the audit are sufficient.
