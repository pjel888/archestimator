export type UploadStorageProvider = {
  uploadObject: (input: {
    bucket: string;
    path: string;
    body: Buffer | Uint8Array;
    contentType: string;
    cacheControl?: string;
  }) => Promise<void>;
  removeObjects: (bucket: string, paths: string[]) => Promise<void>;
  downloadObject: (bucket: string, path: string) => Promise<{
    body: ArrayBuffer;
    contentType: string | null;
    sizeBytes: number;
    etag?: string | null;
    checksumSha256?: string | null;
  }>;
  downloadObjectRange?: (
    bucket: string,
    path: string,
    range: { offset: number; length: number },
  ) => Promise<{
    body: ArrayBuffer;
    contentType: string | null;
    offset: number;
    length: number;
    totalSizeBytes: number;
    etag?: string | null;
    checksumSha256?: string | null;
  }>;
  headObject?: (bucket: string, path: string) => Promise<{
    contentType: string | null;
    sizeBytes: number;
    etag?: string | null;
    checksumSha256?: string | null;
  }>;
  createSignedReadUrl: (bucket: string, path: string, expiresInSeconds: number) => Promise<string>;
  getPublicUrl: (bucket: string, path: string) => string;
};
