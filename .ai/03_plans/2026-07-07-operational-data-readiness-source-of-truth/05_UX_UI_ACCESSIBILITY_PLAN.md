# 05 — UX, UI, and Accessibility Plan

## Applicability

This feature has **no end-user UI**. The "users" are (a) AI agents reading Markdown, (b) developers reading the canonical home and CI output, and (c) plan-pack authors. There is no browser surface, no React component, no keyboard/focus/screen-reader concern. Per the Multi-Agent Execution Directive §10, a gate may be marked `not applicable` with a reason; accessibility (a11y) for an end user is **not applicable** here.

What *is* applicable is **developer/agent ergonomics**: the canonical home must be readable by both humans and machines, and CI/detector output must be actionable.

## Developer/agent ergonomics requirements (carry into implementation)

- **ERGO-1 (P0):** The canonical home leads with a **Fast Facts** block (≤30 lines) at the top — Worker name, cron list, migration count + latest, binding list, provider-exit status, cost tier — so an agent's minimum restart read is small (mirrors `current-state.md`'s FAST PATH discipline).
- **ERGO-2 (P0):** Every mechanical fact in the home has a trailing `(source: <file>)` marker. Posture facts have `(source: <doc>, status: OPEN/NOT READY)`.
- **ERGO-3 (P1):** The home uses stable section headings so the detector can locate assertions by anchor (e.g. `## Cron triggers`), and so agents can deep-link.
- **ERGO-4 (P0):** Detector output names `file:line`, `expected`, `actual`, and the `regenerate command` — never just "drift detected". CI check-run titles must be greppable.
- **ERGO-5 (P1):** The snapshot JSON is human-skimmable (2-space indent, stable key order) because developers will read it in PR diffs.
- **ERGO-6 (P2):** Reduced-motion / color are n/a; but CI status badges (if added) must not rely on color alone (include text PASS/FAIL).

## State matrix (developer-facing "states")

| State | When | What the developer/agent sees |
|---|---|---|
| Clean | detector exit 0 | CI green; canonical home authoritative |
| Drift detected | detector exit non-zero | CI red; check-run lists file:line + expected/actual + fix command |
| Snapshot stale | committed JSON ≠ fresh generation | detector (DATA-1) reports "regenerate: `bun run ops:truth:snapshot`" |
| Substrate unparseable | malformed wrangler.jsonc | detector fails closed (REL-1) with parse error |
| Provider-exit changed | runbook status flips | posture section flagged for manual update (FR-4 protocol) |

## Localization / copy

- All copy is English (repo default). No localization implications.
- Detector messages are static strings (no user-supplied content rendered), so no injection/XSS surface in the output.

## Responsive / motion

- Not applicable (no rendered UI).

## Design-system reuse

- Not applicable (Markdown only). The canonical home should match the visual conventions of `current-state.md` FAST PATH (heading levels, bullet style) for familiarity, but this is non-binding.

## UX regressions to avoid

- Do **not** make the canonical home so long that agents stop reading it (the exact failure mode of `current-state.md` that motivated its FAST PATH). Keep Fast Facts ≤30 lines; push detail below.
- Do **not** bury the regenerate command — it must appear in the home header and in every detector failure message.
