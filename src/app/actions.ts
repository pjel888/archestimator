"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProjectWithInitialEstimate, createProposalSnapshot, duplicateEstimateRevision, saveEstimateInDatabase } from "@/lib/local-data/mutations";
import { createMutableLocalRepository } from "@/lib/local-data/repository";
import type { Estimate, ProposalTerms } from "@/lib/local-data/schemas";

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();

  if (!name || !clientName || !location) {
    throw new Error("Project name, client name, and location are required.");
  }

  const repository = await createMutableLocalRepository();
  const database = await repository.getDatabase();
  const result = createProjectWithInitialEstimate(database, { name, clientName, location });
  await repository.saveDatabase(result.database);
  revalidatePath("/");
  redirect(`/projects/${result.projectId}`);
}

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

export async function issueProposalSnapshotAction(estimate: Estimate, terms?: ProposalTerms) {
  const repository = await createMutableLocalRepository();
  const database = await repository.getDatabase();
  const savedDatabase = saveEstimateInDatabase(database, estimate);
  const result = createProposalSnapshot(savedDatabase, estimate.id, terms);
  await repository.saveDatabase(result.database);
  revalidatePath("/");
  revalidatePath(`/projects/${result.snapshot.projectId}`);
  redirect(`/proposals/${result.snapshot.id}`);
}
