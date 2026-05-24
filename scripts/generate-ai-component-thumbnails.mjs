#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const COMPONENT_IMAGE_BUCKET = "component-images";
const STORAGE_PREFIX = "ai-component-thumbnails/v1";
const FULL_EDGE = 1600;
const THUMB_EDGE = 512;
const DEFAULT_MODEL = "gpt-image-1";
const DEFAULT_SIZE = "1024x1024";
const DEFAULT_QUALITY = "low";
const AI_SOURCE = "ai-generated-product-resemblance";
const PROMPT_VERSION = "v1";
const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const MAX_PROMPT_CHARS = 1900;
const OUTPUT_DIR = ".ai/05_logs/component-thumbnail-generation";

const GENERIC_BRAND_WORDS = new Set([
  "american", "standard", "franke", "grohe", "hafele", "hettich", "kohler", "kuysen", "lixil", "miele", "toshiba", "wilcon",
  "philippines", "depot", "home", "hardware", "furniture", "appliance", "appliances", "plus", "inc", "corp", "corporation", "co", "ltd",
]);

const CATEGORY_VISUAL_HINTS = [
  { test: /light|lamp|led|switch|outlet|electrical|alarm|detector|speaker|camera/i, hint: "electrical, lighting, or low-voltage device product render" },
  { test: /fire|sprinkler|extinguisher|safety|emergency/i, hint: "fire protection or life safety building component" },
  { test: /faucet|mixer|tap|lavatory|basin|sink|shower|toilet|bidet|closet|urinal|plumbing|sanitary/i, hint: "bathroom or kitchen plumbing fixture, polished ceramic or chrome where appropriate" },
  { test: /door|lock|hinge|handle|hardware/i, hint: "architectural door or cabinet hardware, crisp product render" },
  { test: /window|glass|glazing|frame/i, hint: "architectural window or glazing component, clean profile view" },
  { test: /tile|floor|paint|veneer|stone|finish|laminate|wallpaper|cladding/i, hint: "building finish material sample, swatch or installed corner detail" },
  { test: /sofa|chair|table|bed|cabinet|wardrobe|shelf|furniture|stool|bench/i, hint: "interior furniture object, neutral product render" },
  { test: /oven|cooktop|range|refrigerator|washer|dryer|hood|dishwasher|appliance/i, hint: "home appliance product render, clean freestanding object" },
  { test: /concrete|rebar|steel|lumber|plywood|gypsum|cement|block|board|material/i, hint: "construction material sample, stacked or section-cut representation" },
];

function parseArgs(argv) {
  const args = {
    apply: false,
    dryRun: false,
    force: false,
    limit: null,
    offset: 0,
    ids: [],
    includeSeeded: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") args.apply = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--force") args.force = true;
    else if (arg === "--only-missing") args.includeSeeded = false;
    else if (arg === "--limit") args.limit = Number(argv[++index]);
    else if (arg.startsWith("--limit=")) args.limit = Number(arg.split("=")[1]);
    else if (arg === "--offset") args.offset = Number(argv[++index]);
    else if (arg.startsWith("--offset=")) args.offset = Number(arg.split("=")[1]);
    else if (arg === "--id") args.ids.push(argv[++index]);
    else if (arg.startsWith("--id=")) args.ids.push(arg.split("=")[1]);
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.apply) args.dryRun = true;
  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit < 1)) throw new Error("--limit must be a positive integer.");
  if (!Number.isInteger(args.offset) || args.offset < 0) throw new Error("--offset must be a non-negative integer.");
  return args;
}

function printHelp() {
  console.log(`Generate AI product-resemblance thumbnails for Supabase component library items.\n\nUsage:\n  bun scripts/generate-ai-component-thumbnails.mjs --dry-run --limit 10\n  bun scripts/generate-ai-component-thumbnails.mjs --apply --limit 10\n  bun scripts/generate-ai-component-thumbnails.mjs --apply --force --id <uuid>\n\nRequired for --apply:\n  OPENAI_API_KEY\n  NEXT_PUBLIC_SUPABASE_URL\n  SUPABASE_SERVICE_ROLE_KEY\n\nOptional:\n  OPENAI_IMAGE_MODEL      default ${DEFAULT_MODEL}\n  OPENAI_IMAGE_SIZE       default ${DEFAULT_SIZE}\n  OPENAI_IMAGE_QUALITY    default ${DEFAULT_QUALITY}\n`);
}

function loadDotEnvLocal() {
  const path = ".env.local";
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "component";
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function brandWords(item) {
  const words = new Set(GENERIC_BRAND_WORDS);
  for (const value of [item.brand, item.supplier]) {
    for (const word of cleanText(value).toLowerCase().split(/[^a-z0-9]+/)) {
      if (word.length >= 3) words.add(word);
    }
  }
  return words;
}

function removeBrandLanguage(value, item) {
  const words = brandWords(item);
  return cleanText(value)
    .split(/\s+/)
    .filter((word) => !words.has(word.toLowerCase().replace(/[^a-z0-9]/g, "")))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function visualHintFor(item) {
  const haystack = [item.name, item.description, item.category, item.kind, item.unit].map(cleanText).join(" | ");
  return CATEGORY_VISUAL_HINTS.find((entry) => entry.test.test(haystack))?.hint ?? "construction estimating library component, product-style object or material sample";
}

function buildPrompt(item) {
  const displayName = removeBrandLanguage(item.name, item) || cleanText(item.name);
  const description = removeBrandLanguage(item.description, item);
  const category = cleanText(item.category) || "Construction component";
  const kind = cleanText(item.kind) || "component";
  const unit = cleanText(item.unit);
  const visualHint = visualHintFor(item);

  const prompt = `Create one distinct, realistic but non-branded product thumbnail for a construction cost-estimating component.\n\nComponent: ${displayName}\nCategory: ${category}\nKind: ${kind}${unit ? `\nUnit: ${unit}` : ""}${description ? `\nShort description: ${description}` : ""}\nVisual direction: ${visualHint}.\n\nStyle requirements:\n- clean studio product render or high-quality product illustration, not a catalog copy\n- centered object or material sample on a warm off-white background\n- 3/4 view when useful; recognizable silhouette and material details\n- no people, no rooms unless a small context surface is needed\n- no text, no captions, no logos, no brand marks, no watermarks, no packaging\n- do not recreate any exact manufacturer photo; make a generic product-resemblance image\n- square composition with enough padding for a 40px UI thumbnail`;

  return prompt.slice(0, MAX_PROMPT_CHARS);
}

function promptHash(prompt) {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function isAiGenerated(item) {
  return item.metadata?.imageSource === AI_SOURCE;
}

function shouldProcess(item, args) {
  if (args.ids.length > 0 && !args.ids.includes(item.id)) return false;
  if (!args.force && isAiGenerated(item)) return false;
  if (!args.includeSeeded && item.thumbnail_path) return false;
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

async function generateImageBuffer(prompt) {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
  const size = process.env.OPENAI_IMAGE_SIZE?.trim() || DEFAULT_SIZE;
  const quality = process.env.OPENAI_IMAGE_QUALITY?.trim() || DEFAULT_QUALITY;

  const response = await fetch(OPENAI_IMAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      quality,
      n: 1,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI image request failed with status ${response.status}`;
    throw new Error(message);
  }

  const image = payload?.data?.[0];
  if (image?.b64_json) return Buffer.from(image.b64_json, "base64");
  if (image?.url) {
    const imageResponse = await fetch(image.url);
    if (!imageResponse.ok) throw new Error(`Could not download generated image: ${imageResponse.status}`);
    return Buffer.from(await imageResponse.arrayBuffer());
  }

  throw new Error("OpenAI image response did not include image data.");
}

async function optimizeImage(sourceBuffer) {
  const full = await sharp(sourceBuffer, { failOn: "warning", limitInputPixels: 24_000_000 })
    .rotate()
    .resize({ width: FULL_EDGE, height: FULL_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  const thumb = await sharp(sourceBuffer, { failOn: "warning", limitInputPixels: 24_000_000 })
    .rotate()
    .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  return { full, thumb };
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

async function updateItemImage(supabase, item, image) {
  const metadata = {
    ...(item.metadata ?? {}),
    imageSource: AI_SOURCE,
    imageSourceNote: "AI-generated generic product-resemblance thumbnail. Not a manufacturer catalog photo; no logos or brand marks requested.",
    imagePromptVersion: PROMPT_VERSION,
    imagePromptHash: image.promptHash,
    imageModel: image.model,
    imageObjectPath: image.fullPath,
    imageThumbnailPath: image.thumbPath,
    imageUrl: image.fullUrl,
    previousThumbnailPath: item.thumbnail_path ?? null,
    imageGeneratedAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("cost_library_items")
    .update({ thumbnail_path: image.thumbUrl, metadata })
    .eq("id", item.id);

  if (error) throw new Error("Could not update cost_library_items image metadata.");
}

function writeAudit(record) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const path = join(OUTPUT_DIR, `ai-component-thumbnails-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
  return path;
}

async function main() {
  loadDotEnvLocal();
  const args = parseArgs(process.argv.slice(2));
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (args.apply) requireEnv("OPENAI_API_KEY");

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "archestimator-ai-component-thumbnails" } },
  });

  const loaded = await fetchItems(supabase, args);
  const selected = loaded.filter((item) => shouldProcess(item, args));
  const model = process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
  const run = {
    mode: args.apply ? "apply" : "dry-run",
    source: AI_SOURCE,
    promptVersion: PROMPT_VERSION,
    model,
    storagePrefix: STORAGE_PREFIX,
    loadedRows: loaded.length,
    selectedRows: selected.length,
    updatedRows: 0,
    uploadedObjects: 0,
    skippedRows: loaded.length - selected.length,
    failures: [],
    items: [],
  };

  for (const item of selected) {
    const prompt = buildPrompt(item);
    const hash = promptHash(prompt);
    const itemRecord = {
      id: item.id,
      name: item.name,
      category: item.category,
      sourceBefore: item.metadata?.imageSource ?? null,
      promptHash: hash,
      prompt,
    };

    if (args.dryRun) {
      run.items.push(itemRecord);
      continue;
    }

    const base = `${STORAGE_PREFIX}/${item.workspace_id}/${slugify(item.name)}-${item.id.slice(0, 8)}-${randomUUID().slice(0, 8)}`;
    const fullPath = `${base}.webp`;
    const thumbPath = `${base}-thumb.webp`;
    const uploadedPaths = [];

    try {
      const generated = await generateImageBuffer(prompt);
      const optimized = await optimizeImage(generated);
      const fullUrl = await uploadWebp(supabase, fullPath, optimized.full.data);
      uploadedPaths.push(fullPath);
      const thumbUrl = await uploadWebp(supabase, thumbPath, optimized.thumb.data);
      uploadedPaths.push(thumbPath);
      await updateItemImage(supabase, item, {
        model,
        promptHash: hash,
        fullPath,
        thumbPath,
        fullUrl,
        thumbUrl,
      });

      run.updatedRows += 1;
      run.uploadedObjects += uploadedPaths.length;
      run.items.push({
        ...itemRecord,
        fullPath,
        thumbPath,
        fullWidth: optimized.full.info.width,
        fullHeight: optimized.full.info.height,
        thumbWidth: optimized.thumb.info.width,
        thumbHeight: optimized.thumb.info.height,
      });
      console.log(JSON.stringify({ status: "updated", id: item.id, name: item.name, updatedRows: run.updatedRows }));
    } catch (error) {
      if (uploadedPaths.length > 0) await supabase.storage.from(COMPONENT_IMAGE_BUCKET).remove(uploadedPaths).catch(() => undefined);
      const message = error instanceof Error ? error.message : String(error);
      run.failures.push({ id: item.id, name: item.name, message });
      console.error(JSON.stringify({ status: "failed", id: item.id, name: item.name, message }));
    }
  }

  const auditPath = writeAudit(run);
  console.log(JSON.stringify({ ...run, items: undefined, auditPath }, null, 2));

  if (run.failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
