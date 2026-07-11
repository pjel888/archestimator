declare module "*.open-next/worker.js" {
  const worker: unknown;

  export default worker;
  export const BucketCachePurge: unknown;
  export const DOQueueHandler: unknown;
  export const DOShardedTagCache: unknown;
}
