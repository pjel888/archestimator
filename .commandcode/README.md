# CommandCode Adapter

`.commandcode/` contains sentinel and taste surfaces. They are useful review
adapters, not a separate project brain.

Canonical rules live in:

1. `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
2. `.ai/12_agents/payloads/commandcode.md`
3. `DESIGN.md` for UI taste boundaries

All CommandCode sentinels and taste surfaces inherit the Lean Engineering Ethos:
bounded evidence-supported blast radius, smallest coherent change, minimal
tokens/context/tool calls, and no automatic test/build/browser/reviewer chain.
Advisory availability is not a mandate to invoke it.

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
- Verification is always required, but **tests are user-gated, not automatic.**
  The **User Test Authorization Gate** is the supreme rule: do not create,
  expand, repair, or run any automated test, test suite, build-as-test-gate,
  browser automation, or broad validation gate unless Philip has explicitly
  requested testing for the current task. Critical risk, high blast radius, a
  user-visible change, a nearby test, or a sentinel's own judgment never
  authorizes running tests — when they seem warranted, record a `TEST_PROPOSAL`
  (named risk + exact command) and wait. `TEST_TASK` is the only execution
  trigger and requires an explicit user request. `TARGETED`/`BROADER` authorize
  proposing, not running. Ordinary edits use the cheapest decisive non-test
  evidence.
