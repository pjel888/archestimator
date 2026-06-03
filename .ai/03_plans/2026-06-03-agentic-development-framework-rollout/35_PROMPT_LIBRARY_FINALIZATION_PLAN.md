# Prompt Library Finalization Plan

## Required future templates
| Template | Target agents | Mode | Validation/stop |
|---|---|---|---|
| Feature plan creation | Claude/Codex | plan-only | plan docs, no code |
| Feature implementation | Codex/Kimi/agy | implementation | TDD/validate/build |
| Bug investigation | DeepSeek/Codex | read-only/debug | reproduce or blocker |
| Bug fix implementation | Codex | implementation | failing test then green |
| Hotfix | Codex lead | implementation | minimal fix, rollback |
| Release candidate | lead/release sentinel | release | proof packet |
| CI failure | debugger/Codex | debug | exact failed check rerun |
| Code review | reviewer/CommandCode | review | findings with severity |
| Security review | security sentinel | review | no secrets/provider proof |
| UI/UX review | Kimi/UX sentinel | review | DESIGN/lint gates |
| Supabase/RLS review | Supabase/db sentinel | review | ArchEstimator project only |
| Notion sync | writer | plan-only/prep | mirror-only |
| `.ai` memory update | writer/Codex | docs-edit | no implementation claims |
| Self-diagnostic | any | recovery | source chain reread |
| Multi-agent orchestration | Hermes/lead | orchestration | disjoint scopes |
| Read-only audit | any reviewer | read-only | no writes |
| Plan refinement | Codex/Claude | docs-edit | plan score/evidence |
| Implementation readiness audit | architect/critic | review | pass/fail |
| Provider proof packet | lead | prep | no provider mutation |
| GitHub ruleset prep | release/sre | prep | no settings mutation |
| Dry-run/eval execution | verifier | review/test | scoring rubric |

Every template must include target agents, mode, required reading, allowed writes, disallowed writes, validation, stop condition, and final report format.
