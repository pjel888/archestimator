# 05 — UX, UI, and Accessibility Plan

> **Applicability note.** This is a *proof-closure* pack. It changes no UI. The
> only user-facing surface it touches is the **operator-facing closure runbook**
> (this collection of documents). The dynamic-adversarial-QA requirement of the
> suite directive is therefore *not applicable to the planning task itself*
> (docs-only), while the future implementation still requires the adversarial
> matrix in `12_TEST_AND_VALIDATION_STRATEGY.md` for the artifacts' content
> validation.

## Operator journey (the only "user" of this pack)

1. **Read** the README → understands status is `CONDITIONALLY READY` and why.
2. **Phase 0** → applies the dir-override + invocation conventions; re-runs the
   bundle gate to confirm 3/8 baseline.
3. **Phase 1** → re-confirms deployment/operations/runtime; reads the bundle
   output; resolves the H3 filename clarity.
4. **Phase 2** → for each of the 5 live/hosted gates: gathers the prerequisite
   (secret/service/operator observation), runs the producer, inspects the
   artifact's `failedChecks`, iterates until `passed=true`.
5. **Phase 3** → runs the bundle gate; integrates with `cf:release-gates`;
   requests owner sign-off.

## Information hierarchy (this pack)

- README is the entrypoint and states status + stop condition up top.
- `04` is the requirements source of truth (stable IDs).
- `11` is the execution entrypoint (phase-ordered, exact commands).
- `16` is the audit surface (req → command → evidence).
- `17` is the verdict.

## States the operator must be able to distinguish

| State | How shown | Where |
|---|---|---|
| Gate passes on real hosted/live evidence | `proofBoundary` = hosted/live value, `passed=true` | artifact + bundle output |
| Gate passes only via filename fallback (H3) | bundle output names the artifact file; doc flags drift | `03`, `11` Phase 1 |
| Gate is fail-closed/skipped (expected, awaiting evidence) | `skipped=true`, `proofBoundary="...-skipped"` | artifact |
| Gate is failed (evidence collected but wrong) | `passed=false`, non-empty `failedChecks`, non-skipped boundary | artifact |
| Sanitizer rejected the observation input | `pathSafe=false` / `secretRedacted=false` | artifact + producer stdout |

## Accessibility of the runbook documents

- Markdown, semantic headings, tables with header rows, no color-only cues
  (status uses words: "passed"/"skipped"/"failed").
- No images, no motion — readable in a terminal or plain-text renderer.
- Commands in fenced code blocks with the full env prefix on each line so they
  are copy-pasteable and screen-reader-friendly.

## Non-applicability

- No component states, no keyboard/focus, no responsive layout, no reduced-motion
  behavior — none of these are changed by this pack. The dashboard UI
  (`src/app/workshop/settings/upload-operations/page.tsx`) is *observed* by the
  operator in Phase 2 but is not modified.
- No localization implications (English-only operator runbook).
- No UX regression risk (no UI change).
