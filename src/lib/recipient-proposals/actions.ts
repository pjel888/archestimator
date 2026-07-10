"use server";

import { requireCurrentUserContext } from "@/lib/auth/session";
import {
  listRecipientProposals,
  type RecipientProposalsResult,
} from "@/lib/repositories/recipient-proposals-repository";

export async function loadRecipientProposals(): Promise<RecipientProposalsResult> {
  await requireCurrentUserContext();
  return listRecipientProposals();
}
