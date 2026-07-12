#!/usr/bin/env bun

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  buildBetaReleaseReadiness,
  renderBetaReleaseReadinessMarkdown,
  type BetaReleaseReadinessInput,
} from "./lib/beta-release-readiness";

function argumentValue(args: string[], flag: string) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

export function generateBetaReleaseReadiness(input: BetaReleaseReadinessInput) {
  const readiness = buildBetaReleaseReadiness(input);
  return { readiness, markdown: renderBetaReleaseReadinessMarkdown(readiness) };
}

if (import.meta.main) {
  const inputPath = argumentValue(Bun.argv.slice(2), "--input");
  const outputPath = argumentValue(Bun.argv.slice(2), "--output");
  if (!inputPath || !outputPath) throw new Error("--input and --output are required; this generator never writes a default readiness location.");
  const result = generateBetaReleaseReadiness(JSON.parse(readFileSync(resolve(inputPath), "utf8")) as BetaReleaseReadinessInput);
  const absoluteOutputPath = resolve(outputPath);
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, `${JSON.stringify(result.readiness, null, 2)}\n`);
  writeFileSync(`${absoluteOutputPath}.md`, result.markdown);
}
