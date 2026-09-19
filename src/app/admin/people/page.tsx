import { setRole } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, EmptyState, SectionHeading } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Access" };

export default async function AdminPeoplePage() {
  const viewer = await requireRole(["admin"], "/admin/people");
  const db = supabaseAdmin();

  const [{ data: authData }, { data: profiles }] = await Promise.all([
    db.auth.admin.listUsers({ perPage: 200 }),
    db.from("profiles").select("id, role, player_id").returns<Profile[]>(),
  ]);

  const roleById = new Map((profiles ?? []).map((profile) => [profile.id, profile.role]));
  const accounts = (authData?.users ?? []).sort((a, b) =>
    (a.email ?? "").localeCompare(b.email ?? ""),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Access</h1>
        <p className="mt-1 text-sm text-muted">
          Admins run the league. Captains can enter results and stats. Everyone else just gets the
          RSVP link — no account needed.
        </p>
      </div>

      <section>
        <SectionHeading title={`Accounts · ${accounts.length}`} />
        {accounts.length > 0 ? (
          <Card className="divide-y divide-rink-800 p-0">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <span className="text-sm">
                  {account.email}
                  {account.id === viewer.userId && (
                    <span className="ml-2 text-xs text-muted">(you)</span>
                  )}
                </span>

                <ActionForm action={setRole} className="flex items-center gap-2">
                  <input type="hidden" name="userId" value={account.id} />
                  <select
                    name="role"
                    defaultValue={roleById.get(account.id) ?? "player"}
                    aria-label={`Role for ${account.email}`}
                    className="rounded-xl border border-rink-700 bg-rink-850 px-3 py-2 text-sm outline-none focus:border-ice-500"
                  >
                    <option value="player">Player</option>
                    <option value="captain">Captain</option>
                    <option value="admin">Admin</option>
                  </select>
                  <SubmitButton variant="ghost">Save</SubmitButton>
                </ActionForm>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState>
            No one has signed in yet. Ask them to sign in once, then set their role here.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
