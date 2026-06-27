import { createHash } from "node:crypto";
import { createConnection } from "node:net";

import type { UploadScannerProvider } from "./scan-job";
import type { UploadScanProviderOutcome } from "./scanning";
import { createUploadPolicyScannerProvider } from "./policy-scanner";

const CLAMD_PROVIDER = "clamd";
const DEFAULT_CLAMD_HOST = "127.0.0.1";
const DEFAULT_CLAMD_PORT = 3310;
const DEFAULT_CLAMD_TIMEOUT_MS = 5_000;
const DEFAULT_CLAMD_CHUNK_BYTES = 1024 * 1024;
const MAX_CLAMD_CHUNK_BYTES = 1024 * 1024;
const INSTREAM_COMMAND = Buffer.from("zINSTREAM\0", "utf8");
const ZERO_LENGTH_CHUNK = Buffer.alloc(4);

export type ClamdScannerOptions = {
  host?: string;
  port?: number;
  timeoutMs?: number;
  chunkBytes?: number;
};

type UploadScannerEnv = NodeJS.ProcessEnv;

function normalizePositiveInteger(value: string | number | undefined, fallback: number, max = Number.MAX_SAFE_INTEGER) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.trunc(parsed)));
}

function writeLengthPrefixedChunk(bytes: Uint8Array) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.byteLength, 0);
  return Buffer.concat([length, Buffer.from(bytes)]);
}

function clamdReplyHash(reply: string) {
  return createHash("sha256").update(reply).digest("hex");
}

function parseClamdReply(reply: string): UploadScanProviderOutcome {
  const normalized = reply.replaceAll("\0", "").trim();

  if (/:\s*OK$/i.test(normalized)) {
    return {
      outcome: "clean",
      provider: CLAMD_PROVIDER,
      result: {
        protocol: "clamd-instream",
        clamdReplySha256: clamdReplyHash(normalized),
      },
    };
  }

  const found = normalized.match(/:\s*(.+)\s+FOUND$/i);
  if (found?.[1]) {
    return {
      outcome: "infected",
      provider: CLAMD_PROVIDER,
      signature: found[1],
      result: {
        protocol: "clamd-instream",
        signature: found[1],
      },
    };
  }

  if (/INSTREAM size limit exceeded/i.test(normalized)) {
    return {
      outcome: "failed_permanent",
      provider: CLAMD_PROVIDER,
      reason: "clamd_stream_limit_exceeded",
      result: {
        protocol: "clamd-instream",
        reason: "clamd_stream_limit_exceeded",
        clamdReplySha256: clamdReplyHash(normalized),
      },
    };
  }

  return {
    outcome: "failed_transient",
    provider: CLAMD_PROVIDER,
    reason: "clamd_unexpected_reply",
    result: {
      protocol: "clamd-instream",
      reason: "clamd_unexpected_reply",
      clamdReplySha256: clamdReplyHash(normalized),
    },
  };
}

async function scanWithClamd(bytes: Uint8Array, options: Required<ClamdScannerOptions>) {
  return new Promise<string>((resolve, reject) => {
    const socket = createConnection({ host: options.host, port: options.port });
    const chunks: Buffer[] = [];
    let settled = false;

    const timeout = setTimeout(() => {
      finish(new Error("ClamD scan timed out."));
    }, options.timeoutMs);

    function finish(error: Error | null, reply?: string) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      if (error) {
        reject(error);
      } else {
        resolve(reply ?? "");
      }
    }

    socket.on("connect", () => {
      socket.write(INSTREAM_COMMAND);
      for (let offset = 0; offset < bytes.byteLength; offset += options.chunkBytes) {
        socket.write(writeLengthPrefixedChunk(bytes.subarray(offset, offset + options.chunkBytes)));
      }
      socket.write(ZERO_LENGTH_CHUNK);
    });
    socket.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    socket.on("error", (error) => {
      finish(error);
    });
    socket.on("end", () => {
      finish(null, Buffer.concat(chunks).toString("utf8"));
    });
    socket.on("close", () => {
      finish(null, Buffer.concat(chunks).toString("utf8"));
    });
  });
}

function resolveClamdOptions(options: ClamdScannerOptions = {}): Required<ClamdScannerOptions> {
  return {
    host: options.host?.trim() || DEFAULT_CLAMD_HOST,
    port: normalizePositiveInteger(options.port, DEFAULT_CLAMD_PORT, 65_535),
    timeoutMs: normalizePositiveInteger(options.timeoutMs, DEFAULT_CLAMD_TIMEOUT_MS),
    chunkBytes: normalizePositiveInteger(options.chunkBytes, DEFAULT_CLAMD_CHUNK_BYTES, MAX_CLAMD_CHUNK_BYTES),
  };
}

export function createClamdUploadScannerProvider(options: ClamdScannerOptions = {}): UploadScannerProvider {
  const resolved = resolveClamdOptions(options);

  return {
    async scan(input) {
      const reply = await scanWithClamd(input.bytes, resolved);
      return parseClamdReply(reply);
    },
  };
}

export function createConfiguredUploadScannerProvider(env: UploadScannerEnv = process.env): UploadScannerProvider {
  if (env.UPLOAD_SCAN_PROVIDER?.trim().toLowerCase() === "clamd") {
    return createClamdUploadScannerProvider({
      host: env.UPLOAD_CLAMD_HOST,
      port: normalizePositiveInteger(env.UPLOAD_CLAMD_PORT, DEFAULT_CLAMD_PORT, 65_535),
      timeoutMs: normalizePositiveInteger(env.UPLOAD_CLAMD_TIMEOUT_MS, DEFAULT_CLAMD_TIMEOUT_MS),
      chunkBytes: normalizePositiveInteger(env.UPLOAD_CLAMD_CHUNK_BYTES, DEFAULT_CLAMD_CHUNK_BYTES, MAX_CLAMD_CHUNK_BYTES),
    });
  }

  return createUploadPolicyScannerProvider();
}
