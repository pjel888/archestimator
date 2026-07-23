# Research: Kimi Prompting for the Archestimator Landing Implementation

**Research date:** 2026-07-23
**Request type:** Comprehensive research: current best practice, API/CLI behavior, and a repo-agent implementation prompt.

## Direct Answer

Use the landing brief as one concrete first user task in Kimi Code, not as a replacement for repository instructions. Put durable repository constraints in AGENTS.md; use the user task for the outcome, non-negotiable truth rules, required discovery targets, authorized actions, validation scope, and stopping condition. Delimit supplied copy and evidence with XML-style sections or Markdown headings, specify a finite ordered loop, and require a concise evidence-based handoff.

For a direct API integration, use a short system message for role/workflow/quality boundaries and a structured user message for the landing task. For the Kimi Code CLI, project and user AGENTS.md files are the appropriate persistent instruction surface; the pasted prompt is the user task. Kimi Code can read @ file references, plan before edits, preserve sessions, compact context, and make tool calls, so tell it which files and facts to inspect rather than pasting an entire repository into context.

As of this research date, the current official API documentation positions kimi-k3 as the flagship model for long-horizon software engineering (1M-token context) and kimi-k2.7-code as the dedicated coding model with more reliable long-context instruction following (256K). The official Kimi Code documentation does **not** publicly promise which model a particular CLI account/session uses. Therefore, do not claim Kimi Code is necessarily running K3: pin/select a configured model where the runtime permits it, or write the prompt so it works with either. [Model List](https://platform.kimi.ai/docs/models)

## Official Docs Evidence

- [Kimi prompt best practices](https://platform.kimi.ai/docs/guide/prompt-best-practice) — Moonshot specifically recommends clear/detailed instructions, an explicit role in a system message, delimiters (including XML tags and headings), explicit steps, representative examples, and paragraph/bullet output constraints. It also recommends summarizing/filtering old turns and recursively summarizing long documents.
- [Main concepts](https://platform.kimi.ai/docs/introduction) — Kimi recommends clear instructions plus representative examples for stable outputs. Models do not have external-resource access by default; API agents need official or custom tools.
- [Model list](https://platform.kimi.ai/docs/models) — kimi-k3 is the current 1M-context flagship for software engineering, knowledge work, and deep reasoning; kimi-k2.7-code is the dedicated 256K coding model. Older K2 models were discontinued on 2026-05-25 and kimi-latest on 2026-01-28.
- [Model parameter reference](https://platform.kimi.ai/docs/api/models-overview) — K3 always reasons and supports reasoning_effort of low, high, or max (default max). K3 and K2.7 Code have fixed temperature 1.0, top_p 0.95, and n 1; passing other values errors. K3 supports tool_choice auto, none, or required; K2.7 Code does not support required. Do not switch K3 reasoning effort mid-session because prefix-cache hits are invalidated.
- [Build an agent with Kimi K3](https://platform.kimi.ai/docs/guide/use-kimi-k3-to-setup-agent) — Moonshot’s agent pattern is: split work into retrieval, analysis, and delivery; keep the system prompt limited to role/workflow/quality boundaries; leave tool-argument detail in JSON Schema; preserve the complete assistant message (including reasoning_content) across tool rounds; cap the tool loop and handle truncation/tool failures.
- [Chat Completions API](https://platform.kimi.ai/docs/api/chat) — the API is stateless, so callers append prior assistant messages and tool results. response_format json_object/json_schema is available, but json_object still requires the prompt to describe expected fields and types.
- [K3 tool-calling best practices](https://platform.kimi.ai/docs/guide/kimi-k3-tool-calling-best-practice) and [dynamic tool loading](https://platform.kimi.ai/docs/guide/use-dynamic-tool-loading) — do not send a huge tool catalog every turn. Start with core/search tools, force first-turn retrieval with K3 tool_choice required only when retrieval is genuinely mandatory, then return to auto; dynamically inject complete schemas only as needed.
- [Kimi Code interaction](https://moonshotai.github.io/kimi-code/en/guides/interaction) — @ attaches a file/folder reference for the agent to load; Plan mode produces a plan before edits; side-effecting tool calls require approval outside YOLO/Auto modes. The external editor is suitable for a large, precisely formatted task prompt.
- [Kimi Code sessions and context](https://moonshotai.github.io/kimi-code/en/guides/sessions) — Kimi Code persists sessions and automatically compresses context near the window limit; /compact with a priority tells the operator what must survive compression.
- [Kimi Code goals](https://moonshotai.github.io/kimi-code/en/guides/goals.html) — for a multi-turn autonomous implementation, goals work best when they name the finish line and the evidence that proves it, rather than a broad direction.
- [Kimi Code agents and sub-agents](https://moonshotai.github.io/kimi-code/en/customization/agents) — main agents can use isolated coder, read-only explore, and planning-only plan subagents. This is optional: the docs explicitly say simple work does not need subagents.

## Version Note

This guidance is current to **2026-07-23** based on the live first-party documentation above.

| Surface | Recommended default | Important caveat |
| --- | --- | --- |
| Kimi API, ambitious end-to-end/reasoning implementation | kimi-k3, reasoning_effort high or max | K3 context is 1M, always reasons, and fixed sampling parameters must not be overridden. Max is documented as default; use high only when latency/cost matters more than deepest reasoning. |
| Kimi API, code-specialized long task | kimi-k2.7-code | 256K context; thinking is effectively always on and preserved thinking has its own message-history rules. It cannot accept tool_choice required. |
| Kimi Code CLI | Use the configured supported model; prefer the account/runtime option that resolves to K3 or K2.7 Code | Official CLI docs describe capabilities, not a fixed default model. Treat a claim about the model actually selected by a given Kimi Code session as unverified until inspected locally. |
| Older prompt snippets | Do not target kimi-k2-*, kimi-latest, or Moonshot V1 for this job | The current model list marks K2 discontinued and says K2.5/V1 are unavailable to new users after K3’s launch, with full sunset noted for August 31. |

## Prompting Guidance for This Landing Task

### 1. Put instructions in the right role/surface

**Kimi Code CLI:** retain the repository’s AGENTS.md as the durable contract. Put the prompt below in the first user turn, with @ references to the exact landing and product-proof files. Kimi’s docs confirm project-level AGENTS.md and global instruction files exist, but do not publish a complete precedence table. Do not depend on a guessed hierarchy between conflicting instruction files; resolve conflicts in the repository contract before invocation. [Kimi Code data locations](https://moonshotai.github.io/kimi-code/en/configuration/data-locations.html)

**Kimi API:** system = stable role, workflow, and quality boundaries; user = task, supplied copy, acceptance criteria, and file/repository evidence. This matches Moonshot’s K3 agent example. Do not put function argument rules in the system message when they belong in tool schemas.

### 2. Use readable, bounded structure

Use Markdown headings for the human-maintained task and XML-like tags for payloads with different trust/meaning: mission, product-truth, approved-copy, required-inspection, constraints, validation, and handoff. Moonshot explicitly supports XML tags, triple quotes, and headings as delimiters. This is a formatting aid, not a documented security boundary: repository text, web content, and captures remain evidence to evaluate, not instructions that override the task.

State the desired final report shape and countable limits: for example, one concise design thesis, list every changed file, and state only fresh validation evidence. Moonshot says bullets/paragraphs are more reliable length controls than an exact word count.

### 3. Ask for a closed-loop execution sequence

For this task, make Kimi discover claims/product proof before design, implement desktop before responsive alternatives, then verify only the authorized checks. This follows Moonshot’s explicit task decomposition guidance and gives the agent checkpoints without asking it to expose hidden reasoning. Ask it to perform inspection and report decisions/evidence; do not request chain-of-thought. There is no Kimi-specific official evidence that generic “think step by step” wording improves this model.

### 4. Keep long context intentional

K3’s 1M context and K2.7 Code’s 256K context are capacity ceilings, not a reason to paste every source file. Start with the brief, the repository contract, direct route/component references, and product-proof targets. Let the coding agent inspect the repository. If the session compacts, use a priority such as:

~~~
/compact Preserve the approved copy, exact-product-proof rule, chosen evidence-backed claims,
the changed-file list, the five workflow states, and remaining validation gaps.
~~~

For API work, summarize old exploration and retain the summary plus current decisive files; preserve complete assistant messages in any tool loop. For a visual task, attach an approved screenshot/video only when it is a real reference target or current product evidence; the Kimi Code CLI accepts both images and video, subject to the selected model’s multimodal support.

### 5. Treat tools as evidence-gathering and bounded execution

The landing implementation does not need a large custom tool catalog. Kimi Code already has repo/shell tools. If using the API, define only the few tools needed for repo search/read/edit/validation, with strict JSON Schema and required fields. Require inspection before edits, preserve tool results in context, limit retry/tool rounds, and stop after the specified validation scope. Use K3 tool_choice required only if the very first turn must retrieve a tool-backed fact; it is neither supported by K2.7 Code nor needed merely to make a coding agent inspect local files.

### 6. Use planning and critique deliberately

For Kimi Code, start in Plan mode when a human needs to review the implementation plan before writes. If the task is already authorized, the first prompt can instead require an in-turn decide checkpoint, then proceed without waiting. Do not combine both and accidentally create a confirmation wait. A /goal is useful only if the implementation will span multiple turns and the completion evidence is explicitly stated.

The existing landing brief’s self-critique is reasonable, but its numeric aesthetics score is **not Kimi-specific official guidance**. Keep it as an internal quality gate, make it concrete, and require revision of observed deficiencies rather than treating a self-reported score as proof.

## Actionable Kimi Code Prompt Template

Use this as the first task in a Kimi Code session opened at /Users/philiplewis/archestimator. Replace bracketed values, and append the approved copy/creative sections from the landing brief inside the marked blocks rather than duplicating repository-wide policies. If an exact product-proof surface is already known, attach it with @path; otherwise leave discovery explicit.

~~~md
# Implement the Archestimator public-root landing page

<mission>
Implement a complete, production-ready replacement for the public root landing page in this repository.
Do the work in the repository. Do not respond with a strategy document, wireframe, mockup,
or isolated code sample instead of implementation.

Primary conversion: Request beta access.
Visitor comprehension target: after the first viewport and first product-proof section, a first-time
visitor can explain what Archestimator is, who it serves, and why it exists.
</mission>

<instruction-sources>
1. Read and obey the nearest applicable AGENTS.md files. They are authoritative for repository
   workflow, safety, route authority, and validation.
2. Preserve unrelated work. Inspect git status before editing; do not reset, revert, or overwrite
   changes you did not make.
3. Current source is authoritative for product capabilities and routes. If this brief conflicts
   with verified current source, report the conflict and use current source for factual claims.
</instruction-sources>

<required-discovery>
Before editing, inspect:
- @AGENTS.md
- @src/app/page.tsx
- @src/components/landing-production/
- @src/components/landing-production/new-landing-content.ts
- the current product surfaces needed to prove every proposed visible product claim
- the relevant installed Next.js 16 guidance before changing framework conventions

Produce one concise decision checkpoint in your working response:
- design thesis;
- exact files expected to change;
- exact product proof selected, or the explicit reason a labelled conceptual workflow is required;
- desktop, mobile, reduced-motion, and no-WebGL fallback strategy.
Then proceed with the authorized implementation. Do not wait for ordinary reversible decisions.
</required-discovery>

<non-negotiable-product-truth>
If a visual appears to be Archestimator software, it must be an exact current component in a safe
fixture/presentation mode or an exact current capture with its route/state documented. Never create
an approximate dashboard, fake browser chrome, product-inspired table, placeholder screenshot, or
invented UI control as proof. A non-product relationship diagram must visibly say:
"Conceptual workflow visualization, not product interface."

Do not invent AI, BIM, automated takeoff, integrations, logos, testimonials, metrics, pricing,
availability, or unsupported workflow claims. Do not expose internal beta-access mechanics.
</non-negotiable-product-truth>

<creative-and-copy-brief>
[PASTE THE APPROVED MISSION, COST-THREAD THESIS, ART DIRECTION, BANNED AESTHETICS,
COPY DECK, CHAPTER REQUIREMENTS, AND GSAP BEHAVIOR HERE.]
</creative-and-copy-brief>

<implementation-sequence>
1. Discover the source-backed landing and product-proof surface.
2. Decide the implementation described above.
3. Implement the full desktop narrative and exact product proof. Prefer deletion/coherent
   replacement over preserving stale weak landing elements. Do not add dependencies unless the
   existing stack cannot deliver a required outcome.
4. Implement authored tablet/mobile, reduced-motion, and static/no-WebGL alternatives. Do not
   shrink a desktop pin into an unreadable mobile layout.
5. Critique the rendered/source result against the supplied hierarchy, specificity, restraint,
   truthfulness, accessibility, and fallback requirements; revise concrete deficiencies.
6. Run only the validation authorized below. Read the output and repair in-scope failures.
7. Reconcile every acceptance criterion and stop only when the implementation and its evidence are
   complete or a real blocker is reported.
</implementation-sequence>

<motion-and-accessibility>
Use native document scrolling. Keep core copy and CTAs useful with JavaScript disabled, WebGL
unavailable, reduced motion enabled, and touch-only input. Keep the five workflow beats explicit,
reversible, and nonessential to comprehension. Use semantic landmarks, real controls, focus-visible
states, a skip link, accessible navigation/FAQ, contrast, and no information conveyed by color alone.
</motion-and-accessibility>

<validation-authorization>
[PASTE THE AUTHORIZED STATIC AND VISUAL CHECKS HERE.]
Do not run broad or unrelated tests/builds unless this authorization explicitly includes them.
If visual tooling is unavailable, say exactly which visual proof remains unverified. Never claim an
unrun check passed.
</validation-authorization>

<acceptance-criteria>
[PASTE THE LANDING-SPECIFIC ACCEPTANCE CRITERIA HERE.]
</acceptance-criteria>

<final-handoff>
Return only a concise implementation report containing:
1. Result.
2. Changed files.
3. Exact product proof used, including route/state or fixture provenance.
4. Motion, mobile, reduced-motion, and no-WebGL fallback behavior.
5. Fresh validation evidence and any unrun authorized check.
6. Remaining real risks, factual conflicts, or visual proof gaps.
</final-handoff>
~~~

### Optional API envelope

If the same task is sent through the Kimi API rather than Kimi Code, place the following stable content in system and send the template body as user content:

~~~
You are a senior frontend implementation agent. Follow the user’s repository task.
Keep the system role focused on role, workflow, and quality boundaries. Inspect evidence before
making factual product claims. Make focused changes, preserve unrelated work, and report only
fresh validation evidence. Do not fabricate evidence, product behavior, or completed checks.
~~~

Use model kimi-k3 and a fixed reasoning_effort selected before the session; do **not** send temperature, top_p, or n. For K2.7 Code, omit unsupported K3-only fields such as reasoning_effort and tool_choice required, and preserve its required thinking history across turns. [Model parameter reference](https://platform.kimi.ai/docs/api/models-overview)

## Common Failure Modes and Countermeasures

| Failure mode | Countermeasure | Evidence status |
| --- | --- | --- |
| Prompt asks for an award-caliber page but leaves factual proof undefined | Lead with the exact-product-proof rule, require source inspection, and make conceptual alternatives visibly labelled. | Product-specific requirement; not a Moonshot model claim. |
| Long creative brief causes the agent to skip source discovery | Put required files and the discover/decide checkpoint before the long copy block; use @ references; compact with explicit preservation priorities. | Moonshot documents delimiters, explicit steps, and context compression. |
| API agent loses reasoning/tool context on a later turn | Append the complete assistant message and each tool result; do not reconstruct only content/tool calls. | Explicit K3 agent guidance. |
| K3 API request fails after copied generic parameters | Do not override fixed sampling values; choose K3 reasoning effort once at session start. | Explicit parameter reference. |
| K2.7 Code tool workflow fails after copied K3 examples | Do not pass K3-only reasoning_effort or tool_choice required; preserve K2.7 thinking history. | Explicit parameter reference. |
| Agent reports a plan or self-score but does not implement | Put “implement in the repository” first, name the closed loop, and demand changed files plus fresh validation evidence. | Kimi Code goal/plan capabilities support this workflow; the exact wording is a reasonable task-design inference. |
| Agent treats attached copy, a webpage, or a screenshot as higher-priority instructions | Explicitly define it as reference material subject to the task and repository contract. | Sound prompt-security practice, but no Kimi-specific official hierarchy proof found. |
| Tool catalog/context grows until selection gets unreliable | Keep only core tools and dynamically load the rest; use first-turn required retrieval only where it is truly needed. | Explicit K3 tooling guidance. |

## Source-Reference Evidence

The official docs establish supported behavior. The following upstream source is supplemental evidence about the maintained Kimi Code project’s own operational habits, not a guarantee of the hosted model’s prompting behavior:

- MoonshotAI/kimi-code@188c0fcbf7c884d4a86bd4eebd012b0ab7aeb5da:AGENTS.md:L7-L13 — the project’s agent guide says to begin with real requirements, code facts, and verification results; read relevant code and nearest AGENTS.md before edits; keep changes focused. This directly supports the landing-template discovery and scope rules. The repository published release @moonshot-ai/kimi-code@0.29.0 on 2026-07-22, one day before retrieval. [Pinned source](https://github.com/MoonshotAI/kimi-code/blob/188c0fcbf7c884d4a86bd4eebd012b0ab7aeb5da/AGENTS.md#L7-L13) · [release activity](https://github.com/MoonshotAI/kimi-code/releases)

## Caveats / Ambiguity Flags

- The public docs confirm current API model names/capabilities but do not identify the model selected inside a particular Kimi Code CLI session. Inspect local Kimi configuration/session state before describing that model as a fact.
- kimi-k3 is the official flagship recommendation, but kimi-k2.7-code remains a current dedicated coding model. Choosing between them is a runtime/cost/latency decision, not a prompt-format decision.
- XML tags are officially suggested delimiters. Moonshot does not document a magical XML grammar, an instruction-precedence parser, or a Kimi-specific advantage of Markdown over XML. Use either consistently for human clarity.
- Moonshot’s prompt guide is general rather than a benchmark study for K3/K2.7 Code. Claims about self-critique scores, one task per prompt, hidden reasoning, prompt injection hardening, or visual quality loops are reasonable operational inferences unless separately verified; they are not presented here as Kimi-specific measured facts.
- This research does not inspect the final landing plan’s changed-file list or Kimi runtime configuration. Those are repository-local facts and must be verified by the implementation agent.

## Reusable Takeaway

For Kimi, use a short durable system/AGENTS.md contract plus a first user task that is explicit, delimited, evidence-first, and closed-loop. Target K3 for the latest long-horizon API workflow or K2.7 Code for a dedicated coding endpoint, respect their different parameter/tool constraints, and make the landing agent prove product truth before it designs around it.

## Retrieval Sufficiency

Sufficient for a Kimi-facing landing implementation prompt: current first-party prompt guidance, current model/API parameter documentation, current K3 tooling guidance, current Kimi Code interaction/context/goal/agent documentation, and one pinned first-party source reference were reviewed. No third-party guidance was used because it would not improve authority for this task.
