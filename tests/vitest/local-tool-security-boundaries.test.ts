import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("local developer tool security boundaries", () => {
  it("removes obsolete scripts that replay stored authentication cookies", () => {
    expect(existsSync("scripts/shot-glass-newdesign.mjs")).toBe(false);
    expect(existsSync("scripts/bench-hero-server.mjs")).toBe(false);
  });

  it("requires attested Supermemory and rejects mutable GitNexus command shapes", () => {
    const supermemory = readFileSync("scripts/supermemory-memory.mjs", "utf8");
    const gitnexus = readFileSync("scripts/run-safe-gitnexus-command.mjs", "utf8");
    const activeGitnexusGuidance = [
      "AGENTS.md",
      ".agents/skills/gitnexus/gitnexus-cli/SKILL.md",
      ".agents/skills/gitnexus/gitnexus-debugging/SKILL.md",
      ".agents/skills/gitnexus/gitnexus-exploring/SKILL.md",
      ".agents/skills/gitnexus/gitnexus-guide/SKILL.md",
      ".agents/skills/gitnexus/gitnexus-impact-analysis/SKILL.md",
      ".agents/skills/gitnexus/gitnexus-refactoring/SKILL.md",
    ].map((path) => readFileSync(path, "utf8")).join("\n");

    expect(supermemory).toContain("runtimeStateMatches(readRuntimeState(), attestation)");
    expect(supermemory.indexOf("runtimeStateMatches(readRuntimeState(), attestation)")).toBeLessThan(
      supermemory.indexOf("authorization: `Bearer ${readApiKey()}`"),
    );
    expect(gitnexus).toContain("allowedCommands");
    expect(gitnexus).toContain("unsupported GitNexus command");
    expect(gitnexus).toContain("arguments must not contain control characters");
    expect(activeGitnexusGuidance).toContain("bun run graph:reindex");
    expect(activeGitnexusGuidance).not.toContain("node .gitnexus/run.cjs");
    expect(activeGitnexusGuidance).not.toContain("npx gitnexus");
    expect(activeGitnexusGuidance).not.toContain("gitnexus@latest");
  });

  it("keeps visual verification reads inside the repo and live-server tokens loopback-origin only", () => {
    const verifier = readFileSync(".design-sync/verify-render.mjs", "utf8");
    const liveServer = readFileSync(".agents/skills/impeccable/scripts/live-server.mjs", "utf8");

    expect(verifier).toContain("path.relative(ROOT, fp)");
    expect(verifier).toContain('res.end("forbidden")');
    expect(liveServer).toContain("origin === 'null'");
    expect(liveServer).toContain("isAllowedBrowserOrigin(origin)");
    expect(liveServer).not.toContain("Access-Control-Allow-Origin', '*'");
    expect(liveServer).toContain("path.relative(root, candidate)");
    expect(liveServer).not.toContain("console.log(`Token: ${state.token}");
  });
});
