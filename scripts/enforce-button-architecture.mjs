import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const repoRoot = process.cwd();
const inventoryPath = resolve(repoRoot, "quality/button-architecture-inventory.json");
const reviewedExceptionsPath = resolve(repoRoot, "quality/button-architecture-reviewed-exceptions.json");
const sourceRoot = resolve(repoRoot, "src");
const sourceExtensions = new Set([".tsx", ".jsx"]);
const ignoredDirectories = new Set([".git", ".next", "node_modules"]);
const allowedDispositions = new Set([
  "BUTTON_PRIMITIVE",
  "SPECIALIZED_SEMANTIC_CONTROL",
  "CONTENT_NAVIGATION_LINK",
  "PUBLIC_SEMANTIC_EXCEPTION",
]);

function walk(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue;
    const absolute = join(directory, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      walk(absolute, files);
      continue;
    }
    if (sourceExtensions.has(extname(entry))) files.push(absolute);
  }
  return files;
}

function normalizeOpeningTag(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*=\s*/g, "=")
    .trim();
}

function fingerprint(value) {
  return createHash("sha256").update(normalizeOpeningTag(value)).digest("hex");
}

function nodeName(node, sourceFile) {
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return node.getText(sourceFile);
  return null;
}

function enclosingSymbol(node, sourceFile) {
  let current = node.parent;
  while (current) {
    if (
      ts.isFunctionDeclaration(current)
      || ts.isMethodDeclaration(current)
      || ts.isGetAccessorDeclaration(current)
      || ts.isSetAccessorDeclaration(current)
      || ts.isClassDeclaration(current)
    ) {
      const name = nodeName(current.name, sourceFile);
      if (name) return name;
    }
    if (ts.isVariableDeclaration(current) || ts.isPropertyAssignment(current)) {
      const name = nodeName(current.name, sourceFile);
      if (name) return name;
    }
    current = current.parent;
  }
  return basename(sourceFile.fileName, extname(sourceFile.fileName));
}

function tagNameText(node, sourceFile) {
  return node.tagName.getText(sourceFile);
}

function isButtonLikeLink(tagName, openingText, nextLinkTags) {
  if (tagName !== "a" && !nextLinkTags.has(tagName)) return false;
  if (!/\bclassName\s*=/.test(openingText)) return false;
  return /(?:inline-flex|\bbg-|\bborder(?:-|\b)|\brounded(?:-|\b)|\bpx-|\bpy-)/.test(openingText)
    || /\b[A-Za-z_$][\w$]*\.[A-Za-z0-9_$]+/.test(openingText)
    || /\bbuttonVariants\s*\(/.test(openingText);
}

export function scanSourceText(path, text) {
  const sourceFile = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const records = [];
  const nextLinkTags = new Set(["Link"]);

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || statement.moduleSpecifier.text !== "next/link") continue;
    const localName = statement.importClause?.name?.text;
    if (localName) nextLinkTags.add(localName);
  }

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = tagNameText(node, sourceFile);
      const openingText = node.getText(sourceFile);
      if (tag === "button" || isButtonLikeLink(tag, openingText, nextLinkTags)) {
        const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        records.push({
          path: path.split("\\").join("/"),
          line: position.line + 1,
          tag,
          symbol: enclosingSymbol(node, sourceFile),
          fingerprint: fingerprint(openingText),
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  const ordinals = new Map();
  return records.map((record) => {
    const ordinalKey = `${record.tag}:${record.symbol}:${record.fingerprint}`;
    const ordinal = (ordinals.get(ordinalKey) ?? 0) + 1;
    ordinals.set(ordinalKey, ordinal);
    return {
      ...record,
      ordinal,
      key: `${record.path}::${record.tag}::${record.symbol}::${record.fingerprint}::${ordinal}`,
    };
  });
}

export function scanRepository(root = sourceRoot) {
  return walk(root)
    .flatMap((absolute) => {
      const path = relative(repoRoot, absolute).split("\\").join("/");
      return scanSourceText(path, readFileSync(absolute, "utf8"));
    })
    .sort((left, right) => left.key.localeCompare(right.key));
}

export function createInventory(records) {
  return {
    schema_version: 1,
    entries: records.map((record) => {
      if (
        record.path === "src/components/ui/button.tsx"
        && ((record.tag === "button" && record.symbol === "Button") || (record.symbol === "ButtonLink" && record.tag === "Link"))
      ) {
        return {
          ...record,
          disposition: "BUTTON_PRIMITIVE",
          reason: `Native DOM implementation of the shared ${record.symbol} primitive.`,
        };
      }
      return {
        ...record,
        disposition: "UNCLASSIFIED",
        reason: "Manual review required; migrate ordinary actions or record a control-specific semantic reason.",
      };
    }),
  };
}

function isSharedButtonPrimitive(entry) {
  return entry.path === "src/components/ui/button.tsx"
    && ((entry.tag === "button" && entry.symbol === "Button") || (entry.tag === "Link" && entry.symbol === "ButtonLink"));
}

export function validateInventory(records, inventory, reviewedExceptions = { entries: [] }) {
  const violations = [];
  const currentByKey = new Map(records.map((record) => [record.key, record]));
  const inventoryByKey = new Map();
  const reviewedByKey = new Map((reviewedExceptions.entries ?? []).map((entry) => [entry.key, entry]));

  for (const entry of inventory.entries ?? []) {
    if (inventoryByKey.has(entry.key)) {
      violations.push(`duplicate inventory key: ${entry.key}`);
      continue;
    }
    inventoryByKey.set(entry.key, entry);
    const hasAllowedDisposition = allowedDispositions.has(entry.disposition);
    if (!hasAllowedDisposition) {
      violations.push(`${entry.path}:${entry.line} has invalid disposition ${entry.disposition}`);
    }
    if (!entry.reason?.trim()) {
      violations.push(`${entry.path}:${entry.line} is missing a disposition reason`);
    }
    if (!hasAllowedDisposition || !currentByKey.has(entry.key)) continue;
    if (entry.disposition === "BUTTON_PRIMITIVE") {
      if (!isSharedButtonPrimitive(entry)) {
        violations.push(`${entry.path}:${entry.line} claims BUTTON_PRIMITIVE outside the shared primitives`);
      }
      continue;
    }
    const reviewed = reviewedByKey.get(entry.key);
    if (!reviewed) {
      violations.push(`${entry.path}:${entry.line} introduces an unreviewed ${entry.disposition} exception`);
      continue;
    }
    if (reviewed.disposition !== entry.disposition || reviewed.reason !== entry.reason) {
      violations.push(`${entry.path}:${entry.line} changes a reviewed exception without updating its baseline`);
    }
  }

  for (const record of records) {
    if (!inventoryByKey.has(record.key)) {
      violations.push(`${record.path}:${record.line} has an unclassified raw ${record.tag} in ${record.symbol}`);
    }
  }

  for (const entry of inventory.entries ?? []) {
    if (!currentByKey.has(entry.key)) {
      violations.push(`${entry.path}:${entry.line} inventory fingerprint is stale or the control was migrated`);
    }
  }

  for (const reviewed of reviewedExceptions.entries ?? []) {
    if (!inventoryByKey.has(reviewed.key)) {
      violations.push(`${reviewed.path}:${reviewed.line} reviewed exception is stale or was migrated`);
    }
  }

  return violations;
}

function runCli() {
  const records = scanRepository();
  if (process.argv.includes("--print")) {
    process.stdout.write(`${JSON.stringify(createInventory(records), null, 2)}\n`);
    return;
  }

  const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));
  const reviewedExceptions = JSON.parse(readFileSync(reviewedExceptionsPath, "utf8"));
  const violations = validateInventory(records, inventory, reviewedExceptions);
  if (violations.length) {
    console.error("Button architecture enforcement failed.");
    console.error(violations.join("\n"));
    process.exit(1);
  }
  console.log(`Button architecture enforcement passed (${records.length} classified occurrences).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
