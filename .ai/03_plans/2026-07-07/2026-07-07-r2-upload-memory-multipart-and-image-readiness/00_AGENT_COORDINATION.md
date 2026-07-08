# 00 — Agent Coordination

Plan folder: `.ai/03_plans/2026-07-07-r2-upload-memory-multipart-and-image-readiness/`
Date (Asia/Manila): 2026-07-07
Plan profile: `exhaustive` (R2 + Cloudflare bindings + Images + security/data integrity surfaces)
Status: `CONDITIONALLY READY` — see `17_FINAL_READINESS_REVIEW.md` for the readiness cap and verification mode.

## Master goal

Create a production-grade, codebase-specific **planning package** that gives a future
implementation AI a clear, safe path for:

1. **Upload memory safety** — eliminate whole-body buffering (`Buffer.from(await file.arrayBuffer())`,
   `new Uint8Array(await request.arrayBuffer())`) on every inbound upload route so first-user
   files cannot OOM the 128 MB Worker isolate.
2. **Multipart / large-file strategy** — decide and document whether/how to enable real R2
   multipart (`createMultipartUpload`/`uploadPart`/`complete`) vs the current strategy-only stub
   that 501s, within Cloudflare free-tier limits.
3. **R2 object lifecycle** — close the gaps in object key/metadata, listing, retention, deletion,
   and orphan cleanup so first-user files have a coherent, auditable lifecycle.
4. **Scanner integration** — make the malware/content-scan posture explicit (policy scanner default
   vs ClamAV vs Cloudflare-CDR) and consistent with the scan-gating already on the component-attachment
   surface.
5. **Cloudflare Images readiness** — decide whether/how to switch the `IMAGES` binding from
   proof-only to the production image-processing path, replacing `sharp`/`sharp-cloudflare-stub.ts`.

This is **planning only**. No application code, tests, migrations, package manifests, provider
state, or runtime data is modified. The package must be codebase-specific, evidence-based, and
land within Cloudflare free-tier/bundled limits without new paid dependencies.

### Non-goals

- Implementing any upload, R2, scanner, or Images change (that is the next suite stage).
- Re-architecting the storage-provider abstraction beyond what memory safety / multipart / Images
  readiness requires.
- Touching the Supabase/Vercel/Resend legacy surfaces (historical only).
- Enabling any paid Cloudflare add-on (D1 paid, R2 paid, Workers Paid, Images paid, Smart Placement
  paid) without explicit owner approval.
- Storing raw uploaded content, secrets, or PII inside this plan pack.

### Implementation-readiness criteria

- Every requirement has a stable ID, objective acceptance criteria, a validation method, and a
  traced implementation task (see `04` and `16`).
- Every memory-safety/multipart/Images decision is either resolved with rationale + rejected
  alternatives, or isolated as a named `DISCOVERY-REQUIRED` / `BLOCKED-EXTERNAL` task with options,
  a recommendation, and an unblock action.
- All file paths and symbols are exact repo-relative references, not approximate.
- Database/provider change blueprints are complete for any migration/R2/object-policy work (see `07`).
- No internal blocker remains; only owner-delegated decisions and hosted proof gaps remain, and
  they are explicitly isolated.

### Validation criteria

- `git diff --check` clean after every planning-file write.
- All writes confined to this plan folder; no application/test/migration/package/provider changes.
- Cross-document consistency: status, paths, symbols, requirement IDs, and task IDs match across
  `00`–`21` and `README.md`.

### Final planning deliverables

`00_AGENT_COORDINATION.md` … `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md`, plus
`20_COST_MODEL_AND_PRICING_INPUTS.md`, `21_PROVIDER_PARITY_MATRIX.md`, and `README.md`.

## Skills and repository instructions used

| Skill / instruction | Why relevant | Used how |
|---|---|---|
| `archestimator-plan-pack` | Binds generic planning to the repo's `.ai/03_plans/<date>-<slug>/` + `LOOP_LEDGER.md` contract and the plan-pack-vs-in-session decision | Decided `exhaustive` plan pack because R2/bindings/Images/security/data integrity is high-blast-radius |
| `AGENTS.md` (Cloudflare-resource mandate, cost posture, shared-worktree, verification policy) | Authorizes D1/R2/DO/Queue/Email work inside bound resources; forbids paid add-ons; forbids auto-branching | Constrains every recommendation to bound `wrangler.jsonc` resources + free tier |
| `AGENT_OPERATING_PROTOCOL.md` (loop activation, validation matrix, Karpathy guardrails) | Sets the proportional loop + verification bar | Drove read-only discovery, exact-path discipline, and proportionate verification |
| `Multi-Agent-Execution-Directive.md` + `Creating-Plan-Prompt.md` | Authoritative planning-suite contract (workstreams, readiness labels, completion gates) | Drove the 00–19/20–21 document set, shadow-path matrices, readiness scoring |
| `cloudflare` / `workers-best-practices` / `wrangler` skills (referenced, not loaded) | Cloudflare Workers/R2/Images limits and free-tier posture | Validated via external research agent + official docs (see `19`) |

No native multi-agent goal tool was available in this session; specialist lanes were run as
read-only `Explore`/`general-purpose` subagents plus a same-agent adversarial/verification pass.
See `19` for verification-mode labeling.

## Orchestration lanes (emulated + delegated)

| Agent / lane | Role | Native? | Owned scope | Status |
|---|---|---|---|---|
| Lead coordinator (this agent) | Scope, discovery, synthesis, integration, adversarial review, final claim | same-agent | Whole pack | DONE |
| Upload-routes/R2/Images explorer | Map every upload route, provider, scanner, image, queue surface with exact paths/symbols | native `Explore` subagent | §1–§8 of source audit | DONE |
| DB/migrations/tests explorer | Map upload D1 schema, repositories, authz, tests, proof scripts, cleanup/retention | native `Explore` subagent | DB + tests + proof scripts | DONE |
| Cloudflare limits researcher | Authoritative Workers/R2/Images/OpenNext free-tier limits + streaming/multipart patterns | native `general-purpose` subagent (web research) | `19` research evidence | DONE |
| Adversarial reviewer | Hunt gaps, contradictions, vague tasks, untraced requirements | emulated (same-agent pass) | Cross-document + readiness | DONE |
| Final verifier | Requirement-by-requirement completion audit | emulated (same-agent pass) | `17` | DONE |

## Coordination ledger

| Lane | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Upload routes explorer | Map upload subsystem | All upload routes + `src/lib/uploads/` | `file:line` map in `03` | None | 5 file-upload routes all buffer full body; multipart stubbed; Images binding unused at runtime | None | DONE |
| DB/tests explorer | Map upload D1 + tests + proof | `migrations/`, repositories, `tests/`, `scripts/` | `file:line` map in `03`,`07`,`12` | None | `upload_sessions`/`upload_assets`/`upload_events` schema; ~55 upload tests; 4 proof scripts; 3rd cron missing R2 cleanup | None | DONE |
| CF limits researcher | Authoritative 2026 limits | Workers/R2/Images/OpenNext limits | `19` citations + URLs | None | 128 MB isolate is the binding memory constraint; R2 multipart free-tier-supported; Images binding 20 MB input cap; 100 MB request body | None | DONE |
| Adversarial reviewer | Find gaps | Cross-doc | `17` findings | Lead synthesis | See `17` P0/P1/P2 list | None material | DONE |
| Final verifier | Completion audit | All requirements | `17` verdict | All lanes | CONDITIONALLY READY (emulated cap) | None | DONE |

## File/module ownership

All writes are confined to this plan folder. No application/test/migration/package/provider file is
owned or modified. The future implementation lanes will lease file ownership per `11_IMPLEMENTATION_PLAN.md`.

## Concurrent-repository safety applied

- `git status` checked at start (clean `main`).
- Every planning-file write targets only `.ai/03_plans/2026-07-07-r2-upload-memory-multipart-and-image-readiness/`.
- No branch, worktree, commit, push, stage, or Git state change performed.
- Read-only subagents inspected overlapping sources without editing.
