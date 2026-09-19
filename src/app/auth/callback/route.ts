import { NextResponse, type NextRequest } from "next/server";

import { supabaseAuthClient } from "@/lib/supabase/server";

/** Where the emailed sign-in link lands. Trades the code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const target = next && next.startsWith("/") ? next : "/admin";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const auth = await supabaseAuthClient();
  const { error } = await auth.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  return NextResponse.redirect(`${origin}${target}`);
}
