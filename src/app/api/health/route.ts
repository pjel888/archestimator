export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function GET() {
  return Response.json(
    {
      ok: true,
      service: "archestimator",
      timestamp: new Date().toISOString(),
    },
    { headers: noStoreHeaders }
  );
}
