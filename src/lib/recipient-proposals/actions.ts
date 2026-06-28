"use server";

import {
  listRecipientProposals,
  type RecipientProposalsResult,
} from "@/lib/repositories/recipient-proposals-repository";

export async function loadRecipientProposals(): Promise<RecipientProposalsResult> {
  return listRecipientProposals();
}
