import { TextDecoder } from "node:util";

import type { UploadScannerProvider } from "./scan-job";

const POLICY_SCANNER_PROVIDER = "archestimator-policy-scanner";
const POLICY_SCANNER_VERSION = "policy-v1";
const EICAR_SIGNATURE = "EICAR-STANDARD-ANTIVIRUS-TEST-FILE";
const ASCII_DECODER = new TextDecoder("utf-8", { fatal: false });

const SUPPORTED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const SUPPORTED_EXTENSIONS = [".pdf", ".xls", ".xlsx"];

function normalizeContentType(contentType: string) {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

function normalizeFileName(fileName: string) {
  return fileName.trim().toLowerCase();
}

function isMacroEnabledAttachment(contentType: string, fileName: string) {
  return contentType.includes("macroenabled") || fileName.endsWith(".xlsm");
}

function isSupportedAttachment(contentType: string, fileName: string) {
  return SUPPORTED_CONTENT_TYPES.has(contentType)
    || SUPPORTED_EXTENSIONS.some((extension) => fileName.endsWith(extension));
}

function containsEicarSignature(bytes: Uint8Array) {
  return ASCII_DECODER.decode(bytes).includes(EICAR_SIGNATURE);
}

export function createUploadPolicyScannerProvider(): UploadScannerProvider {
  return {
    async scan(input) {
      const contentType = normalizeContentType(input.contentType);
      const fileName = normalizeFileName(input.fileName);

      if (input.bytes.byteLength === 0) {
        return {
          outcome: "failed_permanent",
          provider: POLICY_SCANNER_PROVIDER,
          reason: "empty_file",
          result: { scannerVersion: POLICY_SCANNER_VERSION, reason: "empty_file" },
        };
      }

      if (isMacroEnabledAttachment(contentType, fileName)) {
        return {
          outcome: "unsupported",
          provider: POLICY_SCANNER_PROVIDER,
          reason: "active_content_unsupported",
          result: { scannerVersion: POLICY_SCANNER_VERSION, reason: "active_content_unsupported" },
        };
      }

      if (!isSupportedAttachment(contentType, fileName)) {
        return {
          outcome: "unsupported",
          provider: POLICY_SCANNER_PROVIDER,
          reason: "unsupported_content_type",
          result: { scannerVersion: POLICY_SCANNER_VERSION, reason: "unsupported_content_type" },
        };
      }

      if (containsEicarSignature(input.bytes)) {
        return {
          outcome: "infected",
          provider: POLICY_SCANNER_PROVIDER,
          signature: "Eicar-Test-Signature",
          result: { scannerVersion: POLICY_SCANNER_VERSION, signature: "Eicar-Test-Signature" },
        };
      }

      return {
        outcome: "clean",
        provider: POLICY_SCANNER_PROVIDER,
        result: {
          scannerVersion: POLICY_SCANNER_VERSION,
          checks: ["content-type", "active-content", "eicar-signature"],
        },
      };
    },
  };
}
