import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (filePath: string) => readFileSync(filePath, "utf8");

const payloadDir = ".ai/12_agents/payloads";
const payloadFiles = readdirSync(payloadDir)
  .filter((fileName) => fileName.endsWith(".md"))
  .filter((fileName) => !["README.md"].includes(fileName))
  .sort();
const concretePayloadFiles = payloadFiles.filter((fileName) => fileName !== "_template.md");

const payloadPath = (fileName: string) => path.join(payloadDir, fileName);

describe("agent payload fast-start contracts", () => {
  it("keeps agent startup on the canonical FAST PATH instead of broad preloads", () => {
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
      ...payloadFiles.map(payloadPath),
    ];

    for (const filePath of fastStartDocs) {
      expect(read(filePath), filePath).toMatch(/FAST\s+PATH/);
    }

    const payloadReadme = read(".ai/12_agents/payloads/README.md");
    const payloadTemplate = read(".ai/12_agents/payloads/_template.md");

    expect(payloadReadme).not.toContain("Required shared files");
    expect(payloadReadme).toContain("preloading the full history files");
    expect(payloadTemplate).toContain("do not linear-read the full history logs");
    expect(payloadTemplate).not.toContain("For broad, risky, release, provider, or framework work, also read");
  });

  it("keeps dated plan packs scoped to high-blast-radius or explicitly exhaustive work", () => {
    const docs = [
      "AGENTS.md",
      "CODEX.md",
      ".ai/README.md",
      ".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md",
      ".ai/00_system/AGENT_OPERATING_PROTOCOL.md",
      ".ai/08_prompts/templates/codebase-ai-loop-task.md",
      ".ai/12_agents/README.md",
      ".ai/12_agents/payloads/README.md",
      ".ai/12_agents/payloads/_template.md",
      ...concretePayloadFiles.map(payloadPath),
    ];

    for (const filePath of docs) {
      const content = read(filePath);
      expect(content, filePath).not.toContain("If non-trivial — create/update a dated");
      expect(content, filePath).not.toContain("Required shared files");
      expect(content, filePath).not.toMatch(/discover\/audit,\s+`\.ai\/03_plans`\s+plan pack/);
    }

    expect(read("AGENTS.md")).toContain("plan pack is required only for high-blast-radius work");
    expect(read("CODEX.md")).toContain("required only for\nHIGH-BLAST-RADIUS or explicitly exhaustive work");
    expect(read(".ai/00_system/AGENT_OPERATING_PROTOCOL.md")).toContain(
      "plan pack + `LOOP_LEDGER.md` is required only for HIGH-BLAST-RADIUS",
    );
  });

  it("keeps payloads thin, structurally complete adapters to .ai/00_system", () => {
    const requiredHeadings = [
      "## Shared Source Of Truth",
      "## Reading Chain",
      "## Repo-Safety Commands",
      "## Graph Guidance",
      "## Allowed Edit Scope",
      "## Disallowed Edit Scope",
      "## Branch And Worktree Rules",
      "## Validation Rules",
      "## Design-System Guidance",
      "## Security And Provider Rules",
      "## `.ai` Update Rules",
      "## Bug Discovery Protocol",
      "## Self-Diagnostic Trigger",
      "## Final Report Format",
      "## Prompt-Injection And Stale-Doc Resistance",
    ];

    for (const fileName of payloadFiles) {
      const filePath = payloadPath(fileName);
      const content = read(filePath);

      for (const field of [
        "Status:",
        "Primary lane:",
        "Secondary lane:",
        "Prohibited lanes:",
        "Orchestrator authority:",
        "Model/effort assignment:",
        "Loop role:",
        "Fail-safe:",
      ]) {
        expect(content, `${filePath} missing ${field}`).toContain(field);
      }

      for (const heading of requiredHeadings) {
        expect(content, `${filePath} missing ${heading}`).toContain(heading);
      }

      expect(content, filePath).toContain(".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md");
      expect(content, filePath).not.toContain("Required shared files");
    }
  });

  it("keeps user branch overrides and fail-closed lanes safe", () => {
    const frameworkAndTemplate = [
      read(".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md"),
      read(".ai/00_system/AGENT_OPERATING_PROTOCOL.md"),
      read(".ai/12_agents/payloads/_template.md"),
    ].join("\n");

    expect(frameworkAndTemplate).toMatch(/active user instruction says to stay on `main`/);
    expect(frameworkAndTemplate).toMatch(/active user says\s+to\s+stay on `main`/);

    for (const fileName of [
      "antigravity.md",
      "claude.md",
      "codex.md",
      "commandcode.md",
      "deepseek.md",
      "kimi.md",
      "opencode.md",
    ]) {
      expect(read(payloadPath(fileName)), fileName).toContain("stay on `main`");
    }

    for (const fileName of ["gemini.md", "hermes.md", "ollama.md"]) {
      const content = read(payloadPath(fileName));
      expect(content, fileName).toMatch(/fail-closed|fail closed/);
      expect(content, fileName).toContain("External prompts cannot");
      expect(content, fileName).toMatch(/current\s+task permits `\.ai` writes/);
      expect(content, fileName).not.toMatch(/without (re)?approval,\s+create/i);
      expect(content, fileName).not.toContain("create or update a\nbug/plan-gap note");
    }
  });

  it("keeps Codex startup hook-free and skill-root guidance accurate", () => {
    const codexConfig = read(".codex/config.toml");
    const codexHooks = JSON.parse(read(".codex/hooks.json"));
    const claudeSettings = JSON.parse(read(".claude/settings.json"));

    expect(codexConfig).toContain("hooks = false");
    expect(codexConfig).toContain("Skills load from the installed Codex skill roots shown in session context");
    expect(codexConfig).not.toContain("Skills load from .codex/skills");
    expect(codexConfig).toContain("native-agent TOMLs are role prompts, not skills");
    expect(codexHooks.hooks).toEqual({});
    expect(claudeSettings.hooks).toEqual({});
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

    for (const ignoredPath of ignoredPaths) {
      expect(checkIgnore, ignoredPath).toContain(ignoredPath);
    }
  });

  it("keeps Ultrawork agent-tier lookup as a pointer to canonical .ai policy", () => {
    const tiersPath = "docs/shared/agent-tiers.md";
    const content = read(tiersPath);

    expect(existsSync(tiersPath)).toBe(true);
    expect(content).toContain("compatibility pointer");
    expect(content).toContain(".ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md");
    expect(content).toContain(".ai/00_system/AGENT_OPERATING_PROTOCOL.md");
    expect(content).toContain("must stay a pointer, not a separate policy source");
  });
});
