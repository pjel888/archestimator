import { createServer } from "node:net";
import type { AddressInfo, Server } from "node:net";

import { describe, expect, it } from "vitest";

import {
  createClamdUploadScannerProvider,
  createConfiguredUploadScannerProvider,
} from "@/lib/uploads/clamd-scanner";

const INSTREAM_COMMAND = Buffer.from("zINSTREAM\0", "utf8");

async function closeServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

async function withFakeClamd(
  reply: string,
  run: (input: { port: number; received: () => Buffer }) => Promise<void>,
) {
  const receivedChunks: Buffer[] = [];
  const server = createServer((socket) => {
    let buffer = Buffer.alloc(0);
    let commandRead = false;

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, Buffer.from(chunk)]);

      if (!commandRead) {
        if (buffer.byteLength < INSTREAM_COMMAND.byteLength) return;
        expect(buffer.subarray(0, INSTREAM_COMMAND.byteLength)).toEqual(INSTREAM_COMMAND);
        buffer = buffer.subarray(INSTREAM_COMMAND.byteLength);
        commandRead = true;
      }

      while (buffer.byteLength >= 4) {
        const chunkLength = buffer.readUInt32BE(0);
        if (chunkLength === 0) {
          socket.write(reply);
          socket.end();
          return;
        }
        if (buffer.byteLength < 4 + chunkLength) return;
        receivedChunks.push(buffer.subarray(4, 4 + chunkLength));
        buffer = buffer.subarray(4 + chunkLength);
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;

  try {
    await run({ port, received: () => Buffer.concat(receivedChunks) });
  } finally {
    await closeServer(server);
  }
}

describe("ClamD upload scanner provider", () => {
  it("streams bytes with the ClamD INSTREAM protocol and maps OK replies to clean", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7 clean file");

    await withFakeClamd("stream: OK\0", async ({ port, received }) => {
      const scanner = createClamdUploadScannerProvider({ port, timeoutMs: 500 });

      const outcome = await scanner.scan({
        assetId: "11111111-1111-4111-8111-111111111111",
        fileName: "clean.pdf",
        contentType: "application/pdf",
        sizeBytes: bytes.byteLength,
        bytes,
      });

      expect(received()).toEqual(Buffer.from(bytes));
      expect(outcome).toEqual({
        outcome: "clean",
        provider: "clamd",
        result: {
          protocol: "clamd-instream",
          clamdReplySha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      });
    });
  });

  it("maps ClamD FOUND replies to infected without object paths", async () => {
    await withFakeClamd("stream: Eicar-Test-Signature FOUND\0", async ({ port }) => {
      const scanner = createClamdUploadScannerProvider({ port, timeoutMs: 500 });

      const outcome = await scanner.scan({
        assetId: "22222222-2222-4222-8222-222222222222",
        fileName: "eicar.pdf",
        contentType: "application/pdf",
        sizeBytes: 68,
        bytes: new TextEncoder().encode("EICAR-STANDARD-ANTIVIRUS-TEST-FILE"),
      });

      expect(outcome).toEqual({
        outcome: "infected",
        provider: "clamd",
        signature: "Eicar-Test-Signature",
        result: {
          protocol: "clamd-instream",
          signature: "Eicar-Test-Signature",
        },
      });
      expect(JSON.stringify(outcome)).not.toContain("/storage/");
    });
  });

  it("maps ClamD stream-limit errors to permanent scanner failures", async () => {
    await withFakeClamd("INSTREAM size limit exceeded. ERROR\0", async ({ port }) => {
      const scanner = createClamdUploadScannerProvider({ port, timeoutMs: 500 });

      await expect(scanner.scan({
        assetId: "33333333-3333-4333-8333-333333333333",
        fileName: "large.pdf",
        contentType: "application/pdf",
        sizeBytes: 4,
        bytes: new Uint8Array([1, 2, 3, 4]),
      })).resolves.toEqual(expect.objectContaining({
        outcome: "failed_permanent",
        provider: "clamd",
        reason: "clamd_stream_limit_exceeded",
      }));
    });
  });

  it("selects ClamD only when UPLOAD_SCAN_PROVIDER asks for it", async () => {
    const fallback = createConfiguredUploadScannerProvider({});

    await expect(fallback.scan({
      assetId: "44444444-4444-4444-8444-444444444444",
      fileName: "clean.pdf",
      contentType: "application/pdf",
      sizeBytes: 8,
      bytes: new TextEncoder().encode("%PDF-1.7"),
    })).resolves.toEqual(expect.objectContaining({
      provider: "archestimator-policy-scanner",
    }));

    await withFakeClamd("stream: OK\0", async ({ port }) => {
      const scanner = createConfiguredUploadScannerProvider({
        UPLOAD_SCAN_PROVIDER: "clamd",
        UPLOAD_CLAMD_PORT: String(port),
        UPLOAD_CLAMD_TIMEOUT_MS: "500",
      });

      await expect(scanner.scan({
        assetId: "55555555-5555-4555-8555-555555555555",
        fileName: "clean.pdf",
        contentType: "application/pdf",
        sizeBytes: 8,
        bytes: new TextEncoder().encode("%PDF-1.7"),
      })).resolves.toEqual(expect.objectContaining({
        provider: "clamd",
        outcome: "clean",
      }));
    });
  });
});
