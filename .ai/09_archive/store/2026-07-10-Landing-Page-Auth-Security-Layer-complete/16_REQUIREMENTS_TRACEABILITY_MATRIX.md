# 16 — Requirements Traceability Matrix

| Req ID | Source | User outcome | Phase | Task IDs | Code areas | Acceptance criteria | Test coverage | Rollout check | Status |
|---|---|---|---|---|---|---|---|---|---|
| SEC-1 (P0) | F-1 audit | Magic-link tokens hashed at rest | 1 | 1.1–1.5 | `better-auth-cloudflare.ts` | AC-1.1–1.4 | unit + hosted readback | hosted proof | Pending |
| SEC-2 (P0) | Owner brief | No protected surface w/o session | 5 | 5.1 | all actions/handlers, middleware | AC-2.1–2.2 | denial tests | denial harness green | Pending |
| SEC-3 (P1) | F-2 audit | Repos fail-closed | 2 | 2.2–2.9 | `repositories/*` | AC-3.1–3.2 | repo unit tests | grep audit | Pending |
| SEC-4 (P2) | F-3 audit | Action-layer auth parity | 2 | 2.1 | `recipient-proposals/actions.ts` | AC-4.1 | unit test | grep audit | Pending |
| SEC-5 (P1) | F-4 audit | Explicit rate limits | 3 | 3.1–3.2 | `better-auth-cloudflare.ts` | AC-5.1–5.2 | rate-limit test | rate-limit proof | Pending |
| SEC-6 (P2) | F-5 audit | Enforced CSP | 4 | 4.1–4.3 | `next.config.ts`, middleware | AC-6.1–6.3 | browser proof | canary verified | Pending |
| SEC-7 (P2) | F-6 audit | BA schema contract | 3 | 3.3 | `migrations/` or docs | AC-7.1 | readiness gate | gate pass | Pending |
| SEC-8 (P3) | ASVS V3.3.2 (`derived`) | Revoke-all-sessions | defer | — | `session` table / action | AC-8.1–8.2 | multi-device test | — | Deferred |
| SEC-9 (P3) | ASVS V2.6 (`derived`) | Email homoglyph validation | defer | — | auth boundary | AC-9.1 | homoglyph test | — | Deferred |
| SEC-10 (P2) | ASVS V3.3.1 (`derived`+`repo`) | Sign-out deletes D1 row | 5 (verify) | 5.x | `session` table | AC-10.1–10.2 | readback + replay test | readback | Pending |
| **SEC-11 (P1)** | **F-7 audit + NIST §5.2.2 (`repo`+`derived`)** | **Session token hashed at rest** | **1.5** | **0.5.1, 1.5.1, 1.5.2** | `better-auth-cloudflare.ts` (or ops controls) | AC-11.1 | readback OR accepted-risk | readback/owner sign-off | **Pending** |
| SEC-12 (P2) | CWE-532 (`derived`+`assumption`) | Token not in logs | 3 | 3.4 (RFU-4) | logging / verify route | AC-12.1 | Workers Logs query | query | Pending |
| SEC-13 (P2) | F-8 audit (`repo`) | Secret separation | 3 | 3.5 | `terms-gate-cookie.ts`, `.env.example` | AC-13.1 | env audit | env check | Pending |
| SEC-14 (P2) | F-9 audit (`assumption`) | accountLinking policy | 0.5+3 | 0.5.2, 3.6 | `better-auth-cloudflare.ts` | AC-14.1–14.2 | ATO test (Chain 5) | test green | Pending |
| ARCH-1 (P0) | Owner brief | Auth-method exclusivity pinned | 5 | 5.3 | `better-auth-cloudflare.ts` | AC-A1.1 | exclusivity test | test green | Pending |
| FR-1 | SEC-1 deploy | In-flight token tolerance | 1 | 1.4 | deploy docs | AC-F1.1 | n/a (doc) | release notes | Pending |

No requirement is untraced. Every task maps to ≥1 requirement.

## Notes

- SEC-2 and ARCH-1 are "verify-and-pin" requirements — the audit already
  confirms the code is compliant; the requirement is to **pin** it with a
  regression test so a future change can't silently break it.
- Phase 4 (SEC-6) may be deferred past closed-beta launch if nonce work is
  substantial; this is an owner decision, recorded as residual risk, not a blocker.
