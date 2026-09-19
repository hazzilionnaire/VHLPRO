import Link from "next/link";

import { SetupNotice } from "@/components/setup-notice";
import { requireRole } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/env";
import { signOut } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!supabaseConfigured()) return <SetupNotice />;

  const viewer = await requireRole(["admin", "captain"]);
  const isAdmin = viewer.role === "admin";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rink-800 pb-4">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link href="/admin" className="font-semibold">
            Games
          </Link>
          {isAdmin && (
            <>
              <Link href="/admin/players" className="text-muted transition hover:text-chalk">
                Players
              </Link>
              <Link href="/admin/people" className="text-muted transition hover:text-chalk">
                Access
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span>
            {viewer.email} · {viewer.role}
          </span>
          <form action={signOut}>
            <button type="submit" className="transition hover:text-chalk">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {children}
    </div>
  );
}
