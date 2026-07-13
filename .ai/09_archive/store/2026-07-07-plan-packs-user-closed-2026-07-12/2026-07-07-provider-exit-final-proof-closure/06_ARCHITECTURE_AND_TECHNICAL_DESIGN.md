# 06 — Architecture and Technical Design

## 6.1 Current-state architecture (provider posture)

```mermaid
flowchart LR
  subgraph Active[Active runtime — Cloudflare-native]
    Worker[Worker archestimator-proof]
    D1[(D1 ARCH_DB)]
    R2[(R2 ARCH_UPLOADS_R2)]
    DO[(DO COLLAB_ROOMS)]
    Q[Queue UPLOAD_JOBS_QUEUE]
    Mail[Email EMAIL]
    Img[Images IMAGES]
    Auth[Better Auth → D1]
  end
  subgraph Legacy[Legacy — historical evidence only]
    Sup[Supabase ebxxqidacheyapmmzavr]
    Ver[Vercel]
    Res[Resend]
  end
  Worker --> D1
  Worker --> R2
  Worker --> DO
  Worker --> Q
  Worker --> Mail
  Worker --> Img
  Auth --> D1
  Legacy -.read-only archaeology.-> PackGen[provider-exit pack generator]
  PackGen -->|reads| Worker
```

The active runtime has **zero edges** to Supabase/Vercel/Resend. The legacy
providers exist only as historical evidence consumed (read-only) by the
provider-exit pack generator and the operator record.

## 6.2 Target-state architecture

No architecture change. The target is a *state change in the operator record
and the generated pack*, not a code or topology change:

- Operator record: 4 `missing` sections → `recorded` or `accepted-deferral`.
- Generated pack: `providerExitReady` → `true`.
- Legacy providers: posture clarified per owner decision (rollback-window /
  read-only-retention / accepted-loss), but **not mutated** by this plan.

## 6.3 Component boundaries

| Boundary | Owner | Change? |
|---|---|---|
| `scripts/generate-cloudflare-provider-exit-pack.ts` | generator | none (documented, not modified) |
| Operator record JSON | operator (single shared mutable) | filled at execution time, not by this plan |
| 5 upstream JSON artifacts | their generator scripts | none (regenerated only if stale) |
| `current-state.md` | doc owner | none by this plan (separate future task) |

## 6.4 Data flow (closure procedure)

```mermaid
sequenceDiagram
  participant O as Operator
  participant OR as Operator record JSON
  participant GEN as cf:provider-exit-pack
  participant CF as Cloudflare (read-only)
  participant SUP as Supabase/Resend/Vercel
  O->>OR: 1. Decide export posture (OPEN-PE-01)
  O->>CF: 2. Run smoke commands (read-only)
  O->>OR: 3. Record smoke (OPEN-PE-02)
  O->>OR: 4. Record/defer persona (OPEN-PE-03)
  O->>OR: 5. Record/defer mailbox (OPEN-PE-04)
  O->>GEN: 6. bun run cf:provider-exit-pack
  GEN->>CF: reads source + 5 artifacts
  GEN->>OR: reads 6 sections
  GEN-->>O: providerExitReady=true (or OPEN list)
  Note over SUP: Supabase/Resend/Vercel NEVER mutated by this procedure
```

## 6.5 Architectural decisions

- **No new abstraction**: the generator + operator record already implement the
  gate model. This plan documents and operationalizes them; it does not add
  layers.
- **Single source of truth**: the operator record is the only mutable closure
  artifact. The generated pack is derived (reproducible). The 5 upstream
  artifacts are inputs.
- **No hybrid recommendation**: Cloudflare is the sole active runtime. Legacy
  providers are rollback/export surfaces only, posture-dependent.

## 6.6 Coupling / dependency direction

- Generator depends on (read-only): repo source, 5 JSON artifacts, operator
  record. Nothing depends on the generator's output except human/agent review.
- This plan depends on (read-only): `wrangler.jsonc`, `package.json`,
  `cloudflare-env.d.ts`, the generator, the last pack run, `current-state.md`
  FAST PATH, `supabase/README.md`.
- Nothing in `src/` depends on legacy providers (proven by `rg`).

## 6.7 Failure boundaries

| Failure | Effect on closure | Mitigation |
|---|---|---|
| Operator record malformed | generator parse error | `cf:provider-exit-operator-template` regenerates starter |
| Upstream artifact stale/missing | gate 1-6 may flip | re-run the artifact's generator script (`cf:release-gates` etc.) |
| Cloudflare route probe fails (smoke) | `cloudflareSmokePassed=false` | diagnose via `cf:check-readiness`; do not claim closure |
| Owner defers persona/mailbox | gates 11/12 → `accepted-deferral` | permitted; recorded with rationale; pack stays honest |
| Two agents edit operator record | JSON conflict | LOOP_LEDGER file-ownership lease; first-writer-wins |
