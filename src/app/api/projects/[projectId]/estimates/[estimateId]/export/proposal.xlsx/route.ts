import { NextResponse, type NextRequest } from "next/server";

import { buildProposalExportModel } from "@/lib/proposal-export/build-proposal-export-model";
import { createProposalWorkbookBuffer } from "@/lib/proposal-export/create-proposal-workbook";
import { getProjectEstimateTreeByEstimate } from "@/lib/repositories/workspace-repository";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProposalExportRouteContext = {
  params: Promise<{ projectId: string; estimateId: string }>;
};

function readVersionLabel(metadata: Json): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "V1";
  const record = metadata as Record<string, Json>;
  const value = record.versionNumber ?? record.version_number ?? record.version ?? record.revisionNumber ?? record.revision_number;

  if (typeof value === "number" && Number.isFinite(value)) return `V${value}`;
  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim();
    return normalized.toLocaleLowerCase("en-PH").startsWith("v") ? normalized : `V${normalized}`;
  }
  return "V1";
}

export function buildProposalWorkbookFilename(projectCodeOrName: string | null | undefined, estimateCodeOrName: string | null | undefined) {
  const safeStem = [projectCodeOrName, estimateCodeOrName]
    .map((value) =>
      (value ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean)
    .join("-");

  return `${safeStem || "estimate"}-proposal.xlsx`;
}

function createXlsxResponse(buffer: Buffer, filename: string) {
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(_request: NextRequest, context: ProposalExportRouteContext) {
  const { projectId, estimateId } = await context.params;
  const result = await getProjectEstimateTreeByEstimate(projectId, estimateId);

  if (!result.project || !result.estimate) {
    return NextResponse.json({ error: "Estimate not found." }, { status: 404 });
  }

  const model = buildProposalExportModel({
    metadata: {
      projectId: result.project.id,
      estimateId: result.estimate.id,
      projectName: result.project.name,
      projectCode: result.project.project_code,
      projectAddress: result.project.location,
      estimateName: result.estimate.name,
      estimateSheetCode: result.estimate.sheet_code,
      versionLabel: readVersionLabel(result.estimate.metadata),
      currency: result.estimate.currency_code || result.project.currency_code || "PHP",
    },
    nodes: result.tree,
  });

  const buffer = await createProposalWorkbookBuffer(model);
  const filename = buildProposalWorkbookFilename(result.project.project_code || result.project.name, result.estimate.sheet_code || result.estimate.name);

  return createXlsxResponse(buffer, filename);
}
