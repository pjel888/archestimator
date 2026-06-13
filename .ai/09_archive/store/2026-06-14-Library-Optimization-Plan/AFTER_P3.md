# AFTER — P3 (security & a11y hardening)

Branch `2026-06-14-Library-Optimization-Plan`.

| Task | Status | Evidence |
|---|---|---|
| T17 — gate mutations on editor role (F19) | ✅ app layer done; RLS = ready migration | `assertCanManageLibrary` added to every mutating component/template action; every template-editor node/row mutation gated at the single `requireWorkspaceTemplate` chokepoint via `is_workspace_editor`. Test: viewer denied (no write, no revalidate) + editor allowed. The RLS write-split + component child-table hardening (the enforcement layer) is authored as a ready, gated migration (T17-RLS spec in `migrations/00_P2_MIGRATIONS_README.md`) per Q4/D8. |
| T18 — `/workshop` security headers (F20) | ✅ done | `next.config.ts` adds X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy same-origin + Report-Only CSP to `/workshop/:path*`. Test: `landing-security-headers` asserts the block (Report-Only, not enforced). The Playwright response-header assertion is the deferred browser confirmation. |
| T19 — creation rate-limit / quota (F24) | ✅ done | `assertWithinLibraryQuota` enforces a generous per-workspace row-count cap on component create, template create, and duplicate (app layer, no migration). Test: creation rejected at quota (no insert, no revalidate). |
| T20 — sanitize action errors (F25) | ✅ done | 63 throws across `actions.ts` + `template-editor-actions.ts` converted from `…: ${error.message}` to `throwActionError(userMsg, cause)` (logs the cause server-side, throws a generic message). Test: helper sanitizes + logs; source invariant asserts no `error.message` interpolation remains. |
| T21 — tab/panel a11y wiring (F27) | ✅ done | TabStrip now receives `idBase=library` (tabs emit role=tab + id + aria-controls); `LibraryTabPanel` (display:contents, layout-transparent) labels the content region as the matching role=tabpanel. Test: `library-tab-a11y` asserts the tab↔panel id relationship. |

**P3 exit gate:** viewer cannot mutate (app-layer test proves it; RLS migration ready); `/workshop` responds with the three hardening headers + Report-Only CSP; no raw DB text in action errors; tabs expose `aria-controls` and the panel is labeled. The RLS write-split apply + the Playwright header assertion are the owner-gated / browser-verified residuals.
