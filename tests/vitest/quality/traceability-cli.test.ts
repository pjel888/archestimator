import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8");
}

describe("quality traceability CLI integration", () => {
  it("rejects a critical evidence kind without an executable profile mapping", async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "arch-quality-traceability-"));
    const profilesPath = join(temporaryDirectory, "profiles.json");
    const outputPath = join(temporaryDirectory, "contracts.json");
    const profiles = JSON.parse(
      await readFile(resolve(root, "quality/profiles.json"), "utf8"),
    );
    delete profiles.evidence_commands.security;
    await writeJson(profilesPath, profiles);

    const run = spawnSync(
      "bun",
      [
        "scripts/quality/contracts.ts",
        "--profiles",
        profilesPath,
        "--output",
        outputPath,
      ],
      { cwd: root, encoding: "utf8" },
    );
    expect(run.status).toBe(1);
    const result = JSON.parse(await readFile(outputPath, "utf8"));
    expect(result.status).toBe("FAIL");
    expect(result.findings.map((finding: { code: string }) => finding.code)).toContain(
      "EVIDENCE_COMMAND_UNMAPPED",
    );
  });

  it("adds fail-closed capability evidence to a planned verification manifest", async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "arch-quality-traceability-"));
    const classificationPath = join(temporaryDirectory, "classification.json");
    const manifestPath = join(temporaryDirectory, "manifest.json");
    await writeJson(classificationPath, {
      schema_version: 1,
      kind: "quality-classification",
      status: "PASS",
      generated_at: new Date().toISOString(),
      summary: "fixture",
      findings: [],
      data: {
        profile: "Q2_CRITICAL_CHANGE_GATE",
        reasons: ["fixture"],
        files: ["src/lib/auth.ts"],
        affected_capabilities: ["CAP-AUTH"],
        attribution: { merge_base: "a".repeat(40) },
      },
    });

    const run = spawnSync(
      "bun",
      [
        "scripts/quality/verify.ts",
        "--plan",
        "--classification",
        classificationPath,
        "--output",
        manifestPath,
      ],
      { cwd: root, encoding: "utf8" },
    );
    expect(run.status).toBe(1);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    expect(manifest.status).toBe("QUALITY_BLOCKED");
    expect(manifest.data.traceability.status).toBe("FAIL");
    expect(manifest.data.traceability.affected_capabilities).toEqual(["CAP-AUTH"]);
    expect(manifest.data.traceability.evidence).toHaveLength(4);
    expect(
      manifest.data.traceability.evidence.every(
        (item: { status: string; artifact: string }) =>
          item.status === "FAIL" && item.artifact === "",
      ),
    ).toBe(true);
    expect(
      manifest.data.traceability.findings.map((finding: { code: string }) => finding.code),
    ).toEqual([
      "CAPABILITY_EVIDENCE_FAILED",
      "CAPABILITY_EVIDENCE_FAILED",
      "CAPABILITY_EVIDENCE_FAILED",
      "CAPABILITY_EVIDENCE_FAILED",
    ]);
  });

  it("builds passing capability traceability from a freshly executed command artifact", async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "arch-quality-traceability-"));
    const classificationPath = join(temporaryDirectory, "classification.json");
    const profilesPath = join(temporaryDirectory, "profiles.json");
    const registryPath = join(temporaryDirectory, "registry.json");
    const manifestPath = join(temporaryDirectory, "manifest.json");
    const profiles = JSON.parse(
      await readFile(resolve(root, "quality/profiles.json"), "utf8"),
    );
    profiles.evidence_commands.contracts = {
      Q0_CONTRACT_ONLY: "bun run quality:contracts",
    };
    await writeJson(profilesPath, profiles);
    await writeJson(registryPath, {
      capabilities: [{ id: "CAP-TEST", evidence_kinds: ["contracts"] }],
    });
    await writeJson(classificationPath, {
      data: {
        profile: "Q0_CONTRACT_ONLY",
        reasons: ["fixture"],
        files: ["docs/quality/readme.md"],
        affected_capabilities: ["CAP-TEST"],
        attribution: { merge_base: "a".repeat(40) },
      },
    });

    const run = spawnSync(
      "bun",
      [
        "scripts/quality/verify.ts",
        "--classification",
        classificationPath,
        "--profiles",
        profilesPath,
        "--registry",
        registryPath,
        "--output",
        manifestPath,
      ],
      { cwd: root, encoding: "utf8" },
    );
    expect(run.status).toBe(0);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    expect(manifest.status).toBe("PASS");
    expect(manifest.data.traceability).toMatchObject({
      status: "PASS",
      affected_capabilities: ["CAP-TEST"],
      findings: [],
      evidence: [
        {
          capability_id: "CAP-TEST",
          kind: "contracts",
          command: "bun run quality:contracts",
          status: "PASS",
          artifact: "artifacts/quality/contracts.json",
        },
      ],
    });
    expect(manifest.data.traceability.evidence[0].artifact_sha256).toMatch(
      /^[a-f0-9]{64}$/u,
    );
  });

  it("rejects a manifest with missing affected-capability evidence", async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "arch-quality-traceability-"));
    const classificationPath = join(temporaryDirectory, "classification.json");
    const manifestPath = join(temporaryDirectory, "manifest.json");
    const outputPath = join(temporaryDirectory, "traceability.json");
    await writeJson(classificationPath, {
      data: { affected_capabilities: ["CAP-AUTH"] },
    });
    await writeJson(manifestPath, {
      data: { traceability: { evidence: [] } },
    });

    const run = spawnSync(
      "bun",
      [
        "scripts/quality/traceability.ts",
        "--classification",
        classificationPath,
        "--evidence",
        manifestPath,
        "--output",
        outputPath,
      ],
      { cwd: root, encoding: "utf8" },
    );
    expect(run.status).toBe(1);
    const result = JSON.parse(await readFile(outputPath, "utf8"));
    expect(result.status).toBe("FAIL");
    expect(result.findings.map((finding: { code: string }) => finding.code)).toEqual([
      "MISSING_CAPABILITY_EVIDENCE",
      "MISSING_CAPABILITY_EVIDENCE",
      "MISSING_CAPABILITY_EVIDENCE",
      "MISSING_CAPABILITY_EVIDENCE",
    ]);
  });
});
