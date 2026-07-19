# UNIT-008 — XLSX Export Double-Buffer Copy + STORE-Mode Uncompressed ZIP · PERF-EXP-001

**Finding:** PERF-EXP-001 · **Priority:** P2 · **Wave:** 1 phase 1 (W1-8) + Wave 4 phase 2 (W4-7) · **Effort:** S (buffer) / M (compression) · **Risk:** Low (buffer) / Medium (compression)
**Roadmap item:** W1-8 (phase 1) + W4-7 (phase 2) · **Test decision:** `NOT_REQUIRED`
**local_implementation:** `NOT_STARTED` · **external_lifecycle:** `NOT_STARTED`

## Outcome

Phase 1: peak RSS during a max-ceiling (50 tabs / 1,200 nodes / 3,000 rows)
XLSX export drops ~50% by eliminating the defensive `ArrayBuffer` copy. Phase
2 (separate unit of work, Wave 4): XLSX payloads shrink via DEFLATE
compression once a Workers-compatible deflate path is verified.

This is one finding with two independently shippable phases. **Phase 1 is the
load-bearing change.** Phase 2 is gated on Workers DEFLATE validation.

## Affected surface

- `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:128-130` —
  the defensive copy:
  ```ts
  const body = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(body).set(buffer);
  ```
- `src/lib/proposal-export/xlsx-workbook.ts:230,613,662,684,775-778` — STORE-mode
  ZIP flags (no compression)

## Dependencies

- None for phase 1.
- **Phase 2 dependencies:** Workers-compatible DEFLATE validation (per finding
  "Risk: Medium — needs Workers deflate validation"). Phase 2 should not ship
  until that validation is done.
- No AUTH_BOUNDARY items for phase 1. Full peak-RSS verification needs the
  build gate (W0-4 baseline) and a local production build.

## Implementation intent

**Phase 1 (W1-8, do this first):** from PERF-EXP-001 "Recommendation" (1):

- Return the `Uint8Array` directly as the Response body —
  `new Response(buffer, { ... })` accepts a `BufferSource`. Drop the manual
  `ArrayBuffer` allocation and the `Uint8Array(body).set(buffer)` copy at
  `route.ts:128-130`.

**Phase 2 (W4-7, defer):** from PERF-EXP-001 "Recommendation" (2):

- Switch the ZIP to DEFLATE at `xlsx-workbook.ts:230,613,662,684` once a
  Workers-compatible deflate path is verified. Instrument peak RSS during a
  3,000-row export to confirm no regression.

Constraints (from finding): preserve `content-disposition` filename; preserve
`force-dynamic`; preserve all-tabs mode semantics. Do not change the OOXML
writer's content semantics.

## Expected evidence

Verification command from PERF-EXP-001 "Verification":

```
# Local production build + curl the export route with a 3,000-row fixture
# (browser/build gate — BLOCKED); measure process.memoryUsage() peak
ANALYZE=true bun run build
```

Evidence class: `NOT_REQUIRED` for the phase-1 static change (diff showing
`new Response(buffer, { ... })` replacing the manual copy at `:128-130` is the
decisive non-test signal — the `Response` constructor accepting a
`BufferSource` is well-established). The peak-RSS measurement is
build-gated follow-up that confirms the ~50% reduction.

## Completion signal

**Phase 1 (this unit's primary completion):** `route.ts:128-130` no longer
allocates a second `ArrayBuffer` and copies; the `Uint8Array` is returned
directly as the Response body.

**Phase 2 (separate completion, tracked under W4-7):** `xlsx-workbook.ts`
uses DEFLATE flags and a Workers-compatible deflate path is verified.

## Recovery path

**Phase 1:** Not required (Risk: Low). Revert to the defensive copy — behavior
is identical, just 2× peak memory.

**Phase 2:** Required (Risk: Medium). If DEFLATE produces malformed ZIPs in
the Workers runtime, revert to STORE mode. The phase-1 buffer fix stays in
place either way.
