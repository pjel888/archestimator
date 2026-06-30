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
  }>;
  createSignedReadUrl: (bucket: string, path: string, expiresInSeconds: number) => Promise<string>;
  getPublicUrl: (bucket: string, path: string) => string;
};

export type SupabaseStorageClient = {
  storage: {
    from: (bucket: string) => {
      upload: (path: string, body: Buffer | Uint8Array, options: {
        contentType: string;
        cacheControl?: string;
        upsert: boolean;
      }) => PromiseLike<{ error: { message?: string | null } | null }>;
      remove: (paths: string[]) => PromiseLike<{ error: { message?: string | null } | null }>;
      download: (path: string) => PromiseLike<{ data: Blob | null; error: { message?: string | null } | null }>;
      createSignedUrl: (path: string, expiresIn: number) => PromiseLike<{
        data: { signedUrl: string } | null;
        error: { message?: string | null } | null;
      }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
};

export function createSupabaseUploadStorageProvider(supabase: SupabaseStorageClient): UploadStorageProvider {
  return {
    async uploadObject({ bucket, path, body, contentType, cacheControl = "31536000" }) {
      const { error } = await supabase.storage.from(bucket).upload(path, body, {
        contentType,
        cacheControl,
        upsert: false,
      });
      if (error) throw new Error(error.message ?? "Storage upload failed.");
    },
    async removeObjects(bucket, paths) {
      if (paths.length === 0) return;
      const { error } = await supabase.storage.from(bucket).remove(paths);
      if (error) throw new Error(error.message ?? "Storage cleanup failed.");
    },
    async downloadObject(bucket, path) {
      const { data, error } = await supabase.storage.from(bucket).download(path);
      if (error || !data) throw new Error(error?.message ?? "Storage download failed.");
      const body = await data.arrayBuffer();
      return {
        body,
        contentType: data.type || null,
        sizeBytes: body.byteLength,
      };
    },
    async createSignedReadUrl(bucket, path, expiresInSeconds) {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
      if (error || !data?.signedUrl) throw new Error(error?.message ?? "Storage signed URL failed.");
      return data.signedUrl;
    },
    getPublicUrl(bucket, path) {
      return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    },
  };
}
