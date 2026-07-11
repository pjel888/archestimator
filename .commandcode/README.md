# CommandCode Adapter

`.commandcode/` contains sentinel and taste surfaces. They are useful review
adapters, not a separate project brain.

Canonical rules live in:

1. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
2. `.ai/12_agents/payloads/commandcode.md`
3. `DESIGN.md` for UI taste boundaries

<!-- supermemory-bootstrap: required -->
CommandCode inherits the shared Supermemory workflow from the framework
protocol and payload: run `bun run supermemory:ensure` before meaningful work,
search relevant memory before broad/non-trivial work, and add a sanitized
durable update at closeout when project truth changes. Supermemory is advisory;
`.ai` and current source remain authoritative.

CommandCode agents default to review/sentinel lanes unless implementation is
explicitly assigned with a disjoint write scope. Branch or worktree isolation
requires an explicit lead decision.

Operating boundaries (these bind every sentinel and taste file here):

- Sentinels are READ-ONLY review by default. A `tools: "*"` grant in an agent file
  is a capability ceiling, not a license to mutate source, run migrations, or call
  provider APIs. Mutation requires an explicit implementation assignment from the
  lead orchestrator with a disjoint write scope.
- Taste files under `taste/` are ADVISORY ONLY and subordinate to `.ai`, source,
  tests, and provider evidence. Where a taste rule conflicts with `.ai/00_system` or
  `.ai/10_state/decisions.md`, `.ai` wins.
- The active provider boundary is the Cloudflare Workers/OpenNext stack bound in
  `wrangler.jsonc`: D1, R2, Durable Objects, Queues/Cron, Email, and Images with
  Better Auth. Historical Supabase resources are read-only archaeology. No
  sentinel is the final gatekeeper for merge or release; the lead orchestrator
  owns integration, validation, and the final claim.
- Verification is always required, but tests default to `NOT_REQUIRED`. Tests run
  only for explicit testing/QA work or an MVP mission-critical risk that cheaper
  evidence cannot prove. Broad suites, builds, and browser proof require an
  explicit request or an integrated critical claim; ordinary edits use the
  cheapest decisive non-test evidence.
