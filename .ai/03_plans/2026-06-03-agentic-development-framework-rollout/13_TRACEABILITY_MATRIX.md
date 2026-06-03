# Traceability Matrix

| Requirement | Acceptance criterion | Files likely affected | Step | Verification | Risk/rollback | Phase | Status |
|---|---|---|---|---|---|---|---|
| `.ai` canonical brain | tool adapters point to `.ai` | `.ai/00_system`, adapters | 1A | path/text audit | revert adapter docs | 1A | planned |
| Payload schema | all payloads use schema | `.ai/12_agents` | 1A | schema checklist | revert payload commit | 1A | planned |
| Hermes decision | active payload or fail-closed | `hermes.md`, roster | 1A | owner/fail-closed audit | remove active route | 1A | open |
| Cursor decision | payload or config-only | `cursor.md`, `.cursor` | 1A | inventory audit | remove active route | 1A | open |
| Ollama non-agent | embedding-only/prohibition note | `ollama.md`/README | 1A | text audit | remove chat refs | 1A | planned |
| Gemini deprecated | root/payload fail closed | `GEMINI.md`, `gemini.md`, `.gemini` | 1A | fail-closed eval | disable/revert | 1A | planned |
| `.agents` shim | README points to `.ai` | `.agents/README.md` | 1A | path audit | revert shim | 1A | planned |
| CommandCode subordination | no separate brain | `.commandcode/*` | 1A | rg audit | revert local docs | 1A | planned |
| GitNexus fallback | exact failure recorded | logs/docs | preflight | CLI/CRG evidence | repair/fallback | 1A | active blocker |
| Prompt templates | full workflow matrix | `.ai/08_prompts` | 1A | checklist | revert prompts | 1A | planned |
| Skills/playbooks | reusable workflows | `.ai/11_skills` | 1A | checklist | revert playbooks | 1A | planned |
| Notion mirror | source path/hash/date/proof/no secrets | Notion + `.ai/05_logs` | 1B | Notion fetch proof | blocker/correct mirror | 1B | hard gate |
| Notion stale stack | verified from package.json | Notion Eng/Inventory | 1B | package-vs-Notion audit | correct mirror | 1B | drift found |
| Dry-runs/evals | scored before enforcement | docs/logs | later | eval logs | keep advisory | later | not executed |
| Provider proof | no local-only launch claims | `.ai`, proof packets | later | provider/manual evidence | correct false claim | later | open |
| Final report | exact status/proof boundary | final report | all | checklist | correction/bug | all | planned |
