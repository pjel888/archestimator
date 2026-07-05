import { describe, expect, it } from "vitest";

import { createUploadPolicyScannerProvider } from "@/lib/uploads/policy-scanner";

describe("P1.7 EICAR denial test — policy scanner", () => {
  // Scenario EICAR-1 (REQ-106): upload EICAR → blocked, scan state = infected, audit row written.
  // The policy scanner is the deterministic fallback provider; it is wired into the scan
  // pipeline alongside ClamAV. EICAR detection at the policy layer proves the gate works
  // even when ClamAV is not reachable (which is the case in Workers free tier without
  // paid add-ons).
  it("flags the EICAR standard antivirus test file as infected (EICAR-1)", async () => {
    const provider = createUploadPolicyScannerProvider();
    const eicarBytes = Buffer.from(
      "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*",
      "ascii",
    );

    const outcome = await provider.scan({
      bytes: new Uint8Array(eicarBytes),
      contentType: "application/pdf",
      fileName: "eicar-test.pdf",
    });

    expect(outcome.outcome).toBe("infected");
    expect(outcome.provider).toBe("archestimator-policy-scanner");
  });

  it("allows a clean PDF with no EICAR signature (regression)", async () => {
    const provider = createUploadPolicyScannerProvider();
    const cleanBytes = Buffer.from("%PDF-1.4 clean content", "ascii");

    const outcome = await provider.scan({
      bytes: new Uint8Array(cleanBytes),
      contentType: "application/pdf",
      fileName: "clean.pdf",
    });

    expect(outcome.outcome).toBe("clean");
  });

  it("returns unsupported for out-of-scope content types (regression)", async () => {
    const provider = createUploadPolicyScannerProvider();
    const outcome = await provider.scan({
      bytes: new Uint8Array(Buffer.from("hello world", "ascii")),
      contentType: "text/plain",
      fileName: "notes.txt",
    });

    expect(outcome.outcome).toBe("unsupported");
  });
});
