import { createServer } from "node:net";
import type { AddressInfo, Server } from "node:net";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runLiveClamdProof } from "../../scripts/prove-upload-clamd-live";

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
  replies: string[],
  run: (input: { port: number; received: () => Buffer[] }) => Promise<void>,
) {
  const receivedRequests: Buffer[] = [];
  let nextReply = 0;
  const server = createServer((socket) => {
    let buffer = Buffer.alloc(0);
    let commandRead = false;
    const receivedChunks: Buffer[] = [];

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
          receivedRequests.push(Buffer.concat(receivedChunks));
          socket.write(replies[nextReply] ?? "stream: OK\0");
          nextReply += 1;
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
    await run({ port, received: () => receivedRequests });
  } finally {
    await closeServer(server);
  }
}

describe("live ClamD proof script", () => {
  it("requires explicit live proof mode and ClamD scanner selection", () => {
    const script = readFileSync(join(process.cwd(), "scripts/prove-upload-clamd-live.ts"), "utf8");

    expect(script).toContain("#!/usr/bin/env bun");
    expect(script).toContain("ARCH_UPLOAD_CLAMD_LIVE_PROOF");
    expect(script).toContain("ARCH_UPLOAD_CLAMD_LIVE_PROOF_ENV_FILE");
    expect(script).toContain("UPLOAD_SCAN_PROVIDER");
    expect(script).toContain("live-clamd-proof-skipped");
    expect(script).toContain("live-clamd-proof-refused");
    expect(script).toContain("live-clamd-scanner-service-proof");
  });

  it("scans clean and EICAR fixtures against a live ClamD-compatible socket without raw target details", async () => {
    await withFakeClamd(["stream: OK\0", "stream: Eicar-Test-Signature FOUND\0"], async ({ port, received }) => {
      const report = await runLiveClamdProof({
        host: "127.0.0.1",
        port,
        timeoutMs: 500,
        generatedAt: "2026-06-27T00:00:00.000Z",
      });

      expect(report.passed).toBe(true);
      expect(report.failedChecks).toEqual([]);
      expect(report.samples.clean).toEqual(expect.objectContaining({
        outcome: "clean",
        provider: "clamd",
        protocol: "clamd-instream",
        clamdReplyHashPresent: true,
      }));
      expect(report.samples.eicar).toEqual(expect.objectContaining({
        outcome: "infected",
        provider: "clamd",
        signaturePresent: true,
        protocol: "clamd-instream",
      }));
      expect(received()).toHaveLength(2);
      expect(received()[0].toString("utf8")).toContain("Archestimator live ClamD clean proof");
      expect(received()[1].toString("utf8")).toContain("EICAR-STANDARD-ANTIVIRUS-TEST-FILE");
      expect(JSON.stringify(report)).not.toContain("127.0.0.1");
      expect(JSON.stringify(report)).not.toContain(String(port));
      expect(JSON.stringify(report)).not.toContain("live-clamd-clean.pdf");
      expect(JSON.stringify(report)).not.toContain("live-clamd-eicar.txt");
    });
  });

  it("fails the proof if EICAR is not detected", async () => {
    await withFakeClamd(["stream: OK\0", "stream: OK\0"], async ({ port }) => {
      const report = await runLiveClamdProof({
        host: "127.0.0.1",
        port,
        timeoutMs: 500,
      });

      expect(report.passed).toBe(false);
      expect(report.failedChecks).toContain("live-clamd-eicar-fixture-detected");
      expect(report.failedChecks).toContain("live-clamd-eicar-signature-present");
    });
  });
});
