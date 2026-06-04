import { describe, expect, it } from "vitest";

import {
  checkResendReadiness,
  extractVercelEnvNames,
  parseDotenvPresence,
  readLocalRuntimeEnvPresence,
} from "@/../scripts/check-resend-readiness";

describe("Resend readiness checker", () => {
  it("parses dotenv presence without exposing values", () => {
    const present = parseDotenvPresence(`
      ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=true
      RESEND_API_KEY=re_secret
      RESEND_FROM="Archestimator <support@archestimator.com>"
      RESEND_REPLY_TO=
      # RESEND_WEBHOOK_SECRET=commented-out
    `);

    expect(Array.from(present).sort()).toEqual([
      "ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED",
      "RESEND_API_KEY",
      "RESEND_FROM",
    ]);
  });

  it("extracts Resend env names from sanitized Vercel transcripts", () => {
    expect(extractVercelEnvNames("ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED Production\nRESEND_API_KEY Production\nRESEND_FROM Preview\nNo secret values")).toEqual([
      "ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED",
      "RESEND_API_KEY",
      "RESEND_FROM",
    ]);
  });

  it("fails closed when local or Vercel env proof is missing", () => {
    const result = checkResendReadiness({
      localRuntimeEnv: {
        source: "test",
        required: [
          "ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED",
          "RESEND_API_KEY",
          "RESEND_FROM",
          "RESEND_REPLY_TO",
          "RESEND_WEBHOOK_SECRET",
        ],
        present: ["RESEND_API_KEY"],
        missing: [
          "ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED",
          "RESEND_FROM",
          "RESEND_REPLY_TO",
          "RESEND_WEBHOOK_SECRET",
        ],
        ready: false,
      },
      vercelEnvText: "No Environment Variables found",
      vercelEnvSource: "test-transcript",
    });

    expect(result.resendReady).toBe(false);
    expect(result.localRuntimeEnv.missing).toContain("ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED");
    expect(result.localRuntimeEnv.missing).toContain("RESEND_FROM");
    expect(result.vercelEnv.checked).toBe(true);
    expect(result.vercelEnv.missing).toContain("RESEND_WEBHOOK_SECRET");
    expect(result.note).toContain("does not prove sender/domain verification");
  });

  it("passes only when local runtime and Vercel env-name proof both include all Resend names", () => {
    const required = [
      "ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED",
      "RESEND_API_KEY",
      "RESEND_FROM",
      "RESEND_REPLY_TO",
      "RESEND_WEBHOOK_SECRET",
    ];
    const result = checkResendReadiness({
      localRuntimeEnv: {
        source: "test",
        required,
        present: required,
        missing: [],
        ready: true,
      },
      vercelEnvText: required.join("\n"),
      vercelEnvSource: "test-transcript",
    });

    expect(result.resendReady).toBe(true);
    expect(result.vercelEnv.ready).toBe(true);
    expect(JSON.stringify(result)).not.toContain("re_secret");
  });

  it("reads process env and dotenv presence without returning secret values", () => {
    const result = readLocalRuntimeEnvPresence({
      env: { RESEND_API_KEY: "re_secret" } as NodeJS.ProcessEnv,
      envFile: "",
    });

    expect(result.present).toEqual(["RESEND_API_KEY"]);
    expect(JSON.stringify(result)).not.toContain("re_secret");
  });
});
