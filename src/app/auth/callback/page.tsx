import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AuthCallbackPage({ searchParams }: { searchParams: Promise<{ code?: string; next?: string }> }) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/workshop/projects";

  if (params.code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(params.code);
  }

  redirect(next);
}
