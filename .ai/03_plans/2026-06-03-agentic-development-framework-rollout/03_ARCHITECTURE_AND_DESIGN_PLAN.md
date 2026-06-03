# Architecture and Design Plan

## Proposed approach
Build an enforceable-but-lean agent framework in layers:

1. **Canonical policy layer:** `.ai/00_system` owns shared rules: source-of-truth, safety, validation, self-diagnostic, run-log, agent compliance, and provider-claim proof.
2. **Role contract layer:** `.ai/12_agents/README.md` owns roster and routing; `payloads/*.md` are thin operational payloads.
3. **Prompt/template layer:** `.ai/08_prompts` owns reusable copy-paste prompts for plan, read-only audit, implementation, review, hotfix, release, provider proof, GitHub setup, and dry-runs.
4. **Skill/playbook layer:** `.ai/11_skills` owns reusable procedures for run logs, dry-run evals, self-diagnostic, bug creation, and release proof.
5. **Harness adapter layer:** `AGENTS.md`, `.agents/README.md`, `CLAUDE.md`, `GEMINI.md`, `.claude`, `.codex`, `.cursor`, `.commandcode`, `.github` stay thin adapters to `.ai`.
6. **Adoption/enforcement layer:** dry-runs first, then PR templates/CI checks, then GitHub rulesets/protections only after approval.

## Why this fits ArchEstimator
- Solo-founder startup needs fast reversible work, not enterprise theater.
- The app is pre-launch/closed-beta NO-GO, so preventing AI/provider hallucination and unsafe merges matters more than heavy compliance machinery.
- Existing `.ai` structure already supports canonical truth; the missing part is enforceable payload/harness control.

## Files likely to change in future implementation
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/AGENT_SELF_DIAGNOSTIC_PROTOCOL.md`
- `.ai/00_system/VALIDATION_MATRIX.md`
- `.ai/00_system/DOCS_SOURCE_OF_TRUTH.md`
- `.ai/12_agents/README.md`
- `.ai/12_agents/payloads/_template.md`
- `.ai/12_agents/payloads/{codex,claude,opencode,commandcode,kimi,antigravity,deepseek,hermes,cursor,gemini,ollama}.md`
- `.ai/08_prompts/templates/*`
- `.ai/11_skills/*`
- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agents/README.md`, optional `.github` templates/checks in later phases.

## Interfaces/contracts affected
- Agent preflight receipt contract.
- Payload schema contract.
- Run-log/evidence schema.
- Multi-agent handoff format.
- Final report format.
- GitHub/CI advisory-to-enforced gates.

## Compatibility and anti-overengineering
- No permanent `dev` branch by default.
- No new provider integrations.
- No heavyweight compliance frameworks beyond practical SSDF/SLSA/OWASP/GitHub controls.
- No duplicate policy text in tool-specific files.
- `.agents/` compatibility shim is recommended because `.agents` exists, but it must point back to `.ai` and must not become a second brain.

## Alternatives rejected
- Rejected: copy full policies into every payload. Reason: drift and stale instructions.
- Rejected: immediate GitHub ruleset enforcement. Reason: dry-runs and owner approval must come first.
- Rejected: revive Gemini as active lane. Reason: repo decisions phased it out.
- Rejected: Ollama chat-agent lane. Reason: current policy approves only embedding use unless reapproved.
