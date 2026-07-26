import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8");
}

async function fakeClassifier(
  temporaryDirectory: string,
  classification: Record<string, unknown>,
): Promise<NodeJS.ProcessEnv> {
  const bin = join(temporaryDirectory, "bin");
  const source = `
const { writeFileSync } = require("node:fs");
const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output");
writeFileSync(args[outputIndex + 1], JSON.stringify({
  schema_version: 1,
  kind: "quality-classification",
  status: "PASS",
  generated_at: new Date().toISOString(),
  summary: "fixture",
  findings: [],
  data: JSON.parse(process.env.FAKE_CLASSIFICATION_DATA),
}));
`;
  await mkdir(bin);
  if (process.platform === "win32") {
    await writeFile(join(bin, "bun.cmd"), '@echo off\r\nnode "%~dp0fake-bun.cjs" %*\r\n');
    await writeFile(join(bin, "fake-bun.cjs"), source);
  } else {
    const executable = join(bin, "bun");
    await writeFile(executable, `#!/usr/bin/env node\n${source}`);
    await chmod(executable, 0o755);
  }
  return {
    ...process.env,
    PATH: `${bin}${delimiter}${process.env.PATH ?? ""}`,
    FAKE_CLASSIFICATION_DATA: JSON.stringify(classification),
  };
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
    const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" })
      .stdout.trim();
    const classification = {
      profile: "Q2_CRITICAL_CHANGE_GATE",
      reasons: ["fixture"],
      files: ["src/lib/auth.ts"],
      affected_capabilities: ["CAP-AUTH"],
      comparison_base: { input_ref: "HEAD", resolved_sha: head },
      attribution: { merge_base: head },
    };
    const env = await fakeClassifier(temporaryDirectory, classification);

    const run = spawnSync(
      "bun",
      [
        "scripts/quality/verify.ts",
        "--plan",
        "--base", "HEAD",
        "--base-sha", head,
        "--classification",
        classificationPath,
        "--output",
        manifestPath,
      ],
      { cwd: root, encoding: "utf8", env },
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
    const registryPath = join(temporaryDirectory, "registry.json");
    const manifestPath = join(temporaryDirectory, "manifest.json");
    const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" })
      .stdout.trim();
    await writeJson(registryPath, {
      capabilities: [{ id: "CAP-TEST", evidence_kinds: ["classification"] }],
    });
    const classification = {
      profile: "Q2_CRITICAL_CHANGE_GATE",
      reasons: ["fixture"],
      files: ["scripts/quality/traceability.ts"],
      affected_capabilities: ["CAP-TEST"],
      comparison_base: { input_ref: "HEAD", resolved_sha: head },
      attribution: { merge_base: head },
    };
    const env = await fakeClassifier(temporaryDirectory, classification);

    const run = spawnSync(
      "bun",
      [
        "scripts/quality/verify.ts",
        "--plan",
        "--base", "HEAD",
        "--base-sha", head,
        "--classification",
        classificationPath,
        "--registry",
        registryPath,
        "--output",
        manifestPath,
      ],
      { cwd: root, encoding: "utf8", env },
    );
    expect(run.status).toBe(1);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    expect(manifest.status).toBe("QUALITY_BLOCKED");
    expect(manifest.data.traceability).toMatchObject({
      status: "PASS",
      affected_capabilities: ["CAP-TEST"],
      findings: [],
      evidence: [
        {
          capability_id: "CAP-TEST",
          kind: "classification",
          command: "bun run quality:classify",
          status: "PASS",
          artifact: classificationPath,
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
