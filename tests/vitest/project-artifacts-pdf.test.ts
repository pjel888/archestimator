import { describe, expect, it } from "vitest";

import {
  computeProjectArtifactSha256,
  validateProjectArtifactPdf,
} from "@/lib/project-artifacts/pdf-validation";
import { ProjectArtifactError } from "@/lib/project-artifacts/service";

const encoder = new TextEncoder();

describe("project artifact PDF validation", () => {
  it("accepts PDF magic bytes and returns a stable content hash", async () => {
    const bytes = encoder.encode("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF");

    expect(validateProjectArtifactPdf(bytes, { declaredContentType: "application/pdf" })).toEqual({
      contentType: "application/pdf",
      sizeBytes: bytes.byteLength,
    });
    expect(await computeProjectArtifactSha256(bytes)).toBe(
      "45a0c9cb285de42be92202ecf987556bbed9edd6095dae9e4152cb1f477977ce",
    );
  });

  it("rejects MIME mismatches, bad magic bytes, truncation, and oversize input", () => {
    const pdf = encoder.encode("%PDF-1.7\n%%EOF");

    expect(() => validateProjectArtifactPdf(pdf, { declaredContentType: "text/html" })).toThrowError(
      new ProjectArtifactError("project_artifact_invalid_file", "Project artifact must be a PDF."),
    );
    expect(() => validateProjectArtifactPdf(encoder.encode("not a pdf"))).toThrowError(/PDF signature/);
    expect(() => validateProjectArtifactPdf(encoder.encode("%PDF-"))).toThrowError(/truncated/);
    expect(() => validateProjectArtifactPdf(pdf, { maxBytes: pdf.byteLength - 1 })).toThrowError(/too large/);
  });
});
