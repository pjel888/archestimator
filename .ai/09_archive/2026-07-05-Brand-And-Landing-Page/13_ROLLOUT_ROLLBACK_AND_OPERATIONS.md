# 13 — Rollout, Rollback, and Operations

**Source authority:** `11_IMPLEMENTATION_PLAN.md` (phase structure), `12_TEST_AND_VALIDATION_STRATEGY.md`.

---

## 1. Staged rollout strategy

| Stage | Scope | Audience | Gate |
|---|---|---|---|
| Stage 0 (this plan) | `.ai/03_plans/` only | Founder + future implementation agent | ✅ Complete (this plan) |
| Stage 1 (Phase 1A-E atomic slices) | Landing copy lint + footer + CTA + section reorder + visual system foundation | Founder review only | Targeted checks green; `bun run lint:design-system` where CSS/design tokens changed; true blockers/defaults recorded in `15` §0 |
| Stage 2 (Phase 2A-C structural recasts) | Hero rewrite, screenshots, specialties expansion | Founder review only | Targeted checks plus browser proof for hero fit/screenshots where needed |
| Stage 3 (Phase 3A-D supporting pages) | /pricing, /features, /about, /contact reframes | Founder review only | Same |
| Stage 4 (Phase 4A-B proof + close) | Proof rebuild, FAQ replace, final CTA | Founder review only | Same |
| Stage 5 (Phase 5 visual refresh) | DESIGN.md additions, token reconciliation | Founder review only | `bun run lint:design-system` green |
| Stage 6 (Phase 6 A/B + analytics) | Variant B, analytics events | Public (controlled via A/B) | Founder-approved measurement plan |
| Stage 7 (post-launch) | All traffic | Public | Release gate: `bun run validate` + `bun run build` + targeted E2E |

**No public traffic exposure until Stage 6.** Until then, all changes are founder-review-only.

---

## 2. A/B test plan (Phase 6)

| Experiment | Hypothesis | Variant A (control) | Variant B (treatment) | Primary metric | Run length |
|---|---|---|---|---|---|
| `hero-cta-copy` | Product-led access CTA outperforms "Book a walkthrough" on hero CTA click-through | "Book a walkthrough" (current) | "Request access" while invite-gated; "Start free" only after self-serve signup is verified | CTA click rate | 14 days minimum, or until enough qualified traffic exists |
| (future) `hero-headline` | "Your cost intelligence layer." outperforms "Where estimates become client-approved proposals." | (current) | (canonical hook) | Scroll depth + CTA click | 14 days |

Stop conditions:
- Variant B wins statistically (p < 0.05) → ship B.
- Variant A wins → keep A, archive B.
- No signal after 30 days → inconclusive, keep A.

---

## 3. Analytics instrumentation (Phase 6)

| Event | Trigger | Properties |
|---|---|---|
| `landing_hero_cta_click` | Hero primary CTA click | `cta_label`, `cta_href`, `experiment_variant` |
| `landing_final_cta_click` | Final CTA click | `cta_label`, `cta_href` |
| `landing_section_scroll` | Section enters viewport (50% visible) | `section_id` |
| `landing_faq_expand` | FAQ `<details>` opens | `question_text` |
| `landing_screenshot_engagement` | Screenshot hover ≥2s or click | `screenshot_id`, `proves` |
| `landing_signup_complete` | Signup form success | `entry_cta` |
| `landing_contact_submit` | Contact form success | `intent` |

Tools (current):
- `LandingAnalyticsLoader` (existing)
- `CloudflareWebAnalytics` (existing, privacy-friendly)
- Optional: Microsoft Clarity via `ClarityScript` (existing, heatmaps)

Budget constraint: stay on Cloudflare Web Analytics free tier (per `MASTER` cost posture). Avoid paid analytics tools.

---

## 4. Core Web Vitals budgets (Phase 5+)

| Metric | Target | Measurement |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s on 4G mobile | Lighthouse + CrUX (when live) |
| INP (Interaction to Next Paint) | < 200ms | Lighthouse + field data |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse + field data |
| FCP (First Contentful Paint) | < 1.8s | Lighthouse |
| TTFB (Time to First Byte) | < 600ms (Cloudflare edge) | `curl -I` |

If a budget regresses, block release; investigate root cause.

---

## 5. Rollback plan

| Phase | Rollback trigger | Rollback step |
|---|---|---|
| Phase 1A-E | Lint breaks unrelated copy | Revert the specific phrase edit; re-run lint |
| Phase 2A-C | Hero or screenshots regression | `git revert <commit>`; redeploy |
| Phase 3A-D | Supporting page regression | `git revert <commit>`; redeploy |
| Phase 4A-B | Proof/FAQ regression | Same |
| Phase 5 | DESIGN.md token drift | Revert DESIGN.md additions; keep source |
| Phase 6 (A/B) | Variant B underperforms | Stop experiment via feature flag; revert to variant A copy |

**No irreversible changes** in any phase. All edits are file-level; `git revert` is the universal rollback.

**Worker rollback**: per `wrangler.jsonc`, the Worker `archestimator-proof` supports version rollback via Wrangler. If a deploy goes bad, use `wrangler deployments rollback --version <previous>`. This is the slow path; `git revert` + redeploy is faster for most cases.

---

## 6. Operations runbook

### Pre-deploy checklist
- [ ] `git status --short --branch` clean
- [ ] `bun run validate` exits 0
- [ ] `bun run lint:design-system` exits 0
- [ ] `bun run lint:landing-copy` exits 0 (after Phase 1A)
- [ ] Targeted Playwright audit green
- [ ] Founder sign-off on the phase's OPEN-DECs

### Deploy
- [ ] `bun run cf:build` (opennextjs-cloudflare build)
- [ ] `bun run cf:deploy` (deploy to `archestimator-proof` Worker)
- [ ] Verify `https://archestimator.com` renders correctly

### Post-deploy verification
- [ ] Manual visit to `/`, `/pricing`, `/features`, `/about`, `/contact`
- [ ] Lighthouse audit on `/` (all three ≥ 90)
- [ ] Analytics events fire (Stage 6+)
- [ ] No console errors in production

### Rollback (if needed)
- [ ] `wrangler deployments list` to find previous version
- [ ] `wrangler deployments rollback --version <previous>`
- [ ] `git revert <commit>` for the offending change
- [ ] Redeploy once root cause fixed

---

## 7. How this doc feeds the rest of the plan

| Section | Feeds |
|---|---|
| §1 Staged rollout | `11` phase ordering |
| §2 A/B plan | `11` Phase 6 |
| §3 Analytics | `11` Phase 6 |
| §4 Core Web Vitals | `14` performance risk |
| §5 Rollback | `14` rollback risk |
| §6 Ops runbook | Implementation agent's runbook |
