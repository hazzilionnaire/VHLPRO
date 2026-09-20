import Link from "next/link";

import { DatabaseError } from "@/components/database-error";
import { Card } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/env";
import { describeDatabaseFailure } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "No access" };

export default async function NoAccessPage() {
  const viewer = supabaseConfigured() ? await getViewer().catch(() => null) : null;

  // A role that can't be read looks exactly like a role that isn't there, and
  // landing here is the first place most people notice something is wrong.
  const failure = supabaseConfigured() ? await describeDatabaseFailure() : null;

  return (
    <div className="mx-auto max-w-md space-y-6 pt-6">
      <h1 className="text-2xl font-bold tracking-tight">Not your rink</h1>
      {failure && <DatabaseError message={failure} />}
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
