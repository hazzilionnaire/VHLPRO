"use server";

import { redirect } from "next/navigation";

import { env } from "@/lib/env";
import { supabaseAuthClient } from "@/lib/supabase/server";

export type LoginState = { ok: boolean; message: string } | null;

/** Organizers sign in with a one-time email link — no passwords to lose. */
export async function sendMagicLink(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const next = String(formData.get("next") ?? "/admin");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const auth = await supabaseAuthClient();
  const { error } = await auth.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: `Check ${email} for your sign-in link.` };
}

export async function signOut() {
  const auth = await supabaseAuthClient();
  await auth.auth.signOut();
  redirect("/");
}
