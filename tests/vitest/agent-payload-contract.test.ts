import { execFileSync, execSync } from "node:child_process";
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (filePath: string) => readFileSync(filePath, "utf8");
const payloadDir = ".ai/12_agents/payloads";
const payloadFiles = readdirSync(payloadDir)
  .filter((fileName) => fileName.endsWith(".md"))
  .filter((fileName) => !["README.md", "_template.md"].includes(fileName))
  .sort();
const payloadPath = (fileName: string) => path.join(payloadDir, fileName);

describe("agent workflow contracts", () => {
  it("keeps startup on the canonical FAST PATH", () => {
    const fastStartDocs = [
      "AGENTS.md",
      "CLAUDE.md",
      "CODEX.md",
      ".ai/README.md",
      ".ai/00_system/DOCS_SOURCE_OF_TRUTH.md",
      ".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md",
      ".ai/08_prompts/templates/codebase-ai-loop-task.md",
      ".ai/12_agents/README.md",
      ".ai/12_agents/payloads/README.md",
      ".ai/12_agents/payloads/_template.md",
      ...payloadFiles.map(payloadPath),
    ];
    for (const filePath of fastStartDocs) expect(read(filePath), filePath).toMatch(/FAST\s+PATH/);

    const currentState = read(".ai/10_state/current-state.md");
    const startMarker = "<!-- FAST PATH:START -->";
    const endMarker = "<!-- FAST PATH:END -->";
    const start = currentState.indexOf(startMarker);
    const end = currentState.indexOf(endMarker);
    const fastPath = currentState.slice(start, end + endMarker.length);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(fastPath.split(/\r?\n/).length).toBeLessThanOrEqual(150);
    expect(Buffer.byteLength(fastPath, "utf8")).toBeLessThanOrEqual(16 * 1024);
    expect(fastPath).toContain("Cloudflare/D1 is active");
  });

  it("keeps Direct, Brief, and Plan Pack routing lean", () => {
    const contracts = [
      read("AGENTS.md"),
      read(".ai/00_system/AGENT_OPERATING_PROTOCOL.md"),
      read(".agents/skills/archestimator-plan-pack/SKILL.md"),
      read(".ai/08_prompts/templates/codebase-ai-loop-task.md"),
    ].join("\n");

    expect(contracts).toContain("Direct");
    expect(contracts).toContain("Brief");
    expect(contracts).toContain("Plan Pack");
    expect(contracts).toContain("Formal leases/heartbeats are plan-pack-only");
    expect(contracts).not.toContain("LOOP_LEDGER.md");
    expect(contracts).not.toMatch(/DISCOVER\s*(?:→|->)\s*PLAN\s*(?:→|->)\s*EXECUTE/);
  });

  it("keeps payloads as thin capability adapters", () => {
    for (const fileName of payloadFiles) {
      const filePath = payloadPath(fileName);
      const content = read(filePath);
      for (const field of ["Status:", "Primary lane:", "Secondary lane:", "Prohibited lanes:"]) {
        expect(content, filePath + " missing " + field).toContain(field);
      }
      for (const reference of [
        "AGENTS.md",
        ".ai/00_system",
        ".ai/10_state/current-state.md",
        "Q0_CONTRACT_ONLY",
        "Q3_RELEASE_GATE",
      ]) {
        expect(content, filePath + " missing " + reference).toContain(reference);
      }
      if (content.includes("Status: approved")) {
        expect(content, filePath + " missing Direct").toContain("Direct");
        expect(content, filePath + " missing Brief").toContain("Brief");
        expect(content, filePath + " missing Plan Pack").toMatch(/Plan\s+Pack/);
      }
      expect(content, filePath).not.toMatch(/\b(?:NOT_REQUIRED|TEST_PROPOSAL|TEST_TASK)\b/);
      expect(content, filePath).not.toContain("Required shared files");
    }
  });

  it("defines portable orchestration and structured lifecycle contracts", () => {
    const directive = read(
      ".ai/08_prompts/000_Planning Prompts/Multi-Agent-Execution-Directive.md",
    );
    for (const value of [
      "Native subagents",
      "Parallel threads or team panes",
      "Emulated specialist passes",
      "Single-agent fallback",
      "Task Contract",
      "Subagent Assignment Contract",
      "Handoff Contract",
      "Completion Contract",
      "Independent Review",
      "Failure, Retry, And Recovery Contract",
      "Never allow concurrent writes to the same file",
      "lead executes the slice sequentially",
    ]) {
      expect(directive).toContain(value);
    }
  });

  it("passes exactly the ten required workflow simulations", () => {
    const output = execSync("node scripts/validate-agent-workflow-simulations.mjs", {
      encoding: "utf8",
    });
    const passLines = output.match(/^PASS SIM-\d{2} /gm) ?? [];

    expect(passLines).toHaveLength(10);
    expect(output).toContain("PASS SIM-01 small single-file fix");
    expect(output).toContain("PASS SIM-10 missing access or external write");
    expect(output).toContain("workflow simulations passed (10/10)");
  });

  it("keeps the Git prompt grounded and separately authorized", () => {
    const prompt = read(".ai/08_prompts/000_Git Commit Prompt/GIt-Commit-Prompt.md");
    expect(prompt).toContain("Commit only the current task's evidenced changes");
    expect(prompt).toContain("separate explicit authorization");
    expect(prompt).toContain("detect_changes()");
    expect(prompt).toContain("A clean worktree is not required");
    expect(prompt).not.toContain("Commit and push all current worktree changes");
    expect(prompt).not.toContain("Finish on local `main`");
  });

  it("keeps current Codex model routing and runtime limits synchronized", () => {
    const codexConfig = read(".codex/config.toml");
    const matrix = JSON.parse(read(".ai/12_agents/codex-role-model-matrix.json"));
    const explore = read(".codex/agents/explore.toml");

    expect(codexConfig).toContain('model = "gpt-5.6"');
    expect(codexConfig).toMatch(/^max_depth = 1$/m);
    expect(codexConfig).toMatch(/^max_threads = 6$/m);
    expect(matrix.capability_classes).toHaveProperty("frontier_judgment");
    expect(matrix.capability_classes).toHaveProperty("balanced_read_heavy");
    expect(matrix.capability_classes).toHaveProperty("fast_repeatable");
    expect(matrix.fallback_order).toHaveLength(4);
    expect(matrix.roles.explore.model).toBe("gpt-5.6-luna");
    expect(explore).toContain('model = "gpt-5.6-luna"');
  });

  it("keeps adapter validation fail-closed on active legacy policy", () => {
    const validator = read("scripts/validate-ai-workflow-adapters.mjs");
    expect(validator).toContain('".agents"');
    expect(validator).toContain('"Q0_CONTRACT_ONLY"');
    expect(validator).toContain('"Q3_RELEASE_GATE"');
    expect(validator).toContain("legacy NOT_REQUIRED taxonomy");

    const fixtureRoot = mkdtempSync(path.join(tmpdir(), "archestimator-adapter-validator-"));
    const fixturePaths = [
      ".agents",
      ".ai/00_system",
      ".ai/08_prompts/000_Planning Prompts",
      ".ai/08_prompts/templates",
      ".ai/10_state/current-state.md",
      ".ai/11_skills",
      ".ai/12_agents",
      ".codex",
      ".commandcode",
      ".cursor",
      ".gemini",
      ".cursorrules",
      "AGENTS.md",
      "CLAUDE.md",
      "CODEX.md",
      "GEMINI.md",
    ];

    try {
      for (const fixturePath of fixturePaths) {
        cpSync(fixturePath, path.join(fixtureRoot, fixturePath), { recursive: true });
      }
      appendFileSync(
        path.join(fixtureRoot, ".agents/README.md"),
        "\nDefault to NOT_REQUIRED and require an explicit TEST_TASK.\n",
      );

      expect(() =>
        execFileSync(
          "node",
          [
            path.resolve("scripts/validate-ai-workflow-adapters.mjs"),
            "--root",
            fixtureRoot,
            "--output",
            path.join(fixtureRoot, "adapter-validation.json"),
          ],
          { encoding: "utf8", stdio: "pipe" },
        ),
      ).toThrow();

      const report = JSON.parse(readFileSync(path.join(fixtureRoot, "adapter-validation.json"), "utf8"));
      expect(report.status).toBe("FAIL");
      expect(report.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining(".agents/README.md: contains legacy NOT_REQUIRED taxonomy"),
          }),
        ]),
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("keeps deprecated and fallback adapters fail-closed", () => {
    for (const filePath of ["GEMINI.md", ".gemini/GEMINI.md"]) {
      const content = read(filePath);
      expect(content, filePath).toContain("Deprecated");
      expect(content, filePath).toContain("AGENTS.md");
      expect(content, filePath).toContain("Multi-Agent-Execution-Directive.md");
    }
    for (const filePath of [
      ".cursorrules",
      ".cursor/rules/00-archestimator-project-brain.mdc",
      "CODEX.md",
      "CLAUDE.md",
      ".commandcode/README.md",
    ]) {
      expect(read(filePath), filePath).toContain("Multi-Agent-Execution-Directive.md");
    }
  });

  it("keeps local runtime state untracked and ignored", () => {
    const trackedLocalState = execSync(
      [
        "git",
        "ls-files",
        ".omx",
        ".omo",
        ".gitnexus",
        ".code-review-graph",
        ".chunkhound",
        ".codex/cache",
        ".codex/logs",
        ".codex/sessions",
        ".codex/state",
        ".codex/tmp",
        ".codex/local",
        ".claude/settings.local.json",
        ".claude/worktrees",
        ".ai/99_scratch",
        ".ai/14_code_intelligence",
      ].join(" "),
      { encoding: "utf8" },
    ).trim();
    expect(trackedLocalState).toBe("");

    const ignoredPaths = [
      ".omx/state/foo",
      ".omo/session.json",
      ".gitnexus/index.db",
      ".code-review-graph/cache.db",
      ".chunkhound/cache",
      ".codex/cache/x",
      ".codex/logs_2.sqlite",
      ".claude/settings.local.json",
      ".ai/99_scratch/x",
      ".ai/14_code_intelligence/x",
    ];
    const checkIgnore = execSync(["git", "check-ignore", "-v", ...ignoredPaths].join(" "), {
      encoding: "utf8",
    });
    for (const ignoredPath of ignoredPaths) expect(checkIgnore, ignoredPath).toContain(ignoredPath);
  });

  it("keeps compatibility tier documentation as a pointer", () => {
    const tiersPath = "docs/shared/agent-tiers.md";
    const content = read(tiersPath);
    expect(existsSync(tiersPath)).toBe(true);
    expect(content).toContain("compatibility pointer");
    expect(content).toContain(".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md");
    expect(content).toContain(".ai/00_system/AGENT_OPERATING_PROTOCOL.md");
    expect(content).toContain("must stay a pointer, not a separate policy source");
  });
});
