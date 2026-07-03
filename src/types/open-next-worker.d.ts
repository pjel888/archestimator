declare module "./.open-next/worker.js" {
  type ExecutionContextLike = {
    waitUntil(promise: Promise<unknown>): void;
  };

  type GeneratedOpenNextWorker = {
    fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContextLike): Promise<Response> | Response;
  };

  const worker: GeneratedOpenNextWorker;
  export default worker;

  export const BucketCachePurge: unknown;
  export const DOQueueHandler: unknown;
  export const DOShardedTagCache: unknown;
}
