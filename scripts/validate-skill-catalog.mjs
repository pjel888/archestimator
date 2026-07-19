import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import yaml from "js-yaml";

const projectRoot = process.cwd();
const homeRoot = os.homedir();
const projectCatalog = path.join(projectRoot, ".agents", "skills");
const globalCatalog = path.join(homeRoot, ".agents", "skills");
const errors = [];

const expectedProjectSkills = new Set([
  "archestimator-cloudflare-config-drift",
  "archestimator-d1-migration-lifecycle",
  "archestimator-design",
  "archestimator-estimate-mutation-integrity",
  "archestimator-form-alignment",
  "archestimator-next-cloudflare-compatibility",
  "archestimator-performance-change",
  "archestimator-plan-pack",
  "debug-issue",
  "explore-codebase",
  "gitnexus",
  "impeccable",
  "react-doctor",
  "refactor-safely",
  "review-changes",
]);

const metadataRequiredProjectSkills = new Set([
  "archestimator-cloudflare-config-drift",
  "archestimator-d1-migration-lifecycle",
  "archestimator-design",
  "archestimator-estimate-mutation-integrity",
  "archestimator-form-alignment",
  "archestimator-next-cloudflare-compatibility",
  "archestimator-performance-change",
]);

const expectedManualGlobalSkills = new Set(["ian-xiaohei-illustrations", "kimi-webbridge"]);

function isHostPluginSkill(name) {
  return name === "lfg" || name.startsWith("ce-");
}

const projectEmptyRoots = [
  ".codex/skills",
  ".cursor/skills",
  ".cursor/.agents/skills",
  ".github/skills",
].map((relativePath) => path.join(projectRoot, relativePath));

const projectLinkRoots = [".claude/skills", ".commandcode/skills", ".vibe/skills"].map(
  (relativePath) => path.join(projectRoot, relativePath),
);

const globalCompatibilityRoots = [
  [".codex/skills", "remove"],
  [".codex/.agents/skills", "remove"],
  [".claude/skills", "link"],
  [".commandcode/skills", "link"],
  [".cursor/skills", "link"],
  [".cursor/skills-cursor", "link"],
  [".cursor/ecc/skills", "link"],
  [".opencode/skills", "link"],
  [".config/opencode/skills", "link"],
  [".kimi-code/skills", "link"],
  [".openclaw/skills", "link"],
  [".hermes/skills", "link"],
  [".vibe/skills", "link"],
].map(([relativePath, duplicateMode]) => ({
  duplicateMode,
  root: path.join(homeRoot, relativePath),
}));

function skillName(skillPath) {
  const source = fs.readFileSync(path.join(skillPath, "SKILL.md"), "utf8");
  return (source.match(/^name:\s*["']?([^\n"']+)/m)?.[1] ?? path.basename(skillPath)).trim();
}

function filesRecursively(root, predicate) {
  if (!fs.existsSync(root)) return [];

  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...filesRecursively(entryPath, predicate));
    } else if (entry.isFile() && predicate(entryPath)) {
      files.push(entryPath);
    }
  }
  return files;
}

function parseYaml(source, label) {
  try {
    return yaml.load(source);
  } catch (error) {
    errors.push(`${label}: invalid YAML: ${error.message}`);
    return null;
  }
}

function parseSkillFrontmatter(skillFile) {
  const source = fs.readFileSync(skillFile, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    errors.push(`project skill: missing YAML frontmatter at ${skillFile}`);
    return null;
  }

  const frontmatter = parseYaml(match[1], `project skill ${skillFile}`);
  if (!frontmatter || typeof frontmatter !== "object" || Array.isArray(frontmatter)) {
    errors.push(`project skill: frontmatter must be a mapping at ${skillFile}`);
    return null;
  }

  const keys = Object.keys(frontmatter).sort();
  const expectedKeys = ["description", "name"];
  if (keys.join("\0") !== expectedKeys.join("\0")) {
    errors.push(
      `project skill: frontmatter must contain only name and description at ${skillFile}; received ${keys.join(", ") || "no keys"}`,
    );
  }
  if (typeof frontmatter.name !== "string" || frontmatter.name.trim() === "") {
    errors.push(`project skill: name must be a non-empty string at ${skillFile}`);
  }
  if (typeof frontmatter.description !== "string" || frontmatter.description.trim() === "") {
    errors.push(`project skill: description must be a non-empty string at ${skillFile}`);
  }

  return frontmatter;
}

function validateProjectSkillFiles() {
  const skillFiles = filesRecursively(projectCatalog, (filePath) => path.basename(filePath) === "SKILL.md");
  const names = new Map();

  for (const skillFile of skillFiles) {
    const frontmatter = parseSkillFrontmatter(skillFile);
    if (!frontmatter || typeof frontmatter.name !== "string") continue;

    const name = frontmatter.name.trim();
    const directory = path.basename(path.dirname(skillFile));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      errors.push(`project skill: invalid skill name ${JSON.stringify(name)} at ${skillFile}`);
    }
    if (directory !== name) {
      errors.push(`project skill: directory ${directory} does not match logical name ${name}`);
    }

    const paths = names.get(name) ?? [];
    paths.push(skillFile);
    names.set(name, paths);
  }

  for (const [name, paths] of names) {
    if (paths.length > 1) errors.push(`project skill: duplicate logical name ${name}: ${paths.join(", ")}`);
  }

  return skillFiles;
}

function markdownLinkTarget(rawTarget) {
  const target = rawTarget.trim();
  if (target.startsWith("<")) {
    const end = target.indexOf(">");
    return end === -1 ? target : target.slice(1, end);
  }
  return target.match(/^\S+/)?.[0] ?? "";
}

function validateMarkdownLinks() {
  const markdownFiles = filesRecursively(projectCatalog, (filePath) => filePath.endsWith(".md"));
  const linkPattern = /!?\[[^\]]*\]\(([^)\n]+)\)/g;

  for (const markdownFile of markdownFiles) {
    const source = fs.readFileSync(markdownFile, "utf8");
    for (const match of source.matchAll(linkPattern)) {
      const rawTarget = markdownLinkTarget(match[1]);
      if (!rawTarget || rawTarget.startsWith("#") || rawTarget.startsWith("/")) continue;
      if (/^[a-z][a-z0-9+.-]*:/i.test(rawTarget)) continue;

      const withoutFragment = rawTarget.split("#", 1)[0].split("?", 1)[0];
      if (!withoutFragment) continue;

      let decodedTarget;
      try {
        decodedTarget = decodeURIComponent(withoutFragment);
      } catch {
        errors.push(`project skill: invalid encoded Markdown link ${rawTarget} at ${markdownFile}`);
        continue;
      }

      const resolved = path.resolve(path.dirname(markdownFile), decodedTarget);
      if (!fs.existsSync(resolved)) {
        errors.push(`project skill: unresolved Markdown link ${rawTarget} at ${markdownFile}`);
      }
    }
  }
}

function normalizedDisplayName(displayName) {
  return displayName
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function validateProjectSkillMetadata() {
  for (const name of metadataRequiredProjectSkills) {
    const metadataPath = path.join(projectCatalog, name, "agents", "openai.yaml");
    if (!fs.existsSync(metadataPath)) {
      errors.push(`project skill metadata: missing ${metadataPath}`);
      continue;
    }

    const source = fs.readFileSync(metadataPath, "utf8");
    const metadata = parseYaml(source, `project skill metadata ${metadataPath}`);
    const skillInterface = metadata?.interface;
    if (!skillInterface || typeof skillInterface !== "object" || Array.isArray(skillInterface)) {
      errors.push(`project skill metadata: missing interface mapping at ${metadataPath}`);
      continue;
    }

    for (const field of ["display_name", "short_description", "default_prompt"]) {
      if (typeof skillInterface[field] !== "string" || skillInterface[field].trim() === "") {
        errors.push(`project skill metadata: interface.${field} must be a non-empty string at ${metadataPath}`);
      }
      const quotedField = new RegExp(`^  ${field}:\\s*["']`, "m");
      if (!quotedField.test(source)) {
        errors.push(`project skill metadata: interface.${field} must be quoted at ${metadataPath}`);
      }
    }

    if (
      typeof skillInterface.display_name === "string" &&
      normalizedDisplayName(skillInterface.display_name) !== name
    ) {
      errors.push(`project skill metadata: display_name does not match ${name} at ${metadataPath}`);
    }
    if (
      typeof skillInterface.short_description === "string" &&
      (skillInterface.short_description.length < 25 || skillInterface.short_description.length > 64)
    ) {
      errors.push(`project skill metadata: short_description must be 25-64 characters at ${metadataPath}`);
    }
    if (typeof skillInterface.default_prompt === "string") {
      const invocation = new RegExp(`\\$${name}(?![a-z0-9-])`);
      if (!invocation.test(skillInterface.default_prompt)) {
        errors.push(`project skill metadata: default_prompt must mention \"$${name}\" at ${metadataPath}`);
      }
    }
  }
}

function skillEntries(root) {
  if (!fs.existsSync(root)) return [];

  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => fs.existsSync(path.join(root, entry.name, "SKILL.md")))
    .map((entry) => {
      const skillPath = path.join(root, entry.name);
      return { directory: entry.name, name: skillName(skillPath), path: skillPath };
    });
}

function validateCatalog(root, label, { exactDirectories = true } = {}) {
  const entries = skillEntries(root);
  const names = new Map();

  for (const entry of entries) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name)) {
      errors.push(`${label}: invalid skill name ${JSON.stringify(entry.name)} at ${entry.path}`);
    }
    if (exactDirectories && entry.directory !== entry.name) {
      errors.push(`${label}: directory ${entry.directory} does not match logical name ${entry.name}`);
    }
    const paths = names.get(entry.name) ?? [];
    paths.push(entry.path);
    names.set(entry.name, paths);
  }

  for (const [name, paths] of names) {
    if (paths.length > 1) errors.push(`${label}: duplicate ${name}: ${paths.join(", ")}`);
  }

  return entries;
}

const projectEntries = validateCatalog(projectCatalog, "project catalog");
const projectDirectories = new Set(
  fs.existsSync(projectCatalog)
    ? fs
        .readdirSync(projectCatalog, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
        .map((entry) => entry.name)
    : [],
);
for (const name of expectedProjectSkills) {
  if (!projectDirectories.has(name)) {
    errors.push(`project catalog: missing ${name}`);
  } else if (!fs.existsSync(path.join(projectCatalog, name, "SKILL.md"))) {
    errors.push(`project catalog: missing top-level SKILL.md for ${name}`);
  }
}
for (const name of projectDirectories) {
  if (!expectedProjectSkills.has(name)) errors.push(`project catalog: unexpected shared skill ${name}`);
}
const projectSkillFiles = validateProjectSkillFiles();
validateMarkdownLinks();
validateProjectSkillMetadata();

if (fs.existsSync(path.join(projectRoot, "skills-lock.json"))) {
  errors.push("project catalog: skills-lock.json must not exist; shared skills are globally managed");
}

for (const root of projectEmptyRoots) {
  if (skillEntries(root).length > 0) errors.push(`project mirror is not empty: ${root}`);
}

let projectLinks = 0;
for (const root of projectLinkRoots) {
  const entries = validateCatalog(root, `project compatibility ${root}`);
  const directories = new Set(entries.map((entry) => entry.directory));
  for (const name of expectedProjectSkills) {
    const linkPath = path.join(root, name);
    const targetPath = path.join(projectCatalog, name);
    if (!directories.has(name)) {
      errors.push(`project compatibility ${root}: missing ${name}`);
    } else if (!fs.lstatSync(linkPath).isSymbolicLink()) {
      errors.push(`project compatibility path must be a symlink: ${linkPath}`);
    } else if (fs.realpathSync(linkPath) !== fs.realpathSync(targetPath)) {
      errors.push(`project compatibility link targets the wrong skill: ${linkPath}`);
    } else {
      projectLinks += 1;
    }
  }
  for (const name of directories) {
    if (!expectedProjectSkills.has(name)) {
      errors.push(`project compatibility ${root}: unexpected shared skill ${name}`);
    }
  }
}

const globalEntries = validateCatalog(globalCatalog, "global catalog");
const globalNames = new Set(globalEntries.map((entry) => entry.name));
for (const name of expectedManualGlobalSkills) {
  if (!globalNames.has(name)) errors.push(`global catalog: missing manually managed skill ${name}`);
}
let globalLinks = 0;
const physicalCompatibilityNames = new Map();

for (const { duplicateMode, root } of globalCompatibilityRoots) {
  for (const entry of skillEntries(root)) {
    if (!fs.lstatSync(entry.path).isSymbolicLink()) {
      const paths = physicalCompatibilityNames.get(entry.name) ?? [];
      paths.push(entry.path);
      physicalCompatibilityNames.set(entry.name, paths);
    }
    if (!globalNames.has(entry.name)) continue;
    if (duplicateMode === "remove") {
      errors.push(`global duplicate ${entry.name}: ${entry.path}`);
      continue;
    }
    const expectedTarget = path.join(globalCatalog, entry.name);
    if (!fs.lstatSync(entry.path).isSymbolicLink()) {
      errors.push(`global compatibility path must be a symlink: ${entry.path}`);
    } else if (fs.realpathSync(entry.path) !== fs.realpathSync(expectedTarget)) {
      errors.push(`global compatibility link targets the wrong skill: ${entry.path}`);
    } else {
      globalLinks += 1;
    }
  }
}

let hostPluginDuplicateGroups = 0;
for (const [name, paths] of physicalCompatibilityNames) {
  if (paths.length < 2) continue;
  if (isHostPluginSkill(name)) {
    hostPluginDuplicateGroups += 1;
  } else {
    errors.push(`unmanaged cross-root duplicate ${name}: ${paths.join(", ")}`);
  }
}

const lockPath = path.join(homeRoot, ".agents", ".skill-lock.json");
if (!fs.existsSync(lockPath)) {
  errors.push(`global catalog: missing ${lockPath}`);
} else {
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  if (lock.version !== 3) errors.push(`global catalog: expected lock version 3, received ${lock.version}`);
  for (const name of Object.keys(lock.skills ?? {})) {
    if (!fs.existsSync(path.join(globalCatalog, name, "SKILL.md"))) {
      errors.push(`global catalog: lock entry ${name} is missing its canonical directory`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(
  [
    "Skill catalog valid.",
    `project=${projectEntries.length}`,
    `project_skill_files=${projectSkillFiles.length}`,
    `project_links=${projectLinks}`,
    `global=${globalEntries.length}`,
    `global_links=${globalLinks}`,
    `host_plugin_duplicate_groups=${hostPluginDuplicateGroups}`,
    `compatibility_roots=${globalCompatibilityRoots.length}`,
  ].join(" "),
);
