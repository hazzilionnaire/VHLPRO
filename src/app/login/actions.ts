"use server";

import { redirect } from "next/navigation";

import { env } from "@/lib/env";
import { supabaseAuthClient } from "@/lib/supabase/server";

export type LoginState = { ok: boolean; message: string } | null;

function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value ?? "/admin");
  // Only same-site paths, so a crafted link can't bounce someone elsewhere.
  return next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
}

function readEmail(formData: FormData): string {
  return String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
}

/**
 * One entry point for both ways in. Passwords are the everyday route —
 * they don't depend on email getting through — with the one-time link kept
 * for anyone who hasn't set one.
 */
export async function signIn(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const intent = String(formData.get("intent") ?? "password");
  const email = readEmail(formData);
  const next = safeNext(formData.get("next"));

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const auth = await supabaseAuthClient();

  if (intent === "magic") {
    const { error } = await auth.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      // Name the project and redirect that were used. Both are already public
      // (the project URL ships in the browser bundle), and a gateway-level
      // message is impossible to place without them.
      return {
        ok: false,
        message: `${error.message} — tried ${env.supabaseUrl} with redirect ${env.siteUrl}/auth/callback`,
      };
    }

    return { ok: true, message: `Check ${email} for your sign-in link.` };
  }

  const password = String(formData.get("password") ?? "");
  if (!password) {
    return { ok: false, message: "Enter your password, or ask for a sign-in link instead." };
  }

  const { error } = await auth.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      ok: false,
      message:
        error.message === "Invalid login credentials"
          ? "That email and password don't match. If you've never set a password, use the sign-in link instead."
          : error.message,
    };
  }

  redirect(next);
}

export async function signOut() {
  const auth = await supabaseAuthClient();
  await auth.auth.signOut();
  redirect("/");
}
