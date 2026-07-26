import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import baseline from "../fixtures/new-landing-control-hashes.json";

const projectRoot = path.resolve(import.meta.dirname, "../..");
const binaryExtensions = new Set([".avif", ".png", ".ttf", ".webp"]);

function canonicalControlBytes(filePath: string, bytes: Buffer) {
  if (binaryExtensions.has(path.extname(filePath).toLowerCase())) return bytes;
  return Buffer.from(bytes.toString("utf8").replace(/\r\n|\r|\n/gu, "\r\n"), "utf8");
}

describe("new landing control integrity", () => {
  it("keeps control content identical with canonical text line endings", async () => {
    expect(baseline.files).toHaveLength(baseline.fileCount);

    const currentFiles = await Promise.all(
      baseline.files.map(async (file) => {
        const bytes = await readFile(path.join(projectRoot, file.path));
        const canonicalBytes = canonicalControlBytes(file.path, bytes);
        return {
          path: file.path,
          bytes: canonicalBytes.byteLength,
          sha256: createHash("sha256").update(canonicalBytes).digest("hex"),
        };
      }),
    );

    expect(currentFiles).toEqual(
      baseline.files.map(({ path: filePath, bytes, sha256 }) => ({
        path: filePath,
        bytes,
        sha256,
      })),
    );
  });
});
