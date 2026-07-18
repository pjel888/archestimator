import { checkSharedLinkUnsubscribeRateLimit } from "@/lib/publication/public-rate-limits";
import { unsubscribeSharedLinkRecipientByToken } from "@/lib/publication/public-repository";
import {
  assertSameOriginPublicFormPost,
  createPublicFormCsrfToken,
} from "@/lib/publication/security";
import { readBoundedFormData } from "@/lib/http/read-bounded-body";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

function textResponse(message: string, status = 200) {
  return new Response(message, {
    status,
    headers: {
      ...noStoreHeaders,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function htmlResponse(html: string, status = 200, headers: Record<string, string> = {}) {
  return new Response(html, {
    status,
    headers: {
      ...noStoreHeaders,
      "Content-Type": "text/html; charset=utf-8",
      ...headers,
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readRecipientToken(source: FormData | URLSearchParams) {
  return (
    source.get("recipient")?.toString().trim() ||
    source.get("rt")?.toString().trim() ||
    ""
  );
}

// SEC-14: GET is read-only — it renders a confirmation interstitial whose form POSTs the
// actual unsubscribe. So an email-client link prefetch / security scanner (which issues a GET)
// can never silently unsubscribe a recipient; the mutation requires an explicit same-origin POST.
function createCsrfCookie(value: string) {
  const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `ae_publication_csrf=${value}; Path=/; SameSite=Lax; Max-Age=600${secureCookie}`;
}

function unsubscribeInterstitial(token: string, recipientToken: string, csrfToken: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Unsubscribe from proposal emails</title></head><body style="margin:0;background:#fff;color:#3D3D3D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.5"><main style="max-width:32rem;margin:0 auto;padding:2.5rem 1.5rem"><h1 style="font-weight:500;margin:0 0 .5rem">Unsubscribe from follow-up emails</h1><p style="margin:0 0 1.25rem;color:#5d5d5d">Stop receiving follow-up emails about this shared proposal. You can still open the link you already have at any time.</p><form method="post" action="/api/share/${escapeHtml(token)}/unsubscribe"><input type="hidden" name="recipient" value="${escapeHtml(recipientToken)}"><input type="hidden" name="csrf" value="${escapeHtml(csrfToken)}"><button type="submit" style="border:1px solid #3D3D3D;background:#3D3D3D;color:#fff;padding:.5rem 1rem;cursor:pointer">Confirm unsubscribe</button></form></main></body></html>`;
}

// react-doctor-disable-next-line react-doctor/nextjs-no-side-effect-in-get-handler -- Email links must open by GET; this only renders a confirmation form and the unsubscribe mutation remains POST-only.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const recipientToken = readRecipientToken(new URL(request.url).searchParams);

  if (!recipientToken) {
    return textResponse("This unsubscribe link is invalid.", 400);
  }

  // Read-only: never mutate on GET.
  const csrfToken = createPublicFormCsrfToken();
  return htmlResponse(unsubscribeInterstitial(token, recipientToken, csrfToken), 200, {
    "Set-Cookie": createCsrfCookie(csrfToken),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let recipientToken = "";
  let csrfToken = "";
  const parsedFormData = await readBoundedFormData(request, 1024);
  if (!parsedFormData.ok) {
    return textResponse(parsedFormData.error, parsedFormData.status);
  }
  recipientToken = readRecipientToken(parsedFormData.value);
  csrfToken = parsedFormData.value.get("csrf")?.toString().trim() || "";

  const origin = assertSameOriginPublicFormPost(request, csrfToken);
  if (!origin.ok) {
    return textResponse(origin.message, origin.status);
  }

  if (!recipientToken) {
    recipientToken = readRecipientToken(new URL(request.url).searchParams);
  }
  if (!recipientToken) {
    return textResponse("This unsubscribe link is invalid.", 400);
  }

  const rateLimit = await checkSharedLinkUnsubscribeRateLimit({ token, recipientToken, request });
  if (!rateLimit.allowed) {
    return new Response(rateLimit.message, {
      status: 429,
      headers: {
        ...noStoreHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Retry-After": String(rateLimit.retryAfter),
      },
    });
  }

  const recipient = await unsubscribeSharedLinkRecipientByToken(token, recipientToken);
  if (!recipient) {
    return textResponse("This unsubscribe link is invalid or expired.", 404);
  }

  return textResponse(`You have been unsubscribed from follow-up emails for ${recipient.recipientEmail}.`);
}
