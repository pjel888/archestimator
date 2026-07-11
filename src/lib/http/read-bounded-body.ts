export type BoundedBodyResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: 400 | 413 | 415; error: string };

const textDecoder = new TextDecoder();

export async function readBoundedRequestBody(request: Request, maxBytes: number): Promise<BoundedBodyResult<Uint8Array>> {
  const contentEncoding = request.headers.get("content-encoding")?.trim().toLowerCase();
  if (contentEncoding && contentEncoding !== "identity") {
    return { ok: false, status: 415, error: "Unsupported Content-Encoding." };
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > maxBytes) {
    return { ok: false, status: 413, error: "Request body is too large." };
  }

  if (!request.body) return { ok: true, value: new Uint8Array() };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { ok: false, status: 413, error: "Request body is too large." };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: "Unable to read request body." };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, value: bytes };
}

export async function readBoundedJsonBody<T>(request: Request, maxBytes: number): Promise<BoundedBodyResult<T>> {
  const body = await readBoundedRequestBody(request, maxBytes);
  if (!body.ok) return body;

  try {
    return { ok: true, value: JSON.parse(textDecoder.decode(body.value)) as T };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON request body." };
  }
}

export async function readBoundedFormData(request: Request, maxBytes: number): Promise<BoundedBodyResult<FormData>> {
  const body = await readBoundedRequestBody(request, maxBytes);
  if (!body.ok) return body;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const bytes = new Uint8Array(body.value.byteLength);
    bytes.set(body.value);
    const formData = await new Response(bytes.buffer, { headers: { "content-type": contentType } }).formData();
    return { ok: true, value: formData };
  } catch {
    return { ok: false, status: 400, error: "Invalid form request body." };
  }
}
