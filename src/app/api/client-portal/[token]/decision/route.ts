import { clientPortalDecisionSummaryResponse, submitClientPortalDecisionResponse } from "@/lib/client-portal/public-decision-handlers";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) { return clientPortalDecisionSummaryResponse(request, (await params).token); }
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) { return submitClientPortalDecisionResponse(request, (await params).token); }
