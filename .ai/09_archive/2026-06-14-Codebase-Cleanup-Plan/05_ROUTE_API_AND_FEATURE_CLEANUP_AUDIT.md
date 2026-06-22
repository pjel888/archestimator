# 05 — Route / API and Feature Cleanup Audit

Full route/API inventory in `evidence/route-api-inventory.md`. This doc holds the findings. 73 route-convention files; the vast majority are live and KEEP. Three route/API cleanup items + one MVP-cut shim.

---

### CLEAN-F11 — `/workshop/onboarding` redirect shim (+ loading)

Category: ROUTE_DEBT
Severity: Low
Cleanup confidence: Likely dead (Safe delete after helper fix)
Affected surface: `/workshop/onboarding`, `/workshop/onboarding/loading.tsx`

Current behavior: `page.tsx` is `redirect("/workshop/settings")` (4 lines). The only code that builds the path is the private `onboardingErrorUrl()` in `src/lib/auth/account-actions.ts:332-337`, called at line 46 on profile-setup validation failure. Because the page immediately redirects, the `?error=` query is silently dropped — a latent UX bug masked by the shim.

Why removable: No sidebar link, no `<Link>`, no e2e destination; pure redirect.
Evidence: `rg "workshop/onboarding" src` → 1 hit (`account-actions.ts:337`). Route files confirmed in `evidence/route-files.txt`.
References found: Runtime: 1 (private helper). Test: none. Dynamic: none. DB: none (`onboarding_completed_at` column unaffected).
Suggested cleanup action: Repoint `onboardingErrorUrl()` to `/workshop/settings?error=...`, then delete the `onboarding/` directory.
Files likely removed: `src/app/workshop/onboarding/page.tsx`, `.../loading.tsx`.
Files likely modified: `src/lib/auth/account-actions.ts`.
Database changes: None.
Expected benefit: −1 route, fixes dropped error param.
Risk: Low — behavior identical post-fix.
Validation gate: `bun run build`; manual: submit profile form with a missing field, confirm error surfaces at `/workshop/settings`.
Rollback strategy: `git revert`.
Deletion decision: DELETE_AFTER_LOCAL_PROOF

---

### CLEAN-F14 — `/api/share/[token]/events` has no client caller

Category: API_DEBT
Severity: Medium (security route — verify intent before removing)
Cleanup confidence: Likely dead
Affected surface: `src/app/api/share/[token]/events/route.ts`

Current behavior: Records share-view events (`open`, `password_success/failure`, `download_attempt_blocked`). Every current event write happens **server-side** via Next `after()` hooks in `share/[token]/page.tsx:217-243` calling `recordProjectPublicationEvent()`/`recordProjectPublicationAnalyticsEvent()`.
Why removable: `rg "api/share.*events" src` → 0 client `fetch`; the route is superseded by server-side recording.
References found: Runtime: 0 client callers. Test: 3 (`project-publication-route.test.ts`, `project-publication-security.test.ts`, `share-no-store-invariants.test.ts`). Dynamic: none.
Suggested cleanup action: Confirm no planned client-side event sends (e.g. scroll-depth). If none, remove route + 3 test references; otherwise keep with a tracking comment.
Files likely removed: the route; edits to 3 tests.
Database changes: None (table `project_publication_events`/`shared_link_events` stays — written server-side).
Expected benefit: −1 public route surface (smaller attack surface).
Risk: Medium — it's a public share route; verify intent. Rate-limited + origin-gated today.
Validation gate: `bun run test:dom`; share-page contract; manual share-view event still recorded server-side.
Rollback strategy: `git revert`.
Deletion decision: DELETE_AFTER_LOCAL_PROOF

---

### CLEAN-F10 — Stale `revalidatePath("/workshop/components")`

Category: DEAD_CODE
Severity: Low · Confidence: Safe delete
Affected surface: `src/lib/component-library/actions.ts:164`, `src/lib/ai/package-builder/apply.ts:931`
Current behavior: Both call `revalidatePath("/workshop/components")` beside the correct `revalidatePath("/workshop/library")`. `/workshop/components` is a redirect-only route — no RSC cache to revalidate.
Evidence: route is `redirect("/workshop/library")`; two `revalidatePath` calls confirmed at the lines above.
Suggested action: Remove the two stale calls; keep the `/workshop/library` ones.
Database changes: None. Risk: zero functional. Validation gate: `type-check`+`build`. Decision: DELETE_NOW.

---

### `/workshop/templates` redirect shim — MVP-cut candidate (KEEP_FOR_NOW)

Pure `redirect("/workshop/library/templates")`; no inbound links (only the e2e redirect test). 4 lines, near-zero cost. Risk: external bookmarks/emails could 404. Decision: **KEEP_FOR_NOW**; delete post-launch with the e2e test update.

---

### AI routes — `/api/ai/ask`, `/api/ai/package-builder` (OWNER_GATE — see CLEAN-F25)

Both return 404 unless `ARCHESTIMATOR_AI_ENABLED=true` (default false); UI hidden unless `NEXT_PUBLIC_ASK_FLIP_UI_ENABLED=true`. Comprehensive tests + a live e2e spec. **Not dead** — a deliberate deferral. Keep-deferred vs cut is an owner decision (full treatment in `07` + `11` + CLEAN-F25). Decision: OWNER_GATE.

---

## KEEP despite low traffic (sensitive — do not delete)

`/auth/callback` (auth), all `/invite/[token]/*` (emailed links, `PROJECT_INVITE_ENTRY_ENABLED`), all `/share/[token]/*` except `/events` (emailed share links, password/lockout/decision/comment/activity/session), `/api/webhooks/resend` (Resend callback), `/api/health` (monitoring — no internal caller expected), `/privacy` + `/terms` (legal placeholders), `/beta/access-required` (prevents redirect loop for non-allowlisted), `/workshop/components` shim (still referenced by stale revalidatePath — keep until F10 lands).
