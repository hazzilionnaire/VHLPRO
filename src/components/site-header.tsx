import Link from "next/link";

import { getViewer } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/env";

const links = [
  { href: "/", label: "Home" },
  { href: "/schedule", label: "Schedule" },
  { href: "/standings", label: "Standings" },
  { href: "/stats", label: "Stats" },
] as const;

export async function SiteHeader() {
  const viewer = supabaseConfigured() ? await getViewer().catch(() => null) : null;

  return (
    <header className="border-b border-rink-800 bg-rink-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          VHL<span className="text-ice-400">PRO</span>
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-muted transition hover:text-chalk">
              {link.label}
            </Link>
          ))}
        </nav>

        {viewer ? (
          <Link
            href="/admin"
            className="rounded-full border border-rink-700 px-3 py-1.5 text-xs font-medium transition hover:border-ice-500 hover:text-ice-400"
          >
            Admin
          </Link>
        ) : (
          <Link href="/login" className="text-xs text-muted transition hover:text-chalk">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
