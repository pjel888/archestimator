"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProposalSnapshot, duplicateEstimateRevision, saveEstimateInDatabase } from "@/lib/local-data/mutations";
import { createMutableLocalRepository } from "@/lib/local-data/repository";
import type { Estimate } from "@/lib/local-data/schemas";

export async function saveEstimateAction(estimate: Estimate) {
  const repository = await createMutableLocalRepository();
  const database = await repository.getDatabase();
  await repository.saveDatabase(saveEstimateInDatabase(database, estimate));
  revalidatePath("/");
  revalidatePath(`/projects/${estimate.projectId}`);
}

export async function duplicateRevisionAction(estimateId: string) {
  const repository = await createMutableLocalRepository();
  const database = await repository.getDatabase();
  const result = duplicateEstimateRevision(database, estimateId, "Manual revision");
  await repository.saveDatabase(result.database);
  revalidatePath("/");
  revalidatePath(`/projects/${result.estimate.projectId}`);
  redirect(`/projects/${result.estimate.projectId}`);
}

export async function issueProposalSnapshotAction(estimate: Estimate) {
  const repository = await createMutableLocalRepository();
  const database = await repository.getDatabase();
  const savedDatabase = saveEstimateInDatabase(database, estimate);
  const result = createProposalSnapshot(savedDatabase, estimate.id);
  await repository.saveDatabase(result.database);
  revalidatePath("/");
  revalidatePath(`/projects/${result.snapshot.projectId}`);
}
