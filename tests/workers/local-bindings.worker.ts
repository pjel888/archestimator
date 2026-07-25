import {
  requireOpenSupportPrivacyFence,
  SupportPrivacyFenceError,
} from "@/lib/support/privacy-fence";

type Env = {
  ARCH_DB: D1Database;
};

const PRIVATE_HEADERS = {
  "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
  "content-type": "application/json",
};

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: PRIVATE_HEADERS });
}

const worker = {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const match = /^\/privacy-fences\/([^/]+)$/.exec(url.pathname);
    if (!match || request.method !== "POST") {
      return json({ error: "not_found" }, 404);
    }

    const userId = decodeURIComponent(match[1] ?? "");
    const existed = await env.ARCH_DB.prepare(
      "SELECT 1 AS present FROM support_subject_privacy_fences WHERE user_id = ?",
    )
      .bind(userId)
      .first<{ present: number }>();

    try {
      const fence = await requireOpenSupportPrivacyFence(env.ARCH_DB, userId);
      return json(
        {
          generation: fence.generation,
          privacyRequestId: fence.privacy_request_id,
          state: fence.state,
          userId: fence.user_id,
        },
        existed ? 200 : 201,
      );
    } catch (error) {
      if (error instanceof SupportPrivacyFenceError) {
        return json({ code: error.code, error: error.message }, 423);
      }
      throw error;
    }
  },
};

export default worker;
