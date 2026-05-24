#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const COMPONENT_IMAGE_BUCKET = "component-images";
const STORAGE_PREFIX = "internet-component-thumbnails/v1";
const IMAGE_SOURCE = "internet-seed-reference-thumbnail";
const SEARCH_PROVIDER = "duckduckgo-images";
const FULL_EDGE = 1600;
const THUMB_EDGE = 512;
const OUTPUT_DIR = ".ai/05_logs/component-thumbnail-generation";
const REQUEST_TIMEOUT_MS = 20_000;
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36";

function parseArgs(argv) {
  const args = { apply: false, dryRun: false, force: false, limit: null, offset: 0, ids: [], pageSize: 20 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--limit") args.limit = Number(argv[++index]);
    else if (arg.startsWith("--limit=")) args.limit = Number(arg.split("=")[1]);
    else if (arg === "--offset") args.offset = Number(argv[++index]);
    else if (arg.startsWith("--offset=")) args.offset = Number(arg.split("=")[1]);
    else if (arg === "--id") args.ids.push(argv[++index]);
    else if (arg.startsWith("--id=")) args.ids.push(arg.split("=")[1]);
    else if (arg === "--page-size") args.pageSize = Number(argv[++index]);
    else if (arg.startsWith("--page-size=")) args.pageSize = Number(arg.split("=")[1]);
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.apply) args.dryRun = true;
  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit < 1)) throw new Error("--limit must be a positive integer.");
  if (!Number.isInteger(args.offset) || args.offset < 0) throw new Error("--offset must be a non-negative integer.");
  if (!Number.isInteger(args.pageSize) || args.pageSize < 1 || args.pageSize > 100) throw new Error("--page-size must be 1-100.");
  return args;
}

function printHelp() {
  console.log(`Seed product-like thumbnails from internet image search.\n\nUsage:\n  bun run component-images:internet-thumbnails -- --dry-run --limit 10\n  bun run component-images:internet-thumbnails -- --apply --limit 10\n  bun run component-images:internet-thumbnails -- --apply --force --id <uuid>\n\nRequired:\n  NEXT_PUBLIC_SUPABASE_URL\n  SUPABASE_SERVICE_ROLE_KEY\n\nNotes:\n  This is intentionally simple seed-data tooling: search image thumbnails, convert to WebP, upload to Supabase, record source/landing URL metadata, and sync existing seed estimate row snapshot thumbnails so the estimate sheet does not keep stale placeholder images.\n`);
}

function loadDotEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function cleanText(value) {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "component";
}

function buildQuery(item) {
  return [cleanText(item.name), cleanText(item.category), "product thumbnail"].filter(Boolean).join(" ");
}

function shouldProcess(item, args) {
  if (args.ids.length > 0 && !args.ids.includes(item.id)) return false;
  if (!args.force && item.metadata?.imageSource === IMAGE_SOURCE) return false;
  return true;
}

async function fetchItems(supabase, args) {
  let query = supabase
    .from("cost_library_items")
    .select("id, workspace_id, kind, name, description, category, supplier, brand, unit, thumbnail_path, metadata")
    .order("name", { ascending: true });
  if (args.ids.length > 0) query = query.in("id", args.ids);
  if (args.limit !== null) query = query.range(args.offset, args.offset + args.limit - 1);
  else if (args.offset > 0) query = query.range(args.offset, args.offset + 9999);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load cost library items: ${error.message}`);
  return data ?? [];
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal, headers: { "User-Agent": USER_AGENT, ...(options.headers ?? {}) } });
  } finally {
    clearTimeout(timeout);
  }
}

async function searchDuckDuckGoImages(query, pageSize) {
  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
  const pageResponse = await fetchWithTimeout(searchUrl, { headers: { Accept: "text/html" } });
  const pageText = await pageResponse.text();
  const token = pageText.match(/vqd=['"]?([^'"&]+)['"]?/)?.[1] ?? pageText.match(/"vqd":"([^"]+)"/)?.[1];
  if (!token) throw new Error("DuckDuckGo image token not found.");

  const params = new URLSearchParams({ l: "us-en", o: "json", q: query, vqd: token, f: ",,,", p: "1" });
  const imageResponse = await fetchWithTimeout(`https://duckduckgo.com/i.js?${params.toString()}`, {
    headers: { Accept: "application/json", Referer: "https://duckduckgo.com/" },
  });
  if (!imageResponse.ok) throw new Error(`DuckDuckGo image search failed: ${imageResponse.status}`);
  const payload = await imageResponse.json();
  return (payload.results ?? [])
    .filter((candidate) => candidate?.thumbnail || candidate?.image)
    .slice(0, pageSize)
    .map((candidate) => ({
      title: cleanText(candidate.title),
      imageUrl: candidate.image,
      thumbnailUrl: candidate.thumbnail,
      landingUrl: candidate.url,
      source: candidate.source,
      height: candidate.height,
      width: candidate.width,
    }));
}

async function findCandidates(item, pageSize) {
  const query = buildQuery(item);
  const candidates = await searchDuckDuckGoImages(query, pageSize);
  return { query, candidates };
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function averageHash(buffer) {
  const raw = await sharp(buffer).resize(8, 8, { fit: "fill" }).greyscale().raw().toBuffer();
  const avg = [...raw].reduce((sum, value) => sum + value, 0) / raw.length;
  return [...raw].map((value) => (value > avg ? "1" : "0")).join("");
}

async function downloadImage(candidate) {
  const urls = [candidate.imageUrl, candidate.thumbnailUrl].filter(Boolean);
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, { headers: { Accept: "image/*,*/*;q=0.8" } });
      if (!response.ok) throw new Error(`download status ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength < 256) throw new Error("downloaded image too small");
      return buffer;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("No downloadable image URL.");
}

async function optimizeImage(sourceBuffer) {
  const metadata = await sharp(sourceBuffer, { failOn: "warning", limitInputPixels: 32_000_000 }).metadata();
  if (!metadata.width || !metadata.height) throw new Error("Could not read downloaded image dimensions.");
  const full = await sharp(sourceBuffer, { failOn: "warning", limitInputPixels: 32_000_000 })
    .rotate()
    .resize({ width: FULL_EDGE, height: FULL_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await sharp(sourceBuffer, { failOn: "warning", limitInputPixels: 32_000_000 })
    .rotate()
    .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  return { full, thumb, sourceWidth: metadata.width, sourceHeight: metadata.height, sourceFormat: metadata.format };
}

async function uploadWebp(supabase, path, buffer) {
  const { error } = await supabase.storage.from(COMPONENT_IMAGE_BUCKET).upload(path, buffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error(`Could not upload ${basename(path)}.`);
  return supabase.storage.from(COMPONENT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

function buildMetadata(item, candidate, query, fullPath, thumbPath, fullUrl, thumbUrl, imageFingerprint) {
  return {
    ...(item.metadata ?? {}),
    imageSource: IMAGE_SOURCE,
    imageSourceNote: "Internet reference thumbnail for seed/demo data. Not a verified manufacturer catalog image.",
    imageSearchProvider: SEARCH_PROVIDER,
    imageSearchQuery: query,
    imageTitle: candidate.title ?? null,
    imageSourceUrl: candidate.imageUrl ?? null,
    imageThumbnailSourceUrl: candidate.thumbnailUrl ?? null,
    imageForeignLandingUrl: candidate.landingUrl ?? null,
    imageOriginSource: candidate.source ?? null,
    imageObjectPath: fullPath,
    imageThumbnailPath: thumbPath,
    imageUrl: fullUrl,
    imageThumbnailUrl: thumbUrl,
    imageDownloadedSha256: imageFingerprint.sha256,
    imageAverageHash: imageFingerprint.averageHash,
    previousThumbnailPath: item.thumbnail_path ?? null,
    imageFetchedAt: new Date().toISOString(),
  };
}

async function updateItemImage(supabase, item, metadata, thumbUrl) {
  const { error } = await supabase.from("cost_library_items").update({ thumbnail_path: thumbUrl, metadata }).eq("id", item.id);
  if (error) throw new Error("Could not update cost_library_items image metadata.");
}

function estimateRowSourceId(row) {
  return row.source_library_item_id ?? row.metadata?.sourceComponentId ?? row.source_snapshot?.sourceLibraryItemId ?? row.source_snapshot?.imageSyncedFromLibraryItemId ?? null;
}

async function syncEstimateSnapshotImages(supabase, itemIds) {
  if (itemIds.length === 0) return 0;
  const { data: items, error: itemError } = await supabase
    .from("cost_library_items")
    .select("id, thumbnail_path, metadata")
    .in("id", itemIds);
  if (itemError) throw new Error("Could not reload cost library thumbnails for estimate snapshot sync.");

  const thumbnailByItemId = new Map(
    (items ?? [])
      .filter((item) => item.thumbnail_path)
      .map((item) => [item.id, { thumbnailPath: item.thumbnail_path, imageSource: item.metadata?.imageSource ?? null }]),
  );
  if (thumbnailByItemId.size === 0) return 0;

  const { data: rows, error: rowError } = await supabase
    .from("estimate_row_items")
    .select("id, source_library_item_id, source_snapshot, metadata");
  if (rowError) throw new Error("Could not load estimate row snapshots for image sync.");

  let syncedRows = 0;
  const syncedAt = new Date().toISOString();
  for (const row of rows ?? []) {
    const sourceId = estimateRowSourceId(row);
    const image = sourceId ? thumbnailByItemId.get(sourceId) : null;
    if (!image || !row.source_snapshot || typeof row.source_snapshot !== "object") continue;
    if (row.source_snapshot.imageUrl === image.thumbnailPath) continue;

    const nextSnapshot = {
      ...row.source_snapshot,
      imageUrl: image.thumbnailPath,
      imageSource: image.imageSource ?? row.source_snapshot.imageSource ?? null,
      imageSyncedFromLibraryItemId: sourceId,
      previousImageUrl: row.source_snapshot.imageUrl ?? null,
      imageSyncedAt: syncedAt,
    };
    const { error } = await supabase.from("estimate_row_items").update({ source_snapshot: nextSnapshot }).eq("id", row.id);
    if (error) throw new Error("Could not sync estimate row snapshot thumbnail.");
    syncedRows += 1;
  }
  return syncedRows;
}

function writeAudit(record) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const path = join(OUTPUT_DIR, `internet-component-thumbnails-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
  return path;
}

async function main() {
  loadDotEnvLocal();
  const args = parseArgs(process.argv.slice(2));
  const supabase = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "archestimator-internet-component-thumbnails" } },
  });

  const loaded = await fetchItems(supabase, args);
  const selected = loaded.filter((item) => shouldProcess(item, args));
  const usedUrls = new Set(
    loaded.flatMap((item) => [item.metadata?.imageThumbnailSourceUrl, item.metadata?.imageSourceUrl]).filter(Boolean),
  );
  const usedImageHashes = new Set(
    loaded.flatMap((item) => [item.metadata?.imageDownloadedSha256, item.metadata?.imageAverageHash]).filter(Boolean),
  );
  const run = {
    mode: args.apply ? "apply" : "dry-run",
    source: IMAGE_SOURCE,
    searchProvider: SEARCH_PROVIDER,
    storagePrefix: STORAGE_PREFIX,
    loadedRows: loaded.length,
    selectedRows: selected.length,
    updatedRows: 0,
    uploadedObjects: 0,
    syncedEstimateRows: 0,
    skippedRows: loaded.length - selected.length,
    failures: [],
    items: [],
  };

  for (const item of selected) {
    try {
      const { query, candidates } = await findCandidates(item, args.pageSize);
      const freshCandidates = candidates.filter((candidate) => !usedUrls.has(candidate.thumbnailUrl ?? candidate.imageUrl));
      const firstCandidate = freshCandidates[0];
      if (!firstCandidate) throw new Error("No internet image candidate found.");

      if (args.dryRun) {
        const itemRecord = { id: item.id, name: item.name, category: item.category, query, ...firstCandidate };
        run.items.push(itemRecord);
        usedUrls.add(firstCandidate.thumbnailUrl ?? firstCandidate.imageUrl);
        console.log(JSON.stringify({ status: "candidate", id: item.id, name: item.name, title: firstCandidate.title }));
        continue;
      }

      let selectedCandidate = null;
      let downloaded = null;
      let imageFingerprint = null;
      let duplicateCount = 0;
      for (const candidate of freshCandidates) {
        const candidateUrl = candidate.thumbnailUrl ?? candidate.imageUrl;
        if (usedUrls.has(candidateUrl)) continue;
        try {
          const candidateBuffer = await downloadImage(candidate);
          const exactHash = sha256(candidateBuffer);
          const perceptualHash = await averageHash(candidateBuffer);
          if (usedImageHashes.has(exactHash) || usedImageHashes.has(perceptualHash)) {
            duplicateCount += 1;
            usedUrls.add(candidateUrl);
            continue;
          }
          selectedCandidate = candidate;
          downloaded = candidateBuffer;
          imageFingerprint = { sha256: exactHash, averageHash: perceptualHash };
          usedUrls.add(candidateUrl);
          usedImageHashes.add(exactHash);
          usedImageHashes.add(perceptualHash);
          break;
        } catch {
          usedUrls.add(candidateUrl);
        }
      }
      if (!selectedCandidate || !downloaded || !imageFingerprint) {
        throw new Error(`No unique downloadable image candidate found (${duplicateCount} duplicate image candidates skipped).`);
      }

      const itemRecord = { id: item.id, name: item.name, category: item.category, query, ...selectedCandidate };
      const base = `${STORAGE_PREFIX}/${item.workspace_id}/${slugify(item.name)}-${item.id.slice(0, 8)}-${randomUUID().slice(0, 8)}`;
      const fullPath = `${base}.webp`;
      const thumbPath = `${base}-thumb.webp`;
      const uploadedPaths = [];
      try {
        const optimized = await optimizeImage(downloaded);
        const fullUrl = await uploadWebp(supabase, fullPath, optimized.full.data);
        uploadedPaths.push(fullPath);
        const thumbUrl = await uploadWebp(supabase, thumbPath, optimized.thumb.data);
        uploadedPaths.push(thumbPath);
        await updateItemImage(supabase, item, buildMetadata(item, selectedCandidate, query, fullPath, thumbPath, fullUrl, thumbUrl, imageFingerprint), thumbUrl);
        run.updatedRows += 1;
        run.uploadedObjects += 2;
        run.items.push({ ...itemRecord, fullPath, thumbPath, sourceWidth: optimized.sourceWidth, sourceHeight: optimized.sourceHeight, sourceFormat: optimized.sourceFormat, thumbWidth: optimized.thumb.info.width, thumbHeight: optimized.thumb.info.height });
        console.log(JSON.stringify({ status: "updated", id: item.id, name: item.name, title: selectedCandidate.title, updatedRows: run.updatedRows }));
      } catch (error) {
        if (uploadedPaths.length > 0) await supabase.storage.from(COMPONENT_IMAGE_BUCKET).remove(uploadedPaths).catch(() => undefined);
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      run.failures.push({ id: item.id, name: item.name, message });
      console.error(JSON.stringify({ status: "failed", id: item.id, name: item.name, message }));
    }
  }

  if (args.apply) {
    run.syncedEstimateRows = await syncEstimateSnapshotImages(supabase, loaded.map((item) => item.id));
  }

  const auditPath = writeAudit(run);
  console.log(JSON.stringify({ ...run, items: undefined, auditPath }, null, 2));
  if (args.apply && run.failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
