import "server-only";

import { redirect } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseAuthClient } from "@/lib/supabase/server";
import type { AppRole, Profile } from "@/lib/types";

export type Viewer = {
  userId: string;
  email: string | null;
  role: AppRole;
  playerId: string | null;
};

/** The signed-in user and their role, or null when nobody is signed in. */
export async function getViewer(): Promise<Viewer | null> {
  const auth = await supabaseAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) return null;

  const { data } = await supabaseAdmin()
    .from("profiles")
    .select("id, role, player_id")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return {
    userId: user.id,
    email: user.email ?? null,
    role: data?.role ?? "player",
    playerId: data?.player_id ?? null,
  };
}

/** Admins run the league; captains report what happened on the ice. */
export function canReportResults(role: AppRole): boolean {
  return role === "admin" || role === "captain";
}

export function canManageLeague(role: AppRole): boolean {
  return role === "admin";
}

/**
 * Gate a page or action. Sends anyone without an account to the login page and
 * anyone with the wrong role to the admin landing page, which explains itself.
 */
export async function requireRole(roles: AppRole[], returnTo = "/admin"): Promise<Viewer> {
  const viewer = await getViewer();

  if (!viewer) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  if (!roles.includes(viewer.role)) {
    redirect("/no-access");
  }
  return viewer;
}
