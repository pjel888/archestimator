import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const homeRoot = os.homedir();
const projectCatalog = path.join(projectRoot, ".agents", "skills");
const globalCatalog = path.join(homeRoot, ".agents", "skills");

const projectSkills = new Set([
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

const manuallyCanonicalSkills = new Set(["ian-xiaohei-illustrations"]);

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

function removePath(targetPath) {
  fs.rmSync(targetPath, { force: true, recursive: true });
}

function isCorrectLink(linkPath, targetPath) {
  try {
    return (
      fs.lstatSync(linkPath).isSymbolicLink() &&
      fs.realpathSync(linkPath) === fs.realpathSync(targetPath)
    );
  } catch {
    return false;
  }
}

function linkToCanonical(linkPath, targetPath) {
  if (isCorrectLink(linkPath, targetPath)) return false;

  removePath(linkPath);
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  fs.symlinkSync(path.relative(path.dirname(linkPath), targetPath), linkPath, "dir");
  return true;
}

function removeInternalAliases(root) {
  let removed = 0;
  const groups = new Map();

  for (const entry of skillEntries(root)) {
    const group = groups.get(entry.name) ?? [];
    group.push(entry);
    groups.set(entry.name, group);
  }

  for (const [name, entries] of groups) {
    if (entries.length < 2) continue;
    const canonical = entries.find((entry) => entry.directory === name) ?? entries.sort((a, b) => a.directory.localeCompare(b.directory))[0];
    for (const entry of entries) {
      if (entry.path === canonical.path) continue;
      removePath(entry.path);
      removed += 1;
    }
  }

  return removed;
}

function reconcileProjectLinks() {
  let removed = 0;
  let linked = 0;

  for (const root of projectEmptyRoots) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root)) {
      removePath(path.join(root, entry));
      removed += 1;
    }
  }

  for (const root of projectLinkRoots) {
    fs.mkdirSync(root, { recursive: true });
    for (const entry of fs.readdirSync(root)) {
      if (projectSkills.has(entry)) continue;
      removePath(path.join(root, entry));
      removed += 1;
    }
    for (const name of projectSkills) {
      if (linkToCanonical(path.join(root, name), path.join(projectCatalog, name))) linked += 1;
    }
  }

  return { linked, removed };
}

function trimProjectCatalog() {
  let removed = 0;

  for (const entry of fs.readdirSync(projectCatalog, { withFileTypes: true })) {
    if (projectSkills.has(entry.name)) continue;
    removePath(path.join(projectCatalog, entry.name));
    removed += 1;
  }

  return removed;
}

function migrateManualCanonicalSkills() {
  let migrated = 0;

  for (const name of manuallyCanonicalSkills) {
    const destination = path.join(globalCatalog, name);
    if (fs.existsSync(path.join(destination, "SKILL.md"))) continue;
    const source = globalCompatibilityRoots
      .flatMap(({ root }) => skillEntries(root))
      .find((entry) => entry.name === name);
    if (!source) continue;
    fs.cpSync(source.path, destination, { recursive: true });
    migrated += 1;
  }

  return migrated;
}

function promoteKimiWebbridge() {
  const candidatePaths = [
    path.join(homeRoot, ".kimi-code", "skills", "kimi-webbridge"),
    path.join(homeRoot, ".claude", "skills", "kimi-webbridge"),
    path.join(homeRoot, ".codex", "skills", "kimi-webbridge"),
  ];
  const source = candidatePaths.find((candidatePath) => {
    if (!fs.existsSync(path.join(candidatePath, "SKILL.md"))) return false;
    if (fs.lstatSync(candidatePath).isSymbolicLink()) return false;
    const skill = fs.readFileSync(path.join(candidatePath, "SKILL.md"), "utf8");
    return /^\s+version:\s*["']?\d+/m.test(skill);
  });
  if (!source) return 0;

  const destination = path.join(globalCatalog, "kimi-webbridge");
  const staged = `${destination}.staged`;
  removePath(staged);
  fs.cpSync(source, staged, { recursive: true });
  removePath(destination);
  fs.renameSync(staged, destination);
  return 1;
}

function reconcileGlobalDuplicates() {
  const globalNames = new Set(skillEntries(globalCatalog).map((entry) => entry.name));
  let removed = 0;
  let linked = 0;

  for (const { duplicateMode, root } of globalCompatibilityRoots) {
    for (const entry of skillEntries(root)) {
      if (!globalNames.has(entry.name)) continue;
      if (duplicateMode === "remove") {
        removePath(entry.path);
        removed += 1;
      } else if (linkToCanonical(entry.path, path.join(globalCatalog, entry.name))) {
        linked += 1;
      }
    }
  }

  return { linked, removed };
}

fs.mkdirSync(projectCatalog, { recursive: true });
fs.mkdirSync(globalCatalog, { recursive: true });

const legacyProjectLock = path.join(projectRoot, "skills-lock.json");
const legacyProjectLockRemoved = fs.existsSync(legacyProjectLock);
removePath(legacyProjectLock);

const projectRemoved = trimProjectCatalog();
const projectLinks = reconcileProjectLinks();
const aliasesRemovedBefore = removeInternalAliases(globalCatalog);
const manuallyMigrated = migrateManualCanonicalSkills();
const promoted = promoteKimiWebbridge();
const aliasesRemovedAfter = removeInternalAliases(globalCatalog);
const globalDuplicates = reconcileGlobalDuplicates();

console.log(
  [
    "Skill catalog consolidated.",
    `legacy_project_lock_removed=${Number(legacyProjectLockRemoved)}`,
    `project_skills=${skillEntries(projectCatalog).length}`,
    `project_removed=${projectRemoved}`,
    `project_mirrors_removed=${projectLinks.removed}`,
    `project_links_created=${projectLinks.linked}`,
    `global_skills=${skillEntries(globalCatalog).length}`,
    `global_aliases_removed=${aliasesRemovedBefore + aliasesRemovedAfter}`,
    `manual_migrations=${manuallyMigrated}`,
    `kimi_promoted=${promoted}`,
    `global_duplicates_removed=${globalDuplicates.removed}`,
    `global_links_created=${globalDuplicates.linked}`,
  ].join(" "),
);
