import type { D1Value } from "@/lib/cloudflare/d1";
import { buildCommittedMutationReceiptStatement } from "@/lib/estimates/mutation-receipts";

import type { EstimateMutationIntentContext } from "./intent-context";

export function buildGuardedReceiptStatement(input: {
  context: EstimateMutationIntentContext;
  resourceType: string;
  resourceId: string;
  result: unknown;
  timestamp: string;
  guardSql: string;
  guardValues: readonly D1Value[];
}) {
  return buildCommittedMutationReceiptStatement({
    ...input.context,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    result: input.result,
    timestamp: input.timestamp,
    guard: { sql: input.guardSql, values: input.guardValues },
  });
}
