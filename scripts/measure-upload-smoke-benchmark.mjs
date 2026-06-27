#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const DEFAULT_OUTPUT = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-smoke-benchmark.json";
const DEFAULT_PROFILE_OUTPUT = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence/upload-runtime-profile.json";

function readEnv(name) {
  return process.env[name]?.trim() || "";
}

function writeJson(path, payload) {
  const outputPath = resolve(path);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  return outputPath;
}

function memorySnapshot() {
  const usage = process.memoryUsage();
  return {
    rssMb: Math.round(usage.rss / 1024 / 1024),
    heapUsedMb: Math.round(usage.heapUsed / 1024 / 1024),
    externalMb: Math.round(usage.external / 1024 / 1024),
  };
}

async function measureImageCase({ label, width, height }) {
  const started = performance.now();
  const before = memorySnapshot();
  const source = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 210, g: 219, b: 226 },
    },
  }).png().toBuffer();

  const metadata = await sharp(source, { failOn: "warning", limitInputPixels: 24_000_000 }).rotate().metadata();
  const optimized = await sharp(source, { failOn: "warning", limitInputPixels: 24_000_000 })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  const thumbnail = await sharp(source, { failOn: "warning", limitInputPixels: 24_000_000 })
    .rotate()
    .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  const after = memorySnapshot();

  return {
    label,
    pixels: width * height,
    width,
    height,
    inputBytes: source.byteLength,
    metadataFormat: metadata.format,
    optimizedBytes: optimized.data.byteLength,
    optimizedWidth: optimized.info.width,
    optimizedHeight: optimized.info.height,
    thumbnailBytes: thumbnail.data.byteLength,
    thumbnailWidth: thumbnail.info.width,
    thumbnailHeight: thumbnail.info.height,
    durationMs: Math.round(performance.now() - started),
    memoryBefore: before,
    memoryAfter: after,
    rssDeltaMb: after.rssMb - before.rssMb,
  };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const full = readEnv("ARCH_UPLOAD_BENCHMARK_FULL") === "1";
  const imageCases = full
    ? [
        { label: "2mp-synthetic", width: 2000, height: 1000 },
        { label: "12mp-synthetic", width: 4000, height: 3000 },
        { label: "24mp-synthetic", width: 6000, height: 4000 },
      ]
    : [
        { label: "smoke-0_25mp-synthetic", width: 512, height: 512 },
        { label: "smoke-2mp-synthetic", width: 2000, height: 1000 },
      ];

  const profile = {
    generatedAt,
    mode: "upload-runtime-profile",
    proofBoundary: "local-only",
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    sharp: {
      versions: sharp.versions,
      concurrency: sharp.concurrency(),
      cache: sharp.cache(),
    },
    currentRouteLimits: {
      imageMaxBytes: 12 * 1024 * 1024,
      attachmentMaxBytes: 20 * 1024 * 1024,
      maxImagePixels: 24_000_000,
      maxImageEdge: 1600,
      thumbnailEdge: 512,
      temporaryRateLimitPerMinute: 12,
      temporaryActiveUploadsPerActor: 3,
      temporaryActiveUploadsPerWorkspace: 6,
    },
    hostedRuntime: {
      memoryMb: readEnv("ARCH_UPLOAD_HOSTED_MEMORY_MB") || null,
      cpu: readEnv("ARCH_UPLOAD_HOSTED_CPU") || null,
      bodySizeLimitBytes: readEnv("ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES") || null,
      routeDurationLimitMs: readEnv("ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS") || null,
      storageLatencyP95Ms: readEnv("ARCH_UPLOAD_STORAGE_LATENCY_P95_MS") || null,
    },
    releaseGate: "Hosted memory/body/duration/storage-latency proof is still required before production upload rollout.",
  };

  const benchmarkStarted = performance.now();
  const results = [];
  for (const imageCase of imageCases) {
    results.push(await measureImageCase(imageCase));
  }

  const benchmark = {
    generatedAt,
    mode: "upload-smoke-benchmark",
    proofBoundary: "local-only",
    fullBenchmark: full,
    results,
    totalDurationMs: Math.round(performance.now() - benchmarkStarted),
    passedLocalSmoke: results.every((result) => result.durationMs > 0 && result.optimizedBytes > 0 && result.thumbnailBytes > 0),
    note: "Synthetic local Sharp smoke only. It does not prove hosted memory, request body, route duration, storage latency, or browser upload UX.",
  };

  const benchmarkOutputPath = writeJson(readEnv("ARCH_UPLOAD_BENCHMARK_OUTPUT") || DEFAULT_OUTPUT, benchmark);
  const profileOutputPath = writeJson(readEnv("ARCH_UPLOAD_RUNTIME_PROFILE_OUTPUT") || DEFAULT_PROFILE_OUTPUT, profile);

  console.log(JSON.stringify({
    benchmarkOutputPath,
    profileOutputPath,
    passedLocalSmoke: benchmark.passedLocalSmoke,
    proofBoundary: benchmark.proofBoundary,
  }, null, 2));
  process.exitCode = benchmark.passedLocalSmoke ? 0 : 1;
}

await main();
