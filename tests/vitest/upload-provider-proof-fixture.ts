import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe } from "vitest";

export const UPLOAD_PROVIDER_EVIDENCE_ROOT = ".ai/03_plans/2026-06-26-File-Upload-Audit-And-Improvement/evidence";

export function optionalUploadProviderProof<T>(fileName: string) {
  const evidencePath = join(process.cwd(), UPLOAD_PROVIDER_EVIDENCE_ROOT, fileName);
  if (!existsSync(evidencePath)) {
    return {
      describeProof: describe.skip,
      evidencePath,
      missingReason: `Optional legacy upload provider proof artifact is absent: ${UPLOAD_PROVIDER_EVIDENCE_ROOT}/${fileName}`,
      proof: {} as T,
    };
  }

  return {
    describeProof: describe,
    evidencePath,
    missingReason: null,
    proof: JSON.parse(readFileSync(evidencePath, "utf8")) as T,
  };
}
