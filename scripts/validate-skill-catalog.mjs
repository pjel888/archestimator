import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const homeRoot = os.homedir();
const projectCatalog = path.join(projectRoot, ".agents", "skills");
const globalCatalog = path.join(homeRoot, ".agents", "skills");
const errors = [];

const expectedProjectSkills = new Set([
  "archestimator-plan-pack",
  "debug-issue",
  "explore-codebase",
  "gitnexus",
  "impeccable",
  "react-doctor",
  "refactor-safely",
  "review-changes",
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
const projectDirectories = new Set(projectEntries.map((entry) => entry.directory));
for (const name of expectedProjectSkills) {
  if (!projectDirectories.has(name)) errors.push(`project catalog: missing ${name}`);
}
for (const name of projectDirectories) {
  if (!expectedProjectSkills.has(name)) errors.push(`project catalog: unexpected shared skill ${name}`);
}

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
    `project_links=${projectLinks}`,
    `global=${globalEntries.length}`,
    `global_links=${globalLinks}`,
    `host_plugin_duplicate_groups=${hostPluginDuplicateGroups}`,
    `compatibility_roots=${globalCompatibilityRoots.length}`,
  ].join(" "),
);
