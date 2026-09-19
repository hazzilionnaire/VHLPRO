import Link from "next/link";

import { Card } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "No access" };

export default async function NoAccessPage() {
  const viewer = supabaseConfigured() ? await getViewer().catch(() => null) : null;

  return (
    <div className="mx-auto max-w-md space-y-6 pt-6">
      <h1 className="text-2xl font-bold tracking-tight">Not your rink</h1>
      <Card>
        <p className="text-sm text-muted">
          {viewer
            ? `You're signed in as ${viewer.email ?? "an unknown account"}, but that account doesn't have organizer access. Ask a league admin to grant it.`
            : "You need to sign in with an organizer account to see this page."}
        </p>
        <div className="mt-4 flex gap-3 text-sm">
          <Link href="/" className="text-ice-400 hover:text-ice-500">
            Back to the league
          </Link>
        </div>
      </Card>
    </div>
  );
}
