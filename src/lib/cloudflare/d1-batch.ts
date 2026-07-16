import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
} from "./d1";

export async function runRequiredD1Batch(
  db: D1DatabaseLike,
  statements: D1PreparedStatementLike[],
  errorMessage: string,
): Promise<D1Result[]> {
  if (!db.batch) throw new Error("Cloudflare D1 batch support is required.");
  const results = await db.batch(statements);
  if (results.some((result) => result.success === false)) {
    throw new Error(errorMessage);
  }
  return results;
}
