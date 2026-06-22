# Launch-Readiness — Storage Buckets & Upload Lifecycle (Phase-2 Gap Pack)

> Canonical status override: before implementing from this pack, read
> `../03-LAUNCH-GATE-DECISION-REGISTER.md` and `../08-IMPLEMENTATION-HANDOFF.md`.
> Pack-local blocker counts are historical/domain-scoped; the root register is authoritative
> for wider/external beta.

**Status:** audit-only (findings recorded; no code/DB changes made by this pack).
**Created:** 2026-06-19
**Type:** Phase-2 gap pack of the 2026-06-19 Launch-Readiness Audit. The 13-domain
launch-readiness audit's COVERAGE CRITIC found that Supabase Storage **bucket
policy + object lifecycle** was not owned by any of the 13 domains (the API pack
covered upload *request* security only). This pack closes that gap.

## Exact owner job

Decide, before exposing Archestimator to **wider/external** users, whether the
Storage layer is safe and economically bounded:

1. Are private buckets (`project-images`, `component-attachments`) actually
   private, and is the public `component-images` bucket *intentionally* public?
2. Can one workspace read or write another workspace's objects?
3. Is there any per-workspace **quota** / abuse bound on upload growth?
4. When an upload succeeds but the owning row is later deleted/replaced/abandoned,
   is the storage object cleaned up, or does it **leak** (orphan)?
5. Are private images served with appropriate **TTL / scope** (signed-URL or
   equivalent authenticated proxy)?

## Routes / screens in scope

- `POST/DELETE /api/component-library/images` (bucket: `component-images`, public)
- `POST/DELETE /api/component-library/attachments` (bucket: `component-attachments`, private)
- `GET/POST/DELETE /api/projects/images` (bucket: `project-images`, private; GET = authenticated proxy)
- Add Component modal (`AddComponentModal.tsx`) + Project Details / New Project
  modals (`ProjectDetailsModal.tsx`, `NewProjectForm.tsx`) — the upload/replace UX
- Mass-project-delete storage cleanup (`src/lib/mass-deletion/storage-cleanup.ts`)
- `next.config.ts` `images.remotePatterns` (only `…/object/public/component-images/**`)

## Non-goals

- Upload **request** validation (magic-byte sniffing, sharp re-encode, size caps,
  content-length) — owned by `2026-06-01-security-owasp` (F-UPLOAD-01..04) and the
  API pack (API-04). Not re-audited here except where it bears on bucket/lifecycle.
- AV / malware scanning of attachments (F-UPLOAD-07) — pre-existing, referenced.
- XLSX export injection (F-UPLOAD-08) — owned by spreadsheet-export plan.
- PITR / backup posture — owner-accepted-off (known-decided).

## Files expected to change (if remediations are accepted — NOT changed by this pack)

- New migration: a scheduled / RPC-driven orphan reconciliation (component-images,
  project-images) OR a "delete object when its owning row's path column changes /
  row is deleted" trigger path.
- New migration / config: per-workspace aggregate storage quota check (object count
  + bytes) enforced before `upload`, mirroring the durable
  `security_rate_limit_events` quota pattern already used by AI Ask.
- `src/app/api/component-library/images/route.ts`, `.../attachments/route.ts`,
  `src/app/api/projects/images/route.ts` — quota pre-check + best-effort
  orphan-on-replace hardening (server-side, not only client-side fire-and-forget).
- Optionally `ProjectDetailsModal.tsx` / `AddComponentModal.tsx` — make
  abandon-without-save trigger cleanup (or move cleanup server-side).

## Validation gate

`bun run validate` is known-red on `main` (gate on `bun run build` or targeted
tests instead). For any remediation: `bun run build`, the focused upload-route
Vitest suite, plus a PG-level prove of any new quota/GC RPC, and
`get_advisors(security)` = 0 new findings after any storage DDL.

## Deletion criteria (when this pack can be deleted)

- STORAGE-01 (orphan GC) and STORAGE-02 (quota) each either fixed-and-verified or
  explicitly owner-accepted-deferred with a recorded rationale in
  `.ai/10_state/decisions.md`.
- STORAGE-03..NN triaged (fixed / accepted / folded into another pack).
- Findings reconciled into `.ai/10_state/current-state.md`.

## Loop surface

Lightweight in-session loop (audit-only; no dated LOOP_LEDGER required for a
read-only review). If any remediation touches storage DDL/RLS it becomes
HIGH-BLAST-RADIUS and must run the full plan-pack + Codex review gate.

## Durable-state path

`.ai/10_state/current-state.md` (add a Storage Buckets & Upload Lifecycle entry once
triaged) and `.ai/10_state/decisions.md` (record quota + orphan-GC decisions).
