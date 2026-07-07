# 15 — Decisions, Assumptions, and Alternatives

## Decisions

### DEC-HOME — Canonical-home location (OPEN-1, owner decision)
- **Problem:** where does the single canonical home live so both humans and agents find it?
- **Constraints:** must be discoverable by new contributors AND by agents; must not bloat `AGENTS.md`; should not conflict with `current-state.md`'s role as append-only history.
- **Options:**
  1. `docs/OPERATIONAL_TRUTH.md` — top-level, conventional, visible to non-`.ai` readers. **(recommended)**
  2. `.ai/10_state/operational-truth.md` — co-located with the agent brain; signals "agent source".
  3. Inline into `AGENTS.md` — rejected: `AGENTS.md` is already large; generated content there is noisy and conflict-prone.
  4. Inline into `current-state.md` — rejected: it is append-only history, not a stable home.
- **Security/Performance/Operational implications:** all options are equivalent on security (public config only) and perf (no runtime). Option 1 wins on discoverability; option 2 wins on "agent-brain" signaling.
- **Recommendation:** option 1 (`docs/OPERATIONAL_TRUTH.md`), with `AGENTS.md` and `current-state.md` Fast Path both pointing to it.
- **Reason:** the failure mode this pack fixes is *agents and humans not finding truth*. Top-level `docs/` is the most discoverable. Agents already read `docs/` per AGENTS.md guidance.
- **Consequences:** one more top-level-ish file; `AGENTS.md` gains a pointer bullet.
- **Conditions that would change it:** owner prefers `.ai/` containment for all agent-facing truth → option 2.
- **Status:** OPEN — owner confirm. Cheap to swap later.

### DEC-CANONICAL-SCRIPT — Umbrella detector lives in this pack (resolves sibling overlap)
- **Problem:** `2026-07-07-d1-migration-state-and-schema-integrity` Phase 4 also plans a D1-migration-count stale-doc guard. Two scripts would duplicate.
- **Options:**
  1. Umbrella detector here (`check-operational-truth-drift.mjs`); D1 migration count is one fact-class within it. Sibling's Phase 4 → "contributor". **(chosen)**
  2. Two scripts (D1-only in sibling, everything-else here). Rejected: two detectors, two CI gates, drift between them.
  3. Move the umbrella into the sibling. Rejected: sibling is D1-scoped by name; this pack is the operational-truth umbrella.
- **Reason:** this pack's scope is explicitly "operational source-of-truth" across all surfaces; the D1 count is a subset.
- **Consequence:** execution must update the sibling's Phase-4 reference (T-12, doc-only).
- **Status:** decided (planning-level); execution implements.

### DEC-MECHANICAL-VS-POSTURE — Split mechanical (generated) from posture (curated)
- **Problem:** some facts are mechanical (cron, migration count, bindings); others are narrative posture (provider-exit, cost, retention). A fully-generated doc can't capture posture; a fully-curated doc drifts on mechanical facts.
- **Decision:** snapshot generates mechanical facts; home quotes them (detector asserts the quote); posture sections are curated with a mandatory source citation + status marker (detector asserts the marker exists, not the narrative truth).
- **Rejected alternative:** fully-generated Markdown home. Rejected: posture resists generation.
- **Status:** decided.

### DEC-NO-CLOUDFLARE-API — Generator reads files only, never the provider
- **Problem:** should the snapshot verify remote D1 migration-apply state, remote cron registration, etc.?
- **Decision:** no. Generator reads local committed files only. Remote reconciliation is the sibling d1-migration-integrity pack's job. The home labels `migrationCount` as "local files; remote-apply in d1-integrity pack".
- **Reason:** keeps this feature free-tier, zero-auth, zero-quota, fast, and CI-safe. Avoids a new secret surface.
- **Status:** decided.

### DEC-MJS-DETECTOR — Detector is zero-dependency `.mjs`
- **Problem:** detector runs in pre-commit/CI; speed and supply-chain matter.
- **Decision:** Node ESM `.mjs`, built-ins only, no JSONC parser dep (tolerant comment-stripper if needed, with a test).
- **Status:** decided.

## Assumptions (from `02`, restated with validation status)

- ASSUMP-1 (`wrangler.jsonc` = declarative substrate): **validated** — repo evidence §3.1.
- ASSUMP-2 (`migrations/` active, `supabase/migrations/` legacy): **validated** — `AGENTS.md:41`.
- ASSUMP-3 (`cloudflare-env.d.ts` auto-generated, out of detector scope): **validated** — header + `cf:typegen`.
- ASSUMP-4 (`worker.ts` is behavioral cron source): **validated** — `worker.ts:107-111`.
- ASSUMP-5 (owner prefers Markdown home, partly generated): **unvalidated** — OPEN-1/DEC-HOME confirms.

## Open decisions

- **OPEN-1 (DEC-HOME):** canonical-home path. Owner: Philip. Blocks IMPLEMENTATION-READY (not the work itself — a cheap path swap). Recommendation: `docs/OPERATIONAL_TRUTH.md`.
- **OPEN-2 (CI wiring, OPS-1):** GitHub Actions vs. pre-commit vs. release-gate-only. Depends on whether Actions is re-enabled. Owner: Philip. Recommendation: CI + release-gate; pre-commit fallback while Actions disabled.
- **OPEN-3 (cadence, FR-6):** weekly manual audit sufficiency while CI disabled. Owner: Philip.

## Alternatives considered and rejected (architecture-level)

- **ALT-B fully-generated home:** rejected (DEC-MECHANICAL-VS-POSTURE).
- **ALT-C inline into AGENTS.md:** rejected (DEC-HOME option 3).
- **ALT-D KV/DO live-truth endpoint:** rejected — adds runtime dep, cost, auth surface for a docs problem; violates free-tier posture.
- **ALT-E rely on `generate-cloudflare-migration-inventory.ts` for active count:** rejected — it scans `supabase/migrations/` only (§3.5 latent bug). The generator counts `migrations/` directly. (Separately, that script's limitation should be fixed or documented — RISK-12, out of scope here.)

## Owner-delegated planning decisions

Per Multi-Agent Execution Directive §13, if the owner grants authority for a planning-only task, reversible planning/product decisions may be resolved in-document. The decisions DEC-CANONICAL-SCRIPT, DEC-MECHANICAL-VS-POSTURE, DEC-NO-CLOUDFLARE-API, DEC-MJS-DETECTOR are **owner-delegated planning decisions** (reversible, docs-only, no behavior change). DEC-HOME and the OPS-1 wiring remain owner-confirm because they affect discoverability/cadence in a way the owner should ratify. None of these authorizes destructive commands, provider changes, code edits, or claims of human approval.
