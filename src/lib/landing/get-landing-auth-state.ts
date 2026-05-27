import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getLandingAuthState() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}
