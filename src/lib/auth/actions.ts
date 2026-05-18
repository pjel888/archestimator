"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeNextPath(value: FormDataEntryValue | string | null) {
  const raw = typeof value === "string" ? value : "/workshop/projects";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/workshop/projects";
  return raw;
}

async function getRequestOrigin() {
  const headersList = await headers();
  return headersList.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = sanitizeNextPath(formData.get("next"));

  if (!email) {
    redirect(`/login?error=${encodeURIComponent("Email is required")}&next=${encodeURIComponent(next)}`);
  }

  const origin = await getRequestOrigin();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }

  redirect(`/login?sent=1&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
}

export async function signInWithGoogle(formData: FormData) {
  const next = sanitizeNextPath(formData.get("next"));
  const origin = await getRequestOrigin();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Google sign-in could not start")}&next=${encodeURIComponent(next)}`);
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
