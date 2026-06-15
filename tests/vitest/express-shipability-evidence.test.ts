import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const activePlanRoot = ".ai/03_plans/2026-06-15-Express-Components";
const archivedPlanRoot = ".ai/09_archive/2026-06-15-Express-Components";

function getPlanRoot() {
  return existsSync(join(process.cwd(), activePlanRoot)) ? activePlanRoot : archivedPlanRoot;
}

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function listSourceFiles(root: string): string[] {
  const absoluteRoot = join(process.cwd(), root);
  return readdirSync(absoluteRoot, { withFileTypes: true }).flatMap((entry) => {
    const child = join(root, entry.name);
    if (entry.isDirectory()) return listSourceFiles(child);
    return /\.(ts|tsx)$/.test(entry.name) ? [child] : [];
  });
}

describe("express components shipability evidence", () => {
  it("keeps no-realtime row-sync claims honest", () => {
    const planRoot = getPlanRoot();
    const concurrencySpec = read(`${planRoot}/11-concurrency-and-permissions-spec.md`);
    const implementationPlan = read(`${planRoot}/04-implementation-plan.md`);
    const sourceFiles = ["src/hooks", "src/components", "src/lib"].flatMap(listSourceFiles);

    expect(concurrencySpec).toContain("peers do not receive row data through realtime today");
    expect(implementationPlan).toContain("row data is not realtime-synced today");
    expect(read(`${planRoot}/IMPLEMENTATION_GOAL.md`)).toContain("Do not claim realtime row sync exists unless");
    const combined = sourceFiles.map((file) => read(file)).join("\n");
    expect(combined).not.toContain("postgres_changes");
    expect(combined).not.toContain("estimate_row_items').on(");
    expect(combined).not.toContain('estimate_row_items").on(');
  });

  it("records provider migrations, browser auth gating, and UltraQA evidence", () => {
    const planRoot = getPlanRoot();
    const liveSupabase = read(`${planRoot}/evidence/live-supabase-evidence.md`);
    const ultraqa = read(`${planRoot}/evidence/ultraqa-report.md`);
    const browserJsonPath = join(process.cwd(), `${planRoot}/evidence/browser/2026-06-15-express-components-auth-gate.json`);

    expect(liveSupabase).toContain("20260615093524");
    expect(liveSupabase).toContain("20260615093648");
    expect(liveSupabase).toContain("Promotion rollback probe");
    expect(liveSupabase).toContain("source_snapshot.sourceType = promoted_express_component");
    expect(liveSupabase).toContain("estimate_row_items` rows with provider-proof material names: `0`");
    expect(liveSupabase).toContain("cost_library_items` with provider-proof names: `0`");
    expect(existsSync(browserJsonPath)).toBe(true);

    const browserProof = JSON.parse(readFileSync(browserJsonPath, "utf8")) as { finalUrl?: string; heading?: string; emailVisible?: boolean };
    expect(browserProof.finalUrl).toContain("/login?next=");
    expect(browserProof.heading).toBe("Sign in to Archestimator");
    expect(browserProof.emailVisible).toBe(true);

    for (const topic of [
      "viewer bypass",
      "replace/move clobber",
      "copy rekey collision",
      "no-realtime peer visibility",
      "stale revision recovery",
      "flag-off persisted render",
      "source-less renamed-row projection leak",
      "300-500 row virtualization stress",
    ]) {
      expect(ultraqa).toContain(topic);
    }
    expect(ultraqa).toContain("Do not claim authenticated desktop/mobile/browser editing proof");
  });
});
