import Link from "next/link";

import { getViewer } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/env";

const links = [
  { href: "/", label: "Home" },
  { href: "/schedule", label: "Schedule" },
  { href: "/standings", label: "Standings" },
  { href: "/stats", label: "Stats" },
] as const;

function NavLinks({ className }: { className: string }) {
  return (
    <nav className={className}>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="text-muted transition hover:text-chalk">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export async function SiteHeader() {
  const viewer = supabaseConfigured() ? await getViewer().catch(() => null) : null;

  const account = viewer ? (
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
  );

  return (
    <header className="border-b border-rink-800 bg-rink-950/80 backdrop-blur">
      <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            VHL<span className="text-ice-400">PRO</span>
          </Link>

          {/* Wide enough for one row: links between the logo and the account. */}
          <NavLinks className="hidden flex-1 items-center gap-x-5 text-sm sm:flex" />

          {account}
        </div>

        {/* On a phone the four links don't fit beside the logo, so they get a
            row of their own and spread across it rather than wrapping. */}
        <NavLinks className="mt-3 flex items-center justify-between gap-2 text-sm sm:hidden" />
      </div>
    </header>
  );
}
