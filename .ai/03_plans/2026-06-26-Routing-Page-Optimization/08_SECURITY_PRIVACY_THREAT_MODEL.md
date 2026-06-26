# 08 - Security, Privacy, and Threat Model

## Trust Boundaries

| Boundary | Current Control | Requirement |
|---|---|---|
| Anonymous to workshop | `requireCurrentUserContext` and redirects | Preserve fail-closed redirects |
| Authenticated user to workspace | `ensureDefaultWorkspace` and workspace membership logic | Do not assume client-visible project ID is authorized |
| Workspace to project | `getCurrentWorkspaceProject` and downstream project checks | Do not render project-specific data before validation |
| Project to estimate/node | `resolveEstimateTabRouteContext` validates selected node/estimate belongs to project | Preserve validation before sheet content |
| Browser prefetch | Server auth still applies to RSC route data | Ensure prefetch cannot leak unauthorized payloads |
| Perf logs | `PERF_TRACE` labels are sanitized | Keep artifacts free of secrets and row payloads |

## Threat Scenarios

| ID | Threat | Trigger | Control |
|---|---|---|---|
| T-SEC-01 | Project name/client flashes before project access validation | Moving project layout awaits below shell | Use generic shell copy until server validation completes |
| T-SEC-02 | Estimate content appears before node/estimate belongs to project | Moving route-context await into async child incorrectly | Keep `resolveEstimateTabRouteContext` as the gate before real sheet content |
| T-SEC-03 | Prefetch fetches unauthorized route data | Hover/focus prefetch on links visible to stale client state | Server redirects/notFound still enforce auth; add negative E2E |
| T-SEC-04 | Benchmark logs leak secrets | Capturing request headers, Supabase payloads, screenshots, or traces | Capture sanitized timings/selectors only; keep raw visual traces out of committed evidence |
| T-SEC-05 | Overlay `aria-hidden` hides active content for screen readers after route completes | Navigation state race | Preserve hide guards and add stuck-overlay E2E |
| T-SEC-06 | Static or shared cache leaks protected route data across users | Adding `unstable_cache`, module globals, or user-agnostic TanStack cache | Use request-scoped cache only unless a separate scoped cache design is approved |
| T-SEC-07 | Attacker distinguishes existing vs non-existing project/estimate IDs by skeleton render timing | Boundary renders leaf skeleton faster for valid IDs (notFound requires route-context to resolve first), leaking existence via timing side-channel | Add timing-equality test: skeleton render time must be independent of validity path; consider adding notFound() check timing parity |
| T-SEC-08 | Collaborator publishes new estimate snapshot while user mid-transition, snapshot visibility changes unexpectedly | Realtime snapshot publication races with async-child boundary resolution; user may briefly see stale snapshot or version-not-yet-published data | Confirm snapshot version checks remain server-side post-refactor; verify EstimateWorkspaceResolved validates snapshot_version before render |

## Security Requirements

- No client-side authorization shortcut.
- No use of route params as proof of access.
- No project-specific title, breadcrumb, estimate name, or client name before server validation.
- No `ProjectEstimateMetadataPublisher` or `EstimateWorkspaceClient` render before `project` and `estimate` are authorized and non-null.
- No cache persisted beyond valid server request unless tags/revalidation are designed in a separate plan.
- No new public endpoint.
- No new database grant or RLS change.
- No service-role reads for route prefetch.

## Privacy Requirements

- Do not add user emails to benchmark output.
- Do not log estimate line items or cost details.
- Do not include proposal/package data in trace summaries.
- `.ai/05_logs/...` is not ignored by default in this repo, so committed evidence there must be JSON/log summaries with no tokens, cookies, emails, row contents, client/proposal data, or readable protected screenshots.
- If screenshots or browser trace archives are needed, prefer synthetic fixtures. If real protected data is unavoidable, store raw artifacts under ignored `.ai/99_scratch/...` and commit only sanitized summaries under `.ai/05_logs/...`.

## Security Validation

| Validation | Purpose |
|---|---|
| Invalid project route test | Confirms `notFound`/redirect behavior remains fail-closed |
| Invalid estimate/node route test | Confirms no sheet content for wrong estimate |
| Unauthorized storage-state smoke | Confirms prefetch and direct load do not reveal data |
| Unauthorized prefetch attempt | Confirms hover/focus prefetch on inaccessible target does not expose RSC payload or content |
| Unauthenticated direct-load smoke | Confirms missing session redirects/fails closed without sheet content |
| Source-order guard | Confirms `requireCurrentUserContext()` and `notFound()` precede metadata/client rendering |
| Log artifact review | Confirms no secrets or row contents |
| Code review on server boundary | Confirms auth stays server-owned |
