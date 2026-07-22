import "server-only";

const TAR_BLOCK_BYTES = 512;
const TAR_END_BLOCKS = new Uint8Array(TAR_BLOCK_BYTES * 2);

export type SupportPrivacyTarEntry = {
  body: Uint8Array | ReadableStream<Uint8Array>;
  modifiedAt: Date;
  path: string;
  size: number;
};

function writeAscii(target: Uint8Array, offset: number, length: number, value: string) {
  const bytes = new TextEncoder().encode(value);
  if (bytes.byteLength > length) throw new Error("support_privacy_tar_field_too_long");
  target.set(bytes, offset);
}

function writeOctal(target: Uint8Array, offset: number, length: number, value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("support_privacy_tar_invalid_number");
  const octal = value.toString(8);
  if (octal.length > length - 1) throw new Error("support_privacy_tar_number_too_large");
  writeAscii(target, offset, length, `${octal.padStart(length - 1, "0")}\0`);
}

function tarHeader(entry: SupportPrivacyTarEntry) {
  if (!/^[\x20-\x7e]+$/u.test(entry.path) || entry.path.length > 100) {
    throw new Error("support_privacy_tar_invalid_path");
  }

  const header = new Uint8Array(TAR_BLOCK_BYTES);
  writeAscii(header, 0, 100, entry.path);
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, entry.size);
  writeOctal(header, 136, 12, Math.floor(entry.modifiedAt.getTime() / 1000));
  header.fill(0x20, 148, 156);
  header[156] = "0".charCodeAt(0);
  writeAscii(header, 257, 6, "ustar\0");
  writeAscii(header, 263, 2, "00");
  writeAscii(header, 265, 32, "archestimator");
  writeAscii(header, 297, 32, "archestimator");

  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeAscii(header, 148, 8, `${checksum.toString(8).padStart(6, "0")}\0 `);
  return header;
}

async function* streamEntryBody(entry: SupportPrivacyTarEntry) {
  if (entry.body instanceof Uint8Array) {
    if (entry.body.byteLength !== entry.size) throw new Error("support_privacy_tar_size_mismatch");
    yield entry.body;
    return;
  }

  const reader = entry.body.getReader();
  let emitted = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      emitted += value.byteLength;
      if (emitted > entry.size) throw new Error("support_privacy_tar_size_mismatch");
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
  if (emitted !== entry.size) throw new Error("support_privacy_tar_size_mismatch");
}

async function* tarChunks(entries: AsyncIterable<SupportPrivacyTarEntry>) {
  for await (const entry of entries) {
    yield tarHeader(entry);
    yield* streamEntryBody(entry);
    const remainder = entry.size % TAR_BLOCK_BYTES;
    if (remainder !== 0) yield new Uint8Array(TAR_BLOCK_BYTES - remainder);
  }
  yield TAR_END_BLOCKS;
}

export function createSupportPrivacyTarStream(entries: AsyncIterable<SupportPrivacyTarEntry>) {
  const iterator = tarChunks(entries)[Symbol.asyncIterator]();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await iterator.next();
        if (next.done) controller.close();
        else controller.enqueue(next.value);
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      await iterator.return?.();
    },
  });
}
