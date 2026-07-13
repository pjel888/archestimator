# 19 — Research, Review, and QA Evidence

## Research questions and sources

| Question | Primary source | Date visible | Finding | Plan decision it shaped |
|---|---|---|---|---|
| Workers request body size (Free)? | developers.cloudflare.com/workers/platform/limits | publishedTime 2026-07-05 (fetched 2026-07-08) | 100 MB Free (account-plan limit) | Confirms 4 MiB self-cap is ~25× tighter; not the binding constraint |
| Workers memory limit? | same | same | 128 MB per-isolate, shared; "Memory limit would be exceeded before EOF" | DEC-01 streaming is mandatory |
| R2 multipart from Worker? | developers.cloudflare.com/r2/api/workers/workers-multipart-usage + /r2/platform/limits | R2 limits publishedTime 2026-06-08 | `createMultipartUpload`/`uploadPart`/`complete`/`abort`/`resume`; part 5 MiB–5 GiB; ≤10,000 parts; obj 5 TiB; free-tier-supported | DEC-03 enable (owner-gated) |
| Stream request.body to R2 put? | developers.cloudflare.com/r2/api/workers/workers-api-reference | fetched 2026-07-08 | `put(key, ReadableStream)` supported; backpressure native; disturbed-stream pitfall | DEC-01 + RISK-11 guidance |
| Images binding input cap/formats? | developers.cloudflare.com/images/optimization/binding | publishedTime 2026-06-16 | `.input()` ≤ 20 MB; output AVIF/WebP/JPEG (required, no default); works with R2 bytes | DEC-07 + AC-FR-08b |
| Images free tier? | developers.cloudflare.com/images/pricing | fetched 2026-07-08 | Free plan includes transforms; 5,000 unique/month (community-corroborated) | DEC-07 quota monitor |
| OpenNext body/stream constraints? | opennext.js.org/cloudflare + troubleshooting | fetched 2026-07-08 | Workers limits apply; `formData()` consumes body (community cloudflare.com/t/15349); 3 MiB bundle Free | RISK-11; bundle budget |
| Free vs paid add-ons? | workers/pricing, r2/pricing, d1/pricing, images/pricing, analytics-engine/pricing, smart_placement docs | various 2026 | All in-scope bindings free-tier-compatible; Smart Placement free on all plans (resolves conflicting search snippets) | Cost posture confirmed |

**Official vs community:** all load-bearing limits (body, memory, R2 multipart, Images cap, free
tiers) are from **official current Cloudflare docs** with URLs + visible dates. Community sources
are tagged and used only for corroboration (`formData()` consumes body; 5,000 transforms/month;
R2-to-R2 piping bug).

**Searched but not found authoritatively:**
1. Exact accepted *input* formats for Images binding `.input()` (page says "image bytes" only) —
   safe assumption: common web formats.
2. Whether Next.js `request.formData()` streams or buffers in Workers runtime under OpenNext —
   treated as buffering for safety (RISK-11).
3. Cloudflare CDR pricing/Worker integration specifics — recorded as future paid option, not
   researched deeply (out of free-tier scope).

**Validation rubric used:** research is "sufficient" when each load-bearing limit has an official
current source with URL + date, and community claims are corroborated or flagged. Met.

## Skills and workflows used / unavailable

| Skill/workflow | Used? | Why / substitute |
|---|---|---|
| `archestimator-plan-pack` | yes | decided exhaustive pack |
| `Explore` subagent (upload/R2/Images) | yes (native) | exact path/symbol map |
| `Explore` subagent (DB/tests) | yes (native) | schema/test/proof map |
| `general-purpose` subagent (CF limits research) | yes (native, web) | official-doc limits |
| `ultragoal`/`ultrawork`/`autopilot`/`ultraqa` native goal tools | unavailable (no native goal tool this session) | emulated as separated passes; `verification_mode: emulated` |
| `gitnexus` impact MCP | not used | read-only `Explore` + `rg` sufficient for this planning scope; graph mandate is subordinate for narrow local edits |
| `playwright`/browser proof | not used (planning-only) | browser proof is post-impl, per proportional verification |

No capability was fabricated. Unavailable native verification is honestly labeled `emulated`.

## Specialist workstream outputs

- **Product/scope** (`02`): outcome, in/out scope, assumptions validated.
- **Architecture** (`06`): current/target state, port widening, control flows, alternatives.
- **Data/DB/API** (`07`): schema (no core migration; conditional 0041), access-path matrix,
  contracts, shadow paths (`04`).
- **Security/privacy** (`08`): threat model, credential taxonomy, scanner posture.
- **Performance/reliability** (`09`): budgets, evaluator, failure modes, observability.
- **Blast radius** (`10`): direct/transitive, compatibility, dependencies.
- **Implementation** (`11`): 8 phases, durable-goal contracts, 23 tasks.
- **Test/QA** (`12`): execution matrix + adversarial matrix.
- **Rollout/ops** (`13`): gates, rollback per phase, runbook.
- **Risk/decisions** (`14`/`15`): 15 risks, 7 decisions + 4 open.

## Critique-and-revision cycles

This is an `exhaustive` package → directive requires ≥2 complete critique-and-revision cycles
after the initial draft.

- **Cycle 1 (initial draft → self-critique):** drafted `00`–`19`; self-critique found (a) missing
  credential-material taxonomy (added to `04`), (b) missing shadow-path matrix (added to `04`),
  (c) missing performance-evaluator contract (added to `09`), (d) `formData()`-consumes-body pitfall
  not addressed (added RISK-11 + implementation guidance), (e) 3rd-cron `undefined` storage gap
  under-specified (expanded FR-06 + T-13). Revised.
- **Cycle 2 (post-revision → adversarial):** emulated adversarial pass hunted gaps per the §16
  checklist. Found (f) image-cap 12→4 MiB behavior change not owner-acknowledged (added OPEN-01),
  (g) multipart op-count vs free quota not budgeted (added `20` cost model requirement + DEC-03
  gate), (h) ClamAV egress reachability unconfirmed (added OPEN-02), (i) Images quota not monitored
  (added AC-FR-08c), (j) hosted memory-pressure proof gap not honest (added RISK-14 + T-21). Revised.
- **Cycle 3 (targeted, P0/P1 only):** confirmed no remaining P0; all P1 either resolved-by-plan or
  owner-isolated with options+recommendation+unblock. No further cycle would resolve owner gates or
  hosted-proof gaps from a planning-only position. **Stop at cap** with residual findings recorded.

Two full cycles + one targeted cycle completed (exceeds the exhaustive minimum). Residual findings
are genuinely external (owner decisions, hosted proof).

## UltraQA-style adversarial scenario matrix

See `12` AQ-01..AQ-15. Covers: anonymous/cross-workspace auth denial, oversize, type spoof,
path traversal, concurrency/OOM, EICAR, session hijack, client abort, duplicate finalize, clamd down,
R2 mid-stream fail, D1/R2 drift, Images >20 MiB, Images quota. All "planned" (post-impl) or
"existing" green.

## Performance evaluator contract

See `09`: baseline (up to 64 MiB buffered), target (≤ env cap), harness (vitest deny-buffer +
hosted body-probe), fixtures (1/4/8 MiB), regression threshold (any whole-body arrayBuffer in stream
path), evidence (vitest output + proof JSON). Hosted memory-pressure (N concurrent) is a documented
post-impl gap (RISK-14).

## Independent final verifier evidence

`verification_mode: emulated`. The verifier pass (this section + `17`) was a separated pass by the
same agent because no native independent verifier was available. It actively searched the §16
checklist and recorded P0/P1/P2 findings above. The emulated cap (≤97 overall; CONDITIONALLY READY
for high-blast-radius) is applied honestly in `17`.

## Explicit validation gaps

1. Hosted memory-pressure (eviction) proof — post-impl (RISK-14).
2. Workers CPU/ms per upload — Workers Observability post-deploy.
3. R2 latency P95 — hosted perf post-deploy.
4. Multipart hosted proof — post DEC-03.
5. Images hosted end-to-end parity — post DEC-07.
6. ClamAV egress reachability — owner confirmation (OPEN-02).
7. Native independent verifier — not available this session (emulated cap applied).

None of these is producible in a planning-only pass; all are recorded with the exact command/owner
action needed.
