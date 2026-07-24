import {
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import {
  dirname,
  extname,
  join,
  relative,
  resolve,
} from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const sourceRoot = join(repositoryRoot, "src");
const sourceExtensions = [".ts", ".tsx", ".js", ".jsx"] as const;

const publicRouteEntries = [
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/new/page.tsx",
  "src/app/about/page.tsx",
  "src/app/contact/page.tsx",
  "src/app/features/page.tsx",
  "src/app/kimi3d/page.tsx",
  "src/app/pricing/page.tsx",
  "src/app/login/page.tsx",
  "src/app/signup/page.tsx",
  "src/app/access-required/page.tsx",
  "src/app/auth/callback/route.ts",
  "src/app/invite/[token]/page.tsx",
  "src/app/share/[token]/page.tsx",
  "src/app/privacy/page.tsx",
  "src/app/security/page.tsx",
  "src/app/terms/page.tsx",
  "src/app/trust/page.tsx",
] as const;

const forbiddenOnboardingModules = new Set([
  "src/components/onboarding/AuthenticatedOnboardingHost.tsx",
  "src/components/onboarding/OnboardingClientBoundary.tsx",
  "src/components/onboarding/OnboardingTourClient.tsx",
]);

function importedSpecifiers(source: string) {
  const specifiers = new Set<string>();
  const staticPattern =
    /\b(?:import|export)\s+(?:type\s+)?(?:[\w$*{},\s]+?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicPattern = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
  for (const pattern of [staticPattern, dynamicPattern]) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) specifiers.add(match[1]);
    }
  }
  return specifiers;
}

function resolveSourceModule(fromFile: string, specifier: string) {
  const unresolved = specifier.startsWith("@/")
    ? join(sourceRoot, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(fromFile), specifier)
      : null;
  if (!unresolved) return null;
  const candidates = extname(unresolved)
    ? [unresolved]
    : [
        ...sourceExtensions.map((extension) => `${unresolved}${extension}`),
        ...sourceExtensions.map((extension) =>
          join(unresolved, `index${extension}`)
        ),
      ];
  return candidates.find((candidate) =>
    existsSync(candidate) && statSync(candidate).isFile()
  ) ?? null;
}

function collectLocalImportGraph(entries: readonly string[]) {
  const pending = entries.map((entry) => join(repositoryRoot, entry));
  const visited = new Set<string>();
  while (pending.length > 0) {
    const file = pending.pop();
    if (!file || visited.has(file)) continue;
    visited.add(file);
    const source = readFileSync(file, "utf8");
    for (const specifier of importedSpecifiers(source)) {
      const dependency = resolveSourceModule(file, specifier);
      if (dependency && !visited.has(dependency)) pending.push(dependency);
    }
  }
  return visited;
}

describe("onboarding bundle boundary", () => {
  it("keeps public, auth, and client-link routes outside authenticated onboarding", () => {
    const graph = collectLocalImportGraph(publicRouteEntries);
    const forbiddenFiles = [...graph]
      .map((file) => relative(repositoryRoot, file))
      .filter((file) => forbiddenOnboardingModules.has(file));
    const joyrideImporters = [...graph]
      .filter((file) => importedSpecifiers(readFileSync(file, "utf8")).has("react-joyride"))
      .map((file) => relative(repositoryRoot, file));

    expect(forbiddenFiles).toEqual([]);
    expect(joyrideImporters).toEqual([]);
  });

  it("keeps the authenticated host in WorkshopShell and lazy-loads the tour client", () => {
    const workshopShell = readFileSync(
      "src/components/workshop/WorkshopShell.tsx",
      "utf8",
    );
    const clientBoundary = readFileSync(
      "src/components/onboarding/OnboardingClientBoundary.tsx",
      "utf8",
    );

    expect(workshopShell).toContain(
      'import { AuthenticatedOnboardingHost } from "@/components/onboarding/AuthenticatedOnboardingHost"',
    );
    expect(workshopShell).toContain("<AuthenticatedOnboardingHost />");
    expect(clientBoundary).toContain("const DynamicOnboardingTour = dynamic");
    expect(clientBoundary).toContain('import("./OnboardingTourClient")');
    expect(clientBoundary).not.toMatch(
      /import\s+\{\s*OnboardingTourClient\s*\}\s+from\s+["']\.\/OnboardingTourClient["']/,
    );
  });
});
