import { describe, expect, it } from "vitest";
import {
  hasUnhandledCommandDiagnostic,
  resolveEvidenceCommand,
} from "../../../scripts/quality/evidence-command-core";

describe("hasUnhandledCommandDiagnostic", () => {
  it.each([
    "[WebServer] uncaughtException: Error: aborted",
    "unhandledRejection: Error: failed",
    "UnhandledPromiseRejectionWarning: rejected",
    "Vitest caught 2 unhandled errors during the test run.",
  ])("detects unhandled stderr diagnostics: %s", (output) => {
    expect(hasUnhandledCommandDiagnostic(output)).toBe(true);
  });

  it("does not fail ordinary warnings or handled connection resets", () => {
    expect(hasUnhandledCommandDiagnostic("Warning: image is not eager\nError: aborted ECONNRESET")).toBe(
      false,
    );
  });
});

describe("resolveEvidenceCommand", () => {
  it("preserves ordinary commands", () => {
    const environment = { EXISTING: "value" };

    expect(resolveEvidenceCommand(["bun", "test"], environment)).toEqual({
      executable: "bun",
      args: ["test"],
      environment,
      error: null,
    });
  });

  it("fails closed when no command is provided", () => {
    const environment = { EXISTING: "value" };

    expect(resolveEvidenceCommand([], environment)).toEqual({
      executable: null,
      args: [],
      environment,
      error: "A command is required after --",
    });
  });

  it("applies leading env assignments without spawning a platform env binary", () => {
    const environment = { EXISTING: "value", OVERRIDE: "old" };

    expect(
      resolveEvidenceCommand(
        ["env", "FEATURE=1", "OVERRIDE=new=value", "playwright", "test"],
        environment,
      ),
    ).toEqual({
      executable: "playwright",
      args: ["test"],
      environment: {
        EXISTING: "value",
        FEATURE: "1",
        OVERRIDE: "new=value",
      },
      error: null,
    });
    expect(environment).toEqual({ EXISTING: "value", OVERRIDE: "old" });
  });

  it("replaces Windows environment keys case-insensitively with last assignment winning", () => {
    const result = resolveEvidenceCommand(
      ["env", "feature=first", "FEATURE=second", "FeAtUrE=final", "playwright", "test"],
      { FEATURE: "base", EXISTING: "value" },
      "win32",
    );

    expect(Object.entries(result.environment)).toEqual([
      ["EXISTING", "value"],
      ["FeAtUrE", "final"],
    ]);
  });

  it("preserves case-distinct environment keys on POSIX platforms", () => {
    const result = resolveEvidenceCommand(
      ["env", "feature=new", "playwright", "test"],
      { FEATURE: "base" },
      "linux",
    );

    expect(Object.entries(result.environment)).toEqual([
      ["FEATURE", "base"],
      ["feature", "new"],
    ]);
  });

  it("stores prototype-shaped assignments as own environment properties", () => {
    const result = resolveEvidenceCommand(
      ["env", "__proto__=value", "playwright", "test"],
      {},
      "win32",
    );

    expect(Object.getPrototypeOf(result.environment)).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(result.environment, "__proto__")).toBe(true);
    expect(result.environment.__proto__).toBe("value");
  });

  it.each([
    [["env", "playwright", "test"], "env requires at least one KEY=VALUE assignment"],
    [["env", "FEATURE=1"], "env requires a command after its assignments"],
  ])("fails closed for malformed env commands", (command, error) => {
    expect(resolveEvidenceCommand(command, {})).toMatchObject({
      executable: null,
      args: [],
      error,
    });
  });
});
