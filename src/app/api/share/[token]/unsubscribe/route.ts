import { unsubscribeSharedLinkRecipientByToken } from "@/lib/publication/public-repository";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

function unsubscribeResponse(message: string, status = 200) {
  return new Response(message, {
    status,
    headers: {
      ...noStoreHeaders,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(request.url);
  const recipientToken =
    url.searchParams.get("recipient")?.trim() ||
    url.searchParams.get("rt")?.trim() ||
    "";

  if (!recipientToken) {
    return unsubscribeResponse("This unsubscribe link is invalid.", 400);
  }

  const recipient = await unsubscribeSharedLinkRecipientByToken(token, recipientToken);
  if (!recipient) {
    return unsubscribeResponse("This unsubscribe link is invalid or expired.", 404);
  }

  return unsubscribeResponse(`You have been unsubscribed from follow-up emails for ${recipient.recipientEmail}.`);
}
