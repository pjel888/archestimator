# 10 — Blast Radius & Dependencies

## §1. Direct impact (the gate itself, when implemented)

| Area | Impact | Classification |
|---|---|---|
| `scripts/launch-gate/*` (new) | New files | Required change |
| `scripts/run-launch-evidence-gate.ts` (new) | New entry | Required change |
| `package.json` | 3 new scripts (`launch:gate`, `:strict`, `:full`) | Required change (additive) |
| `tests/unit/launch-gate/*` (new) | New tests | Required change |
| Anchor scripts (WP-1.2) | Additive `--launch-gate-json` hook | Probable change (additive, non-breaking) |
| `.github/workflows/launch-gate.yml` | New (owner-gated) | Possible change |
| Owner runbook | New doc | Required change |

## §2. Transitive impact

| Area | Impact | Classification |
|---|---|---|
| Application source | **None** | Explicitly unaffected |
| Application tests | **None** | Explicitly unaffected |
| D1/R2/DO/Queue/Email | **None** (read-only stage 2/3) | Explicitly unaffected |
| CI behavior | New advisory job (if re-enabled) | Possible change |
| Existing anchor script behavior | **None** (hooks are additive) | Explicitly unaffected |
| `validate` script | **None** (gate is separate) | Explicitly unaffected |
| Other sibling packs | **None** (gate cites them) | Explicitly unaffected |

## §3. Backward compatibility

- The gate is **fully additive**. Nothing existing is removed or changed in behavior.
- Anchor hooks (WP-1.2) are non-breaking (additive flag).
- `package.json` additions do not alter existing scripts.

## §4. Dependencies

| Dependency | Type | Risk |
|---|---|---|
| Bun 1.3.14 | runtime | existing; none |
| TypeScript | build | existing; none |
| Anchor scripts | runtime (stage 1+) | existing; their behavior is their own contract |
| Cloudflare auth | runtime (stage 2+) | operator-gated; missing → skipped |
| Live deploy | runtime (stage 3) | operator-gated; missing → missing-evidence |
| Sibling packs (for DOM-41+ verdicts) | data | missing-evidence until they land anchors |

## §5. Affected documentation

- This pack (`README.md` updated post-implementation).
- `OWNER_RUNBOOK.md` (new).
- `.ai/10_state/current-state.md` (append launch decision once made).
- `scripts/launch-gate/anchor-matrix.md` (new).

## §6. Concurrent-development safety

- All new files in `scripts/launch-gate/` and `tests/unit/launch-gate/` — disjoint from application code, so no conflict with feature agents.
- `package.json` edits are additive; coordinate via fresh `git status` (shared worktree rule).
- Anchor hook edits (WP-1.2) touch files other agents may edit; re-read before edit, small diffs.
